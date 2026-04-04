/**
 * @fileoverview Batch Processor v2 - Optimized batch processing with concurrency control
 * 
 * Features:
 * - Concurrent batch processing with configurable concurrency
 * - Progress tracking and reporting
 * - Error isolation (one failure doesn't stop batch)
 * - Rate limiting and throttling
 * - Resume capability for interrupted batches
 * 
 * @module lib/batch-processor-v2
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class BatchProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.concurrency = options.concurrency || 3;
    this.retryAttempts = options.retryAttempts || 2;
    this.retryDelay = options.retryDelay || 5000;
    this.rateLimitPerMinute = options.rateLimitPerMinute || 60;
    this.checkpointFile = options.checkpointFile || null;
    
    this.stats = {
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
    
    this.processedIds = new Set();
    this.rateLimitTokens = this.rateLimitPerMinute;
    this.lastTokenRefill = Date.now();
  }

  /**
   * Process items in batches with concurrency control
   * 
   * @param {Array} items - Items to process
   * @param {Function} processor - Async function(item, index) => result
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results and stats
   */
  async process(items, processor, options = {}) {
    this.stats.total = items.length;
    this.stats.startTime = Date.now();
    
    // Load checkpoint if exists
    if (this.checkpointFile) {
      await this.loadCheckpoint();
    }
    
    const results = [];
    const queue = items
      .map((item, index) => ({ item, index, id: this.getItemId(item, index) }))
      .filter(({ id }) => !this.processedIds.has(id));
    
    this.emit('start', { total: this.stats.total, remaining: queue.length });
    
    // Process with concurrency limit
    const running = new Set();
    let index = 0;
    
    const processNext = async () => {
      if (index >= queue.length) return;
      
      const { item, index: itemIndex, id } = queue[index++];
      
      // Rate limiting
      await this.acquireToken();
      
      const promise = this.processItem(item, itemIndex, id, processor)
        .then(result => {
          results.push({ index: itemIndex, id, success: true, result });
          this.stats.succeeded++;
          this.emit('success', { index: itemIndex, id, result });
        })
        .catch(error => {
          results.push({ index: itemIndex, id, success: false, error: error.message });
          this.stats.failed++;
          this.emit('error', { index: itemIndex, id, error });
        })
        .finally(() => {
          this.stats.processed++;
          running.delete(promise);
          this.emit('progress', { ...this.getStats() });
        });
      
      running.add(promise);
      
      if (running.size >= this.concurrency) {
        await Promise.race(running);
      }
      
      return processNext();
    };
    
    // Start workers
    const workers = Array(Math.min(this.concurrency, queue.length))
      .fill()
      .map(() => processNext());
    
    await Promise.all(workers);
    
    // Wait for remaining
    while (running.size > 0) {
      await Promise.race(running);
    }
    
    this.stats.endTime = Date.now();
    this.emit('complete', this.getStats());
    
    // Clear checkpoint
    if (this.checkpointFile) {
      await this.clearCheckpoint();
    }
    
    return {
      results: results.sort((a, b) => a.index - b.index),
      stats: this.getStats()
    };
  }

  async processItem(item, index, id, processor) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await processor(item, index);
        this.processedIds.add(id);
        await this.saveCheckpoint();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts) {
          this.emit('retry', { index, id, attempt, error });
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  async acquireToken() {
    const now = Date.now();
    const elapsed = now - this.lastTokenRefill;
    
    // Refill tokens based on elapsed time
    if (elapsed >= 60000) {
      this.rateLimitTokens = this.rateLimitPerMinute;
      this.lastTokenRefill = now;
    }
    
    if (this.rateLimitTokens <= 0) {
      const waitTime = 60000 - elapsed;
      this.emit('rateLimit', { waitTime });
      await this.delay(waitTime);
      this.rateLimitTokens = this.rateLimitPerMinute;
      this.lastTokenRefill = Date.now();
    }
    
    this.rateLimitTokens--;
  }

  getItemId(item, index) {
    if (typeof item === 'string') return item;
    if (item.id) return item.id;
    if (item.name) return item.name;
    return `item_${index}`;
  }

  async loadCheckpoint() {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf8');
      const checkpoint = JSON.parse(data);
      this.processedIds = new Set(checkpoint.processedIds || []);
      this.emit('checkpointLoaded', { processedCount: this.processedIds.size });
    } catch (error) {
      // No checkpoint exists
    }
  }

  async saveCheckpoint() {
    if (!this.checkpointFile) return;
    
    const checkpoint = {
      processedIds: Array.from(this.processedIds),
      timestamp: Date.now(),
      stats: this.stats
    };
    
    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
  }

  async clearCheckpoint() {
    if (!this.checkpointFile) return;
    
    try {
      await fs.unlink(this.checkpointFile);
    } catch (error) {
      // File doesn't exist
    }
  }

  getStats() {
    const elapsed = this.stats.endTime 
      ? this.stats.endTime - this.stats.startTime 
      : Date.now() - this.stats.startTime;
    
    const rate = this.stats.processed > 0 
      ? (this.stats.processed / (elapsed / 1000)).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      elapsed,
      rate: `${rate} items/sec`,
      percentComplete: Math.round((this.stats.processed / this.stats.total) * 100)
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Stream processor for large datasets
 */
class StreamProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.batchSize = options.batchSize || 100;
    this.processor = options.processor;
  }

  async *processStream(source) {
    let batch = [];
    let index = 0;
    
    for await (const item of source) {
      batch.push({ item, index: index++ });
      
      if (batch.length >= this.batchSize) {
        yield await this.processBatch(batch);
        batch = [];
      }
    }
    
    if (batch.length > 0) {
      yield await this.processBatch(batch);
    }
  }

  async processBatch(batch) {
    return Promise.all(
      batch.map(({ item, index }) => 
        this.processor(item, index).catch(error => ({ error, index }))
      )
    );
  }
}

module.exports = { BatchProcessor, StreamProcessor };
