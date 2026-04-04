/**
 * Performance Utilities Library
 * Reusable classes for optimization and reliability
 * 
 * Usage:
 *   const { Batcher, Cache, RetryStrategy, Profiler } = require('./performance-utils');
 */

// ============================================================================
// BATCHER - Parallel processing with rate limiting
// ============================================================================

class Batcher {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.delayBetween = options.delayBetween || { min: 1000, max: 2000 };
    this.parallel = options.parallel !== false;
    this.maxParallel = options.maxParallel || 3;
    this.onBatchStart = options.onBatchStart || (() => {});
    this.onBatchComplete = options.onBatchComplete || (() => {});
  }

  async process(items, processFn) {
    const results = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(items.length / this.batchSize);
      
      this.onBatchStart(batchNum, totalBatches, batch);
      
      let batchResults;
      if (this.parallel) {
        batchResults = await this._processParallel(batch, processFn);
      } else {
        batchResults = await this._processSequential(batch, processFn);
      }
      
      results.push(...batchResults);
      this.onBatchComplete(batchNum, totalBatches, batchResults);
      
      // Delay between batches (except last)
      if (i + this.batchSize < items.length) {
        const delay = this._randomDelay();
        await this._sleep(delay);
      }
    }
    
    return results;
  }

  async _processParallel(batch, processFn) {
    const executing = [];
    const results = [];
    
    for (let i = 0; i < batch.length; i++) {
      const promise = processFn(batch[i], i).then(result => {
        results[i] = result;
        return result;
      });
      
      executing.push(promise);
      
      // Limit concurrency
      if (executing.length >= this.maxParallel) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
    return results;
  }

  async _processSequential(batch, processFn) {
    const results = [];
    for (let i = 0; i < batch.length; i++) {
      results.push(await processFn(batch[i], i));
    }
    return results;
  }

  _randomDelay() {
    const { min, max } = this.delayBetween;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SIMPLE CACHE - TTL-based caching with LRU eviction
// ============================================================================

class SimpleCache {
  constructor(options = {}) {
    this.ttl = options.ttl || 5000;
    this.maxSize = options.maxSize || 100;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key, value, customTtl) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + (customTtl || this.ttl)
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// ============================================================================
// RETRY STRATEGY - Exponential backoff with circuit breaker
// ============================================================================

class RetryStrategy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.delay = options.delay || 1000;
    this.backoff = options.backoff || 'exponential'; // 'fixed', 'exponential', 'linear'
    this.retryableErrors = options.retryableErrors || [];
    this.onRetry = options.onRetry || (() => {});
    
    // Circuit breaker
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'closed'; // closed, open, half-open
  }

  async execute(fn, context = '') {
    // Check circuit breaker
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error(`Circuit breaker open for ${context}`);
      }
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        // Success - reset circuit breaker
        if (this.state === 'half-open') {
          this.state = 'closed';
          this.failures = 0;
        }
        
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this._isRetryable(error)) {
          return { success: false, error, attempts: attempt };
        }
        
        // Record failure for circuit breaker
        this.failures++;
        this.lastFailure = Date.now();
        
        if (this.failures >= this.failureThreshold) {
          this.state = 'open';
        }
        
        if (attempt < this.maxAttempts) {
          const delay = this._calculateDelay(attempt);
          this.onRetry(attempt, this.maxAttempts, error, delay, context);
          await this._sleep(delay);
        }
      }
    }
    
    return { success: false, error: lastError, attempts: this.maxAttempts };
  }

  _isRetryable(error) {
    if (this.retryableErrors.length === 0) return true;
    
    const errorMessage = error.message || error.toString();
    return this.retryableErrors.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  _calculateDelay(attempt) {
    switch (this.backoff) {
      case 'exponential':
        return this.delay * Math.pow(2, attempt - 1);
      case 'linear':
        return this.delay * attempt;
      case 'fixed':
      default:
        return this.delay;
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// PROFILER - Performance tracking and reporting
// ============================================================================

class Profiler {
  constructor() {
    this.timers = new Map();
    this.results = new Map();
  }

  start(name) {
    const timer = {
      name,
      startTime: Date.now(),
      endTime: null,
      duration: null
    };
    
    this.timers.set(name, timer);
    
    return {
      end: () => this._endTimer(name)
    };
  }

  _endTimer(name) {
    const timer = this.timers.get(name);
    if (!timer) return null;
    
    timer.endTime = Date.now();
    timer.duration = timer.endTime - timer.startTime;
    
    this.results.set(name, timer);
    this.timers.delete(name);
    
    return timer;
  }

  getReport() {
    const report = {};
    for (const [name, result] of this.results) {
      report[name] = result;
    }
    return report;
  }

  printReport() {
    console.log('\n📊 Performance Report:');
    console.log('─'.repeat(50));
    
    const sorted = Array.from(this.results.entries())
      .sort((a, b) => b[1].duration - a[1].duration);
    
    for (const [name, result] of sorted) {
      const duration = result.duration;
      const unit = duration > 1000 ? 's' : 'ms';
      const value = duration > 1000 ? (duration / 1000).toFixed(2) : duration;
      console.log(`  ${name.padEnd(30)} ${value}${unit}`);
    }
    
    console.log('─'.repeat(50));
  }

  getTotalTime() {
    let total = 0;
    for (const result of this.results.values()) {
      total += result.duration;
    }
    return total;
  }
}

// ============================================================================
// PROGRESS TRACKER - Visual progress indication
// ============================================================================

class ProgressTracker {
  constructor(total, options = {}) {
    this.total = total;
    this.current = 0;
    this.label = options.label || 'Progress';
    this.startTime = Date.now();
  }

  update(increment = 1) {
    this.current += increment;
    this._render();
  }

  _render() {
    const percent = Math.round((this.current / this.total) * 100);
    const bar = this._createBar(percent);
    const eta = this._calculateETA();
    
    process.stdout.write(`\r${this.label}: ${bar} ${percent}% (${this.current}/${this.total}) ${eta}`);
    
    if (this.current >= this.total) {
      process.stdout.write('\n');
    }
  }

  _createBar(percent) {
    const width = 20;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  _calculateETA() {
    if (this.current === 0) return '';
    
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / elapsed;
    const remaining = this.total - this.current;
    const etaMs = remaining / rate;
    
    const seconds = Math.round(etaMs / 1000);
    if (seconds < 60) return `~${seconds}s`;
    
    const minutes = Math.round(seconds / 60);
    return `~${minutes}m`;
  }
}

// ============================================================================
// RATE LIMITER - Token bucket algorithm
// ============================================================================

class RateLimiter {
  constructor(options = {}) {
    this.tokens = options.tokens || 10;
    this.interval = options.interval || 1000;
    this.currentTokens = this.tokens;
    this.lastRefill = Date.now();
  }

  async acquire() {
    this._refill();
    
    if (this.currentTokens > 0) {
      this.currentTokens--;
      return true;
    }
    
    // Wait for next refill
    const waitTime = this.interval - (Date.now() - this.lastRefill);
    await this._sleep(Math.max(0, waitTime));
    return this.acquire();
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.interval) * this.tokens;
    
    if (tokensToAdd > 0) {
      this.currentTokens = Math.min(this.tokens, this.currentTokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  Batcher,
  SimpleCache,
  RetryStrategy,
  Profiler,
  ProgressTracker,
  RateLimiter
};
