/**
 * Batch Optimizer Module
 * Efficient batch processing with concurrency control and error isolation
 * 
 * @module lib/batch-optimizer
 * @version 1.0.0
 */

const EventEmitter = require('events');
const os = require('os');

// Default configuration
const DEFAULT_CONFIG = {
  concurrency: 3,
  continueOnError: true,
  retryFailed: true,
  maxRetries: 2,
  progressInterval: 1000,  // Report progress every 1 second
  adaptiveConcurrency: true,
  cpuThreshold: 70,        // Scale down if CPU > 70%
  memoryThreshold: 80      // Scale down if memory > 80%
};

/**
 * Batch Optimizer for efficient parallel processing
 */
class BatchOptimizer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      total: 0,
      completed: 0,
      successful: 0,
      failed: 0,
      retried: 0,
      startTime: null,
      endTime: null
    };
    this.abortController = new AbortController();
  }
  
  /**
   * Get current system load
   */
  getSystemLoad() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => {
      return acc + Object.values(cpu.times).reduce((a, b) => a + b, 0);
    }, 0);
    
    const cpuUsage = 100 - (100 * totalIdle / totalTick);
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      loadAverage: os.loadavg()
    };
  }
  
  /**
   * Calculate optimal concurrency based on system load
   */
  getOptimalConcurrency() {
    if (!this.config.adaptiveConcurrency) {
      return this.config.concurrency;
    }
    
    const load = this.getSystemLoad();
    let concurrency = this.config.concurrency;
    
    // Scale down if system is under pressure
    if (load.cpu > this.config.cpuThreshold) {
      concurrency = Math.max(1, Math.floor(concurrency * 0.7));
    }
    
    if (load.memory > this.config.memoryThreshold) {
      concurrency = Math.max(1, Math.floor(concurrency * 0.5));
    }
    
    return concurrency;
  }
  
  /**
   * Process items in batches with controlled concurrency
   */
  async process(items, processor, options = {}) {
    const config = { ...this.config, ...options };
    this.stats = {
      total: items.length,
      completed: 0,
      successful: 0,
      failed: 0,
      retried: 0,
      startTime: Date.now(),
      endTime: null
    };
    
    this.abortController = new AbortController();
    const results = new Array(items.length);
    const errors = new Array(items.length);
    
    this.emit('start', { total: items.length });
    
    // Progress reporting interval
    const progressTimer = setInterval(() => {
      this.emit('progress', {
        ...this.getProgress(),
        systemLoad: this.getSystemLoad()
      });
    }, config.progressInterval);
    
    try {
      // Process in chunks based on current concurrency
      for (let i = 0; i < items.length; i += config.concurrency) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          throw new Error('Batch processing aborted');
        }
        
        const currentConcurrency = this.getOptimalConcurrency();
        const chunk = items.slice(i, i + currentConcurrency);
        const chunkIndices = Array.from({ length: chunk.length }, (_, idx) => i + idx);
        
        const chunkPromises = chunk.map(async (item, idx) => {
          const itemIndex = chunkIndices[idx];
          
          try {
            const result = await this.processWithRetry(
              item, 
              processor, 
              itemIndex,
              config
            );
            
            results[itemIndex] = result;
            errors[itemIndex] = null;
            this.stats.successful++;
            
            this.emit('itemSuccess', { index: itemIndex, item });
            
          } catch (error) {
            results[itemIndex] = null;
            errors[itemIndex] = error;
            this.stats.failed++;
            
            this.emit('itemError', { index: itemIndex, item, error: error.message });
            
            if (!config.continueOnError) {
              throw error;
            }
          }
          
          this.stats.completed++;
        });
        
        await Promise.all(chunkPromises);
      }
      
    } finally {
      clearInterval(progressTimer);
      this.stats.endTime = Date.now();
    }
    
    const summary = this.getSummary(results, errors);
    this.emit('complete', summary);
    
    return summary;
  }
  
  /**
   * Process single item with retry logic
   */
  async processWithRetry(item, processor, index, config) {
    let lastError;
    
    for (let attempt = 0; attempt <= (config.retryFailed ? config.maxRetries : 0); attempt++) {
      try {
        return await processor(item, index, {
          attempt,
          signal: this.abortController.signal
        });
      } catch (error) {
        lastError = error;
        
        if (attempt < config.maxRetries) {
          this.stats.retried++;
          this.emit('retry', { index, attempt: attempt + 1, error: error.message });
          
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get current progress
   */
  getProgress() {
    const elapsed = Date.now() - this.stats.startTime;
    const rate = this.stats.completed > 0 ? elapsed / this.stats.completed : 0;
    const remaining = this.stats.total - this.stats.completed;
    const estimatedTimeRemaining = rate * remaining;
    
    return {
      total: this.stats.total,
      completed: this.stats.completed,
      successful: this.stats.successful,
      failed: this.stats.failed,
      percentComplete: ((this.stats.completed / this.stats.total) * 100).toFixed(1),
      elapsed,
      estimatedTimeRemaining,
      rate: rate > 0 ? (1000 / rate).toFixed(2) + ' items/sec' : 'calculating...'
    };
  }
  
  /**
   * Get summary of batch processing
   */
  getSummary(results, errors) {
    const duration = this.stats.endTime - this.stats.startTime;
    
    return {
      results,
      errors: errors.some(e => e !== null && e !== undefined) ? errors : null,
      stats: {
        ...this.stats,
        duration,
        averageTimePerItem: this.stats.completed > 0 ? (duration / this.stats.completed).toFixed(2) + 'ms' : 'N/A',
        successRate: this.stats.total > 0 
          ? ((this.stats.successful / this.stats.total) * 100).toFixed(2) + '%'
          : '0%'
      }
    };
  }
  
  /**
   * Abort batch processing
   */
  abort() {
    this.abortController.abort();
    this.emit('abort');
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Map with concurrency control
   */
  async map(items, mapper, options = {}) {
    const result = await this.process(items, mapper, options);
    return result.results;
  }
  
  /**
   * Filter with concurrency control
   */
  async filter(items, predicate, options = {}) {
    const result = await this.process(items, predicate, options);
    return items.filter((_, index) => result.results[index]);
  }
  
  /**
   * ForEach with concurrency control
   */
  async forEach(items, handler, options = {}) {
    await this.process(items, handler, options);
  }
}

// Create singleton instance
const defaultOptimizer = new BatchOptimizer();

module.exports = {
  BatchOptimizer,
  process: (items, processor, options) => defaultOptimizer.process(items, processor, options),
  map: (items, mapper, options) => defaultOptimizer.map(items, mapper, options),
  filter: (items, predicate, options) => defaultOptimizer.filter(items, predicate, options),
  forEach: (items, handler, options) => defaultOptimizer.forEach(items, handler, options),
  create: (config) => new BatchOptimizer(config)
};
