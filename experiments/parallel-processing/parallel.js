/**
 * Parallel Processing with Concurrency Control
 * Experiment 5: Test parallel HEB item addition
 */

class ParallelProcessor {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  /**
   * Process items in parallel with concurrency limit
   * @param {Array} items - Items to process
   * @param {Function} processor - Async function to process each item
   * @param {Object} options - Processing options
   */
  async process(items, processor, options = {}) {
    const results = [];
    const executing = [];
    const onProgress = options.onProgress || (() => {});
    const delayBetween = options.delayBetween || 0;

    for (const [index, item] of items.entries()) {
      const promise = this.processWithDelay(processor, item, index, delayBetween)
        .then(result => {
          results[index] = { success: true, result, index };
          onProgress({ completed: results.filter(r => r).length, total: items.length, index });
          return result;
        })
        .catch(error => {
          results[index] = { success: false, error: error.message, index };
          onProgress({ completed: results.filter(r => r).length, total: items.length, index });
          throw error;
        });

      executing.push(promise);

      if (executing.length >= this.concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise || p === executing.find(ep => 
            ep.then === promise.then)), 
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  async processWithDelay(processor, item, index, delay) {
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay * index));
    }
    return await processor(item, index);
  }

  /**
   * Process with rate limiting (requests per second)
   */
  async processWithRateLimit(items, processor, requestsPerSecond) {
    const interval = 1000 / requestsPerSecond;
    const results = [];

    for (const [index, item] of items.entries()) {
      const start = Date.now();
      
      try {
        const result = await processor(item, index);
        results.push({ success: true, result, index });
      } catch (error) {
        results.push({ success: false, error: error.message, index });
      }

      // Enforce rate limit
      const elapsed = Date.now() - start;
      if (elapsed < interval) {
        await new Promise(r => setTimeout(r, interval - elapsed));
      }
    }

    return results;
  }
}

/**
 * Simulated HEB Cart Operation
 * Tests bot detection sensitivity at different concurrency levels
 */
class SimulatedHEBCart {
  constructor(options = {}) {
    this.botDetectionThreshold = options.botDetectionThreshold || 3;
    this.detectionRate = options.detectionRate || 0.2;
    this.baseTime = options.baseTime || 2000;
  }

  async addItem(item, context = {}) {
    const start = Date.now();
    
    // Simulate processing time
    await this.sleep(this.baseTime + Math.random() * 1000);

    // Bot detection logic
    if (context.concurrent >= this.botDetectionThreshold) {
      const detected = Math.random() < this.detectionRate * (context.concurrent - this.botDetectionThreshold + 1);
      if (detected) {
        throw new Error('BOT_DETECTED: Additional security check required');
      }
    }

    return {
      item: item.name,
      added: true,
      time: Date.now() - start
    };
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

/**
 * Sequential processor (current approach)
 */
class SequentialProcessor {
  async process(items, processor) {
    const results = [];
    for (const [index, item] of items.entries()) {
      try {
        const result = await processor(item, index);
        results.push({ success: true, result, index });
      } catch (error) {
        results.push({ success: false, error: error.message, index });
      }
    }
    return results;
  }
}

/**
 * Batched processor (middle ground)
 */
class BatchedProcessor {
  constructor(batchSize = 3, delayBetweenBatches = 5000) {
    this.batchSize = batchSize;
    this.delayBetweenBatches = delayBetweenBatches;
  }

  async process(items, processor) {
    const results = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        batch.map((item, idx) => 
          processor(item, i + idx)
            .then(result => ({ success: true, result, index: i + idx }))
            .catch(error => ({ success: false, error: error.message, index: i + idx }))
        )
      );
      results.push(...batchResults);
      
      if (i + this.batchSize < items.length) {
        await new Promise(r => setTimeout(r, this.delayBetweenBatches));
      }
    }
    
    return results;
  }
}

module.exports = {
  ParallelProcessor,
  SequentialProcessor,
  BatchedProcessor,
  SimulatedHEBCart
};
