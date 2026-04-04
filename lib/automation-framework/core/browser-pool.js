/**
 * BrowserPool - CDP Connection Management
 * 
 * Manages a pool of browser instances connected via Chrome DevTools Protocol (CDP).
 * Supports multiple browser profiles, connection health monitoring, and automatic
 * reconnection for resilient automation.
 */

const CDP = require('chrome-remote-interface');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// Default CDP ports for different browsers
const DEFAULT_PORTS = {
  edge: 9222,
  chrome: 9222,
  brave: 9222
};

/**
 * Browser instance wrapper with health monitoring
 */
class BrowserInstance {
  constructor(id, options = {}) {
    this.id = id;
    this.options = options;
    this.client = null;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isConnected = false;
    this.lastUsed = Date.now();
    this.createdAt = Date.now();
    this.connectionAttempts = 0;
    this.maxRetries = options.maxRetries || 3;
    this.target = options.target || 'chrome';
    this.port = options.port || DEFAULT_PORTS[this.target] || 9222;
    this.profileDir = options.profileDir || null;
    this.userDataDir = options.userDataDir || null;
  }

  /**
   * Connect to existing browser via CDP
   */
  async connect() {
    try {
      this.connectionAttempts++;
      
      // Use Playwright to connect to existing browser
      this.browser = await chromium.connectOverCDP(`http://localhost:${this.port}`);
      
      // Get or create context
      const contexts = this.browser.contexts();
      this.context = contexts.length > 0 ? contexts[0] : await this.browser.newContext();
      
      // Get or create page
      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
      
      this.isConnected = true;
      this.lastUsed = Date.now();
      this.connectionAttempts = 0;
      
      return true;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Launch new browser instance
   */
  async launch() {
    try {
      // Apply stealth plugin
      chromium.use(StealthPlugin());
      
      const launchOptions = {
        headless: this.options.headless !== false,
        slowMo: this.options.slowMo || 50,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          `--remote-debugging-port=${this.port}`
        ]
      };
      
      if (this.userDataDir) {
        launchOptions.userDataDir = this.userDataDir;
      }
      
      // Add executable path if specified
      if (this.options.executablePath) {
        launchOptions.executablePath = this.options.executablePath;
      }
      
      this.browser = await chromium.launch(launchOptions);
      
      // Create context with specific settings
      this.context = await this.browser.newContext({
        userAgent: this.options.userAgent || this.getRandomUserAgent(),
        viewport: this.options.viewport || { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        javaScriptEnabled: true,
        locale: 'en-US',
        timezoneId: 'America/Chicago',
        permissions: ['geolocation'],
        geolocation: { latitude: 30.2672, longitude: -97.7431 },
        colorScheme: 'light'
      });
      
      this.page = await this.context.newPage();
      this.isConnected = true;
      this.lastUsed = Date.now();
      
      return true;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Check if browser is still connected
   */
  async healthCheck() {
    try {
      if (!this.browser || !this.browser.isConnected()) {
        this.isConnected = false;
        return false;
      }
      
      // Test with a simple evaluation
      await this.page.evaluate(() => true);
      this.lastUsed = Date.now();
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Reconnect to browser
   */
  async reconnect() {
    if (this.connectionAttempts >= this.maxRetries) {
      throw new Error(`Max reconnection attempts (${this.maxRetries}) exceeded`);
    }
    
    try {
      await this.close();
      await this.connect();
      return true;
    } catch (error) {
      // Try launching fresh if connect fails
      try {
        await this.launch();
        return true;
      } catch (launchError) {
        throw launchError;
      }
    }
  }

  /**
   * Close browser connection
   */
  async close() {
    this.isConnected = false;
    
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      // Ignore close errors
    }
    
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Get instance metrics
   */
  getMetrics() {
    return {
      id: this.id,
      isConnected: this.isConnected,
      createdAt: this.createdAt,
      lastUsed: this.lastUsed,
      sessionDuration: Date.now() - this.createdAt,
      idleTime: Date.now() - this.lastUsed,
      connectionAttempts: this.connectionAttempts,
      target: this.target,
      port: this.port
    };
  }
}

/**
 * BrowserPool - Manages multiple browser instances
 */
class BrowserPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.instances = new Map();
    this.maxInstances = options.maxInstances || 5;
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes
    this.cleanupInterval = null;
    
    // Profiles directory
    this.profilesDir = options.profilesDir || path.join(process.cwd(), 'browser-profiles');
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  /**
   * Initialize the pool
   */
  async initialize() {
    this.startHealthChecks();
    this.emit('initialized');
    return true;
  }

  /**
   * Get or create a browser instance
   */
  async acquire(profileName, options = {}) {
    const instanceId = `${profileName}-${options.target || 'chrome'}`;
    
    // Return existing instance if healthy
    if (this.instances.has(instanceId)) {
      const instance = this.instances.get(instanceId);
      const isHealthy = await instance.healthCheck();
      
      if (isHealthy) {
        instance.lastUsed = Date.now();
        this.emit('instance:acquired', { instanceId, reused: true });
        return instance;
      }
      
      // Try to reconnect if unhealthy
      try {
        await instance.reconnect();
        this.emit('instance:reconnected', { instanceId });
        return instance;
      } catch (error) {
        this.emit('instance:reconnect-failed', { instanceId, error });
        await this.release(instanceId);
      }
    }
    
    // Create new instance
    if (this.instances.size >= this.maxInstances) {
      // Clean up oldest idle instance
      await this.cleanupOldest();
    }
    
    const userDataDir = path.join(this.profilesDir, profileName);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    const instance = new BrowserInstance(instanceId, {
      ...options,
      userDataDir,
      profileDir: userDataDir
    });
    
    try {
      if (options.connectToExisting) {
        await instance.connect();
      } else {
        await instance.launch();
      }
      
      this.instances.set(instanceId, instance);
      this.emit('instance:created', { instanceId });
      return instance;
      
    } catch (error) {
      this.emit('instance:create-failed', { instanceId, error });
      throw error;
    }
  }

  /**
   * Release a browser instance back to the pool
   */
  async release(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    
    try {
      await instance.close();
    } catch (error) {
      // Ignore close errors
    }
    
    this.instances.delete(instanceId);
    this.emit('instance:released', { instanceId });
    return true;
  }

  /**
   * Get instance by ID
   */
  get(instanceId) {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances
   */
  getAll() {
    return Array.from(this.instances.values());
  }

  /**
   * Get pool metrics
   */
  getMetrics() {
    return {
      totalInstances: this.instances.size,
      maxInstances: this.maxInstances,
      instances: this.getAll().map(i => i.getMetrics())
    };
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Perform health checks on all instances
   */
  async performHealthChecks() {
    for (const [id, instance] of this.instances) {
      const isHealthy = await instance.healthCheck();
      
      if (!isHealthy) {
        this.emit('instance:unhealthy', { instanceId: id });
        
        // Try to reconnect
        try {
          await instance.reconnect();
          this.emit('instance:recovered', { instanceId: id });
        } catch (error) {
          await this.release(id);
        }
      }
      
      // Check idle timeout
      const idleTime = Date.now() - instance.lastUsed;
      if (idleTime > this.idleTimeout) {
        this.emit('instance:idle-timeout', { instanceId: id, idleTime });
        await this.release(id);
      }
    }
  }

  /**
   * Clean up oldest idle instance
   */
  async cleanupOldest() {
    let oldest = null;
    let oldestTime = Infinity;
    
    for (const [id, instance] of this.instances) {
      if (instance.lastUsed < oldestTime) {
        oldestTime = instance.lastUsed;
        oldest = id;
      }
    }
    
    if (oldest) {
      await this.release(oldest);
    }
  }

  /**
   * Close all instances and cleanup
   */
  async shutdown() {
    this.stopHealthChecks();
    
    const releasePromises = Array.from(this.instances.keys()).map(id => 
      this.release(id).catch(() => {})
    );
    
    await Promise.all(releasePromises);
    this.emit('shutdown');
  }
}

// Export singleton instance
const defaultPool = new BrowserPool();

module.exports = {
  BrowserPool,
  BrowserInstance,
  defaultPool
};
