/**
 * Performance Utilities for Dinner Automation
 * Shared performance optimization helpers
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// TIMING AND PROFILING
// ============================================================================

class Timer {
  constructor(label) {
    this.label = label;
    this.startTime = performance.now();
    this.checkpoints = [];
  }

  checkpoint(name) {
    const elapsed = performance.now() - this.startTime;
    this.checkpoints.push({ name, elapsed });
    return elapsed;
  }

  end() {
    this.endTime = performance.now();
    this.duration = this.endTime - this.startTime;
    return {
      label: this.label,
      duration: this.duration,
      checkpoints: this.checkpoints
    };
  }
}

class Profiler {
  constructor() {
    this.operations = new Map();
    this.activeTimers = new Map();
  }

  start(label) {
    const timer = new Timer(label);
    this.activeTimers.set(label, timer);
    return timer;
  }

  end(label) {
    const timer = this.activeTimers.get(label);
    if (!timer) return null;
    
    const result = timer.end();
    this.activeTimers.delete(label);
    
    if (!this.operations.has(label)) {
      this.operations.set(label, []);
    }
    this.operations.get(label).push(result);
    
    return result;
  }

  checkpoint(label, checkpointName) {
    const timer = this.activeTimers.get(label);
    if (timer) {
      return timer.checkpoint(checkpointName);
    }
  }

  getReport() {
    const report = {};
    for (const [label, runs] of this.operations) {
      const durations = runs.map(r => r.duration);
      report[label] = {
        count: runs.length,
        total: durations.reduce((a, b) => a + b, 0),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        runs: runs
      };
    }
    return report;
  }

  printReport() {
    const report = this.getReport();
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('═══════════════════════════════════════════');
    
    for (const [label, stats] of Object.entries(report)) {
      console.log(`\n${label}:`);
      console.log(`  Runs: ${stats.count}`);
      console.log(`  Total: ${stats.total.toFixed(2)}ms`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  Min: ${stats.min.toFixed(2)}ms`);
      console.log(`  Max: ${stats.max.toFixed(2)}ms`);
      
      if (stats.runs[0]?.checkpoints?.length > 0) {
        console.log('  Checkpoints:');
        const checkpoints = stats.runs[0].checkpoints;
        checkpoints.forEach(cp => {
          console.log(`    - ${cp.name}: ${cp.elapsed.toFixed(2)}ms`);
        });
      }
    }
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

class Batcher {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 5;
    this.delayBetween = options.delayBetween || 1000;
    this.parallel = options.parallel || false;
    this.maxParallel = options.maxParallel || 3;
  }

  async process(items, processFn) {
    const results = [];
    const batches = this._createBatches(items);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} items)`);
      
      let batchResults;
      if (this.parallel) {
        batchResults = await this._processParallel(batch, processFn);
      } else {
        batchResults = await this._processSequential(batch, processFn);
      }
      
      results.push(...batchResults);
      
      // Delay between batches (except last)
      if (i < batches.length - 1) {
        await this._delay(this.delayBetween);
      }
    }
    
    return results;
  }

  _createBatches(items) {
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  async _processSequential(items, processFn) {
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const result = await processFn(items[i], i);
      results.push(result);
    }
    return results;
  }

  async _processParallel(items, processFn) {
    const workers = [];
    for (let i = 0; i < items.length; i += this.maxParallel) {
      const chunk = items.slice(i, i + this.maxParallel);
      const promises = chunk.map((item, idx) => processFn(item, i + idx));
      workers.push(...promises);
    }
    return Promise.all(workers);
  }

  _delay(ms) {
    const actualDelay = typeof ms === 'object' 
      ? Math.floor(Math.random() * (ms.max - ms.min + 1)) + ms.min
      : ms;
    return new Promise(r => setTimeout(r, actualDelay));
  }
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

class RetryStrategy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.delay = options.delay || 1000;
    this.backoff = options.backoff || 'exponential'; // none, linear, exponential
    this.retryableErrors = options.retryableErrors || [];
  }

  async execute(fn, context = '') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await fn();
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        if (!this._shouldRetry(error)) {
          return { success: false, error, attempts: attempt };
        }
        
        if (attempt < this.maxAttempts) {
          const delay = this._calculateDelay(attempt);
          console.log(`  🔄 Retry ${attempt}/${this.maxAttempts} for ${context}: ${error.message}`);
          await this._sleep(delay);
        }
      }
    }
    
    return { success: false, error: lastError, attempts: this.maxAttempts };
  }

  _shouldRetry(error) {
    if (this.retryableErrors.length === 0) return true;
    return this.retryableErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message?.includes(pattern);
      }
      return pattern.test(error.message);
    });
  }

  _calculateDelay(attempt) {
    switch (this.backoff) {
      case 'exponential':
        return this.delay * Math.pow(2, attempt - 1);
      case 'linear':
        return this.delay * attempt;
      default:
        return this.delay;
    }
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ============================================================================
// MEMORY MONITORING
// ============================================================================

class MemoryMonitor {
  constructor(options = {}) {
    this.threshold = options.threshold || 500 * 1024 * 1024; // 500MB
    this.interval = options.interval || 30000; // 30s
    this.callback = options.callback || this._defaultCallback;
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._check(), this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  _check() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    
    if (heapUsed > this.threshold) {
      this.callback({
        heapUsed,
        threshold: this.threshold,
        percentOfThreshold: (heapUsed / this.threshold * 100).toFixed(1)
      });
    }
    
    return usage;
  }

  _defaultCallback(stats) {
    console.warn(`⚠️ Memory warning: ${(stats.heapUsed / 1024 / 1024).toFixed(1)}MB used`);
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection triggered');
    }
  }

  getUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rssMB: (usage.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2)
    };
  }
}

// ============================================================================
// CACHING
// ============================================================================

class SimpleCache {
  constructor(options = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.value;
  }

  set(key, value, customTtl) {
    const ttl = customTtl || this.ttl;
    this.store.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : 'N/A',
      size: this.store.size
    };
  }
}

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

function debounce(fn, wait, immediate = false) {
  let timeout;
  return function(...args) {
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) fn.apply(this, args);
    }, wait);
    if (callNow) fn.apply(this, args);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

class ProgressTracker {
  constructor(total, options = {}) {
    this.total = total;
    this.current = 0;
    this.label = options.label || 'Progress';
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;
  }

  update(increment = 1) {
    this.current += increment;
    const now = Date.now();
    const elapsed = now - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const remaining = (this.total - this.current) / rate;
    const percent = (this.current / this.total * 100).toFixed(1);
    
    // Only log every 5% or 5 seconds
    if (now - this.lastUpdate > 5000 || this.current % Math.ceil(this.total / 20) === 0) {
      console.log(`${this.label}: ${this.current}/${this.total} (${percent}%) - ETA: ${Math.ceil(remaining)}s`);
      this.lastUpdate = now;
    }
    
    return {
      current: this.current,
      total: this.total,
      percent,
      elapsed,
      remaining: Math.ceil(remaining),
      rate: rate.toFixed(2)
    };
  }

  complete() {
    const elapsed = Date.now() - this.startTime;
    console.log(`✅ ${this.label} complete in ${(elapsed / 1000).toFixed(1)}s`);
    return { total: this.total, elapsed };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  Timer,
  Profiler,
  Batcher,
  RetryStrategy,
  MemoryMonitor,
  SimpleCache,
  debounce,
  throttle,
  ProgressTracker
};
