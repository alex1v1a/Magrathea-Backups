/**
 * Parallel Processor
 * Execute operations with controlled concurrency
 * 
 * Features:
 * - Process arrays with configurable concurrency
 * - Rate limiting for API calls
 * - Progress tracking with callbacks
 * - Error isolation (one failure doesn't stop batch)
 * - Result aggregation
 * 
 * @module utils/parallel-processor
 */

class ParallelProcessor {
  /**
   * Create parallel processor
   * @param {Object} options
   * @param {number} options.concurrency - Max concurrent operations (default: 3)
   * @param {number} options.rateLimit - Operations per second (default: unlimited)
   * @param {number} options.retryAttempts - Retry failed items (default: 0)
   * @param {boolean} options.stopOnError - Stop entire batch on error (default: false)
   * @param {Function} options.onProgress - Progress callback
   * @param {Function} options.onItemComplete - Item completion callback
   */
  constructor(options = {}) {
    this.config = {
      concurrency: options.concurrency || 3,
      rateLimit: options.rateLimit || null,
      retryAttempts: options.retryAttempts || 0,
      stopOnError: options.stopOnError || false,
      onProgress: options.onProgress || null,
      onItemComplete: options.onItemComplete || null
    };
    
    this.metrics = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      startTime: null,
      endTime: null
    };
    
    this._rateLimitTokens = this.config.rateLimit || 0;
    this._rateLimitInterval = null;
    
    if (this.config.rateLimit) {
      this._startRateLimiter();
    }
  }

  /**
   * Start rate limiter token bucket
   * @private
   */
  _startRateLimiter() {
    this._rateLimitTokens = this.config.rateLimit;
    this._rateLimitInterval = setInterval(() => {
      this._rateLimitTokens = this.config.rateLimit;
    }, 1000);
  }

  /**
   * Wait for rate limit token
   * @private
   */
  async _waitForToken() {
    if (!this.config.rateLimit) return;
    
    while (this._rateLimitTokens <= 0) {
      await new Promise(r => setTimeout(r, 50));
    }
    this._rateLimitTokens--;
  }

  /**
   * Process array with concurrency control
   * @param {Array} items - Items to process
   * @param {Function} processor - Async function(item, index) => result
   * @returns {Promise<Array>} Results in same order as input
   */
  async process(items, processor) {
    if (!Array.isArray(items)) {
      throw new TypeError('Items must be an array');
    }
    
    this.metrics.startTime = Date.now();
    this.metrics.processed = 0;
    this.metrics.succeeded = 0;
    this.metrics.failed = 0;
    
    const results = new Array(items.length);
    const executing = new Set();
    let index = 0;
    let hasError = false;

    const processNext = async () => {
      const currentIndex = index++;
      if (currentIndex >= items.length) return;
      if (hasError && this.config.stopOnError) return;

      await this._waitForToken();
      
      const item = items[currentIndex];
      let attempts = 0;
      let result;
      let error;

      do {
        try {
          result = await processor(item, currentIndex);
          error = null;
          break;
        } catch (e) {
          error = e;
          attempts++;
          this.metrics.retried++;
          
          if (attempts <= this.config.retryAttempts) {
            await this._backoff(attempts);
          }
        }
      } while (attempts <= this.config.retryAttempts);

      // Store result
      if (error) {
        results[currentIndex] = { success: false, error, item, index: currentIndex };
        this.metrics.failed++;
        if (this.config.stopOnError) hasError = true;
      } else {
        results[currentIndex] = { success: true, result, item, index: currentIndex };
        this.metrics.succeeded++;
      }

      this.metrics.processed++;
      
      // Callbacks
      if (this.config.onItemComplete) {
        this.config.onItemComplete(results[currentIndex], currentIndex);
      }
      
      if (this.config.onProgress) {
        this.config.onProgress({
          completed: this.metrics.processed,
          total: items.length,
          succeeded: this.metrics.succeeded,
          failed: this.metrics.failed,
          percent: Math.round((this.metrics.processed / items.length) * 100)
        });
      }

      // Process next
      return processNext();
    };

    // Start initial batch
    const batch = [];
    for (let i = 0; i < Math.min(this.config.concurrency, items.length); i++) {
      batch.push(processNext());
    }

    await Promise.all(batch);
    
    this.metrics.endTime = Date.now();
    
    if (hasError && this.config.stopOnError) {
      const failedResult = results.find(r => r && !r.success);
      throw new Error(`Batch stopped on error: ${failedResult?.error?.message}`);
    }

    return results;
  }

  /**
   * Process in chunks/batches with delay between
   * @param {Array} items - Items to process
   * @param {Function} processor - Async function(item, index) => result
   * @param {Object} options - Batch options
   * @param {number} options.batchSize - Items per batch
   * @param {number} options.delayBetween - Delay between batches (ms)
   * @returns {Promise<Array>}
   */
  async processBatched(items, processor, options = {}) {
    const { batchSize = 10, delayBetween = 1000 } = options;
    const batches = this._chunk(items, batchSize);
    const allResults = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const results = await this.process(batch, processor);
      allResults.push(...results);

      if (i < batches.length - 1 && delayBetween > 0) {
        await new Promise(r => setTimeout(r, delayBetween));
      }
    }

    return allResults;
  }

  /**
   * Map with concurrency (like Promise.all but limited)
   * @param {Array} items - Items to map
   * @param {Function} mapper - Async mapper function
   * @returns {Promise<Array>}
   */
  async map(items, mapper) {
    const results = await this.process(items, mapper);
    return results.map(r => r.success ? r.result : null);
  }

  /**
   * Filter with concurrency
   * @param {Array} items - Items to filter
   * @param {Function} predicate - Async predicate function
   * @returns {Promise<Array>}
   */
  async filter(items, predicate) {
    const results = await this.process(items, async (item, idx) => ({
      item,
      keep: await predicate(item, idx)
    }));
    
    return results
      .filter(r => r.success && r.result.keep)
      .map(r => r.result.item);
  }

  /**
   * Execute with timeout race
   * @param {Array} promises - Array of promise-returning functions
   * @param {number} timeout - Timeout per operation (ms)
   * @returns {Promise<Array>}
   */
  async raceWithTimeout(promises, timeout) {
    return this.process(promises, async (fn) => {
      return Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    });
  }

  /**
   * Chunk array into batches
   * @private
   */
  _chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Exponential backoff
   * @private
   */
  async _backoff(attempt) {
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
    await new Promise(r => setTimeout(r, delay));
  }

  /**
   * Get metrics
   * @returns {Object}
   */
  getMetrics() {
    const duration = this.metrics.endTime && this.metrics.startTime
      ? this.metrics.endTime - this.metrics.startTime
      : null;
      
    return {
      ...this.metrics,
      duration,
      rate: duration ? (this.metrics.processed / (duration / 1000)).toFixed(2) : null
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this._rateLimitInterval) {
      clearInterval(this._rateLimitInterval);
    }
  }
}

// Convenience functions
async function parallelMap(items, mapper, concurrency = 3) {
  const processor = new ParallelProcessor({ concurrency });
  const result = await processor.map(items, mapper);
  processor.destroy();
  return result;
}

async function parallelFilter(items, predicate, concurrency = 3) {
  const processor = new ParallelProcessor({ concurrency });
  const result = await processor.filter(items, predicate);
  processor.destroy();
  return result;
}

async function rateLimited(items, processor, rateLimit = 10) {
  const p = new ParallelProcessor({ rateLimit });
  const result = await p.process(items, processor);
  p.destroy();
  return result;
}

module.exports = { 
  ParallelProcessor, 
  parallelMap, 
  parallelFilter, 
  rateLimited 
};
