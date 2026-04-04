/**
 * Unified Automation Base Class
 * All automation tasks should extend this class
 * Provides: logging, metrics, retry logic, browser management
 */

const { getPool } = require('./browser-pool');
const { record, startTimer } = require('./metrics');
const { retryWithBackoff } = require('./retry-manager');
const { logger } = require('./logger');
const config = require('./config');

class AutomationTask {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name;
    this.logger = logger.child({ task: this.name });
    this.config = config.load();
    this.browserPool = getPool(this.config.browser);
    this.site = options.site || 'default';
    
    this.stats = {
      started: null,
      completed: null,
      itemsProcessed: 0,
      itemsFailed: 0,
      retries: 0
    };
  }
  
  /**
   * Main entry point - override in subclass
   */
  async run() {
    throw new Error('Subclass must implement run()');
  }
  
  /**
   * Execute with full instrumentation
   */
  async execute() {
    this.stats.started = Date.now();
    const endTimer = startTimer(this.name);
    
    this.logger.info('Task started');
    
    try {
      await this.run();
      
      this.stats.completed = Date.now();
      const duration = this.stats.completed - this.stats.started;
      
      this.logger.info('Task completed', {
        duration,
        itemsProcessed: this.stats.itemsProcessed,
        itemsFailed: this.stats.itemsFailed
      });
      
      endTimer(true, {
        itemsProcessed: this.stats.itemsProcessed,
        itemsFailed: this.stats.itemsFailed,
        retries: this.stats.retries
      });
      
      return {
        success: true,
        duration,
        stats: this.stats
      };
      
    } catch (error) {
      this.stats.completed = Date.now();
      this.logger.error('Task failed', { error: error.message });
      
      endTimer(false, { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get browser from pool
   */
  async getBrowser() {
    this.logger.debug('Acquiring browser from pool');
    return await this.browserPool.acquire(this.site);
  }
  
  /**
   * Release browser back to pool
   */
  releaseBrowser(browser) {
    this.logger.debug('Releasing browser to pool');
    this.browserPool.release(browser);
  }
  
  /**
   * Execute operation with retry
   */
  async withRetry(fn, options = {}) {
    const opts = {
      maxAttempts: 3,
      onRetry: (attempt, max, error, delay) => {
        this.stats.retries++;
        this.logger.warn(`Retry ${attempt}/${max}`, {
          error: error.message,
          delay
        });
      },
      ...options
    };
    
    return await retryWithBackoff(fn, opts);
  }
  
  /**
   * Record item processed
   */
  recordSuccess(item) {
    this.stats.itemsProcessed++;
    this.logger.debug('Item processed', { item });
  }
  
  /**
   * Record item failure
   */
  recordFailure(item, error) {
    this.stats.itemsFailed++;
    this.logger.error('Item failed', { item, error: error.message });
  }
  
  /**
   * Process items in batches
   */
  async processBatch(items, processor, batchSize = 5) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      this.logger.info(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)}`);
      
      for (const item of batch) {
        try {
          const result = await this.withRetry(() => processor(item));
          this.recordSuccess(item);
          results.push({ success: true, item, result });
        } catch (error) {
          this.recordFailure(item, error);
          results.push({ success: false, item, error: error.message });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Get current stats
   */
  getStats() {
    return {
      ...this.stats,
      running: this.stats.completed === null,
      duration: this.stats.completed 
        ? this.stats.completed - this.stats.started 
        : Date.now() - this.stats.started
    };
  }
}

module.exports = { AutomationTask };
