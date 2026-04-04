/**
 * Unified Automation Framework
 * 
 * Main entry point for the browser automation framework.
 * 
 * Usage:
 *   const { Framework, HEBPlugin, FacebookPlugin } = require('./lib/automation-framework');
 * 
 *   const framework = new Framework();
 *   await framework.initialize();
 * 
 *   const heb = framework.createPlugin('heb', { profile: 'heb-main' });
 *   await heb.initialize();
 *   await heb.login({ email: '...', password: '...' });
 */

const { BrowserPool, defaultPool } = require('./core/browser-pool');
const { AntiBot } = require('./core/anti-bot');
const { RetryManager } = require('./core/retry-manager');
const { JobQueue } = require('./queue/job-queue');
const { BasePlugin } = require('./plugins/base-plugin');
const { HEBPlugin } = require('./plugins/heb-plugin');
const { FacebookPlugin } = require('./plugins/facebook-plugin');

/**
 * Main Framework Class
 */
class AutomationFramework {
  constructor(options = {}) {
    this.options = {
      profilesDir: './browser-profiles',
      screenshotsDir: './screenshots',
      logsDir: './logs',
      maxConcurrentJobs: 1,
      ...options
    };
    
    // Core components
    this.browserPool = options.browserPool || defaultPool;
    this.jobQueue = new JobQueue({
      name: 'automation-queue',
      concurrency: this.options.maxConcurrentJobs,
      persistPath: './queue-state.json'
    });
    
    // Plugin registry
    this.plugins = new Map();
    this.activeSessions = new Map();
    
    // Framework state
    this.initialized = false;
    
    // Setup logging
    this.logger = options.logger || console;
  }

  /**
   * Initialize the framework
   */
  async initialize() {
    if (this.initialized) return;
    
    this.logger.info('Initializing Automation Framework...');
    
    // Initialize browser pool
    await this.browserPool.initialize();
    
    // Load persisted queue state
    this.jobQueue.load();
    
    // Register job handlers
    this.registerJobHandlers();
    
    // Start queue processing
    this.jobQueue.start();
    
    this.initialized = true;
    this.logger.info('Automation Framework initialized');
    
    return this;
  }

  /**
   * Register handlers for job queue
   */
  registerJobHandlers() {
    // Generic automation job handler
    this.jobQueue.registerHandler('automation', async (payload, job) => {
      const { pluginName, method, args = [] } = payload;
      
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }
      
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Method ${method} not found on plugin ${pluginName}`);
      }
      
      return await plugin[method](...args);
    });
    
    // HEB-specific job handler
    this.jobQueue.registerHandler('heb:cart', async (payload) => {
      const plugin = this.getOrCreatePlugin('heb', HEBPlugin);
      await plugin.initialize();
      
      const { items, credentials } = payload;
      
      if (credentials) {
        await plugin.login(credentials);
      }
      
      return await plugin.buildCart(items);
    });
    
    // Facebook-specific job handler
    this.jobQueue.registerHandler('facebook:search', async (payload) => {
      const plugin = this.getOrCreatePlugin('facebook', FacebookPlugin);
      await plugin.initialize();
      
      const { query, filters, credentials } = payload;
      
      if (credentials) {
        await plugin.login(credentials);
      }
      
      return await plugin.filteredSearch(query, filters);
    });
  }

  /**
   * Create a new plugin instance
   */
  createPlugin(type, options = {}) {
    let plugin;
    
    switch (type.toLowerCase()) {
      case 'heb':
        plugin = new HEBPlugin({
          browserPool: this.browserPool,
          logger: this.logger,
          ...options
        });
        break;
        
      case 'facebook':
        plugin = new FacebookPlugin({
          browserPool: this.browserPool,
          logger: this.logger,
          ...options
        });
        break;
        
      default:
        throw new Error(`Unknown plugin type: ${type}`);
    }
    
    this.plugins.set(options.name || type, plugin);
    
    // Forward plugin events
    plugin.on('error', (data) => this.emit('plugin:error', { plugin: type, ...data }));
    plugin.on('job:completed', (data) => this.emit('job:completed', { plugin: type, ...data }));
    
    return plugin;
  }

  /**
   * Get existing plugin or create new one
   */
  getOrCreatePlugin(name, PluginClass, options = {}) {
    if (this.plugins.has(name)) {
      return this.plugins.get(name);
    }
    
    const plugin = new PluginClass({
      name,
      browserPool: this.browserPool,
      logger: this.logger,
      ...options
    });
    
    this.plugins.set(name, plugin);
    return plugin;
  }

  /**
   * Get plugin by name
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /**
   * Queue a job for execution
   */
  queueJob(type, payload, options = {}) {
    return this.jobQueue.add({
      type,
      payload,
      priority: options.priority,
      metadata: {
        queuedBy: options.queuedBy || 'framework',
        ...options.metadata
      }
    });
  }

  /**
   * Run job immediately (not queued)
   */
  async runJob(type, payload) {
    const handler = this.jobQueue.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler for job type: ${type}`);
    }
    
    return await handler(payload, { id: 'immediate', attempts: 1 });
  }

  /**
   * Wait for job completion
   */
  async waitForJob(jobId, timeout = 60000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const job = this.jobQueue.getJob(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      if (job.status === 'completed') {
        return job.result;
      }
      
      if (job.status === 'failed') {
        throw new Error(job.error || 'Job failed');
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    throw new Error(`Timeout waiting for job ${jobId}`);
  }

  /**
   * Get framework statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      plugins: this.plugins.size,
      queue: this.jobQueue.getStats(),
      browserPool: this.browserPool.getMetrics()
    };
  }

  /**
   * Shutdown framework gracefully
   */
  async shutdown() {
    this.logger.info('Shutting down Automation Framework...');
    
    // Stop queue
    this.jobQueue.stop();
    
    // Shutdown all plugins
    for (const [name, plugin] of this.plugins) {
      try {
        await plugin.shutdown();
      } catch (error) {
        this.logger.error(`Error shutting down plugin ${name}:`, error);
      }
    }
    
    // Shutdown browser pool
    await this.browserPool.shutdown();
    
    // Save queue state
    this.jobQueue.save();
    
    this.initialized = false;
    this.logger.info('Automation Framework shutdown complete');
  }
}

// Make framework event emitter
const EventEmitter = require('events');
Object.setPrototypeOf(AutomationFramework.prototype, EventEmitter.prototype);

const { JobQueue, JobStatus, JobPriority } = require('./queue/job-queue');

module.exports = {
  // Framework
  AutomationFramework,
  Framework: AutomationFramework,
  
  // Core
  BrowserPool,
  AntiBot,
  RetryManager,
  
  // Queue
  JobQueue,
  JobStatus,
  JobPriority,
  
  // Plugins
  BasePlugin,
  HEBPlugin,
  FacebookPlugin,
  
  // Utils
  random: require('./utils/random')
};

// Also export the old names for compatibility
module.exports.HEBAutomation = HEBPlugin;
module.exports.FacebookAutomation = FacebookPlugin;
