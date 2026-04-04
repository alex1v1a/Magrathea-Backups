/**
 * Quick Optimizations - Easy wins for existing scripts
 * Drop-in replacements for common patterns
 * 
 * Usage: Import functions to replace verbose patterns
 */

const { 
  withRetry, 
  sleep, 
  SelectorEngine, 
  SELECTOR_GROUPS,
  HTTPClient,
  Batcher,
  Profiler
} = require('./lib');

/**
 * Drop-in replacement for verbose retry loops
 * Before: Custom retry loops in 15+ files
 * After: One-liner with smart defaults
 */
async function robustOperation(operation, options = {}) {
  return withRetry(operation, {
    maxRetries: options.maxRetries || 3,
    delay: options.delay || 1000,
    backoff: 2,
    shouldRetry: (err) => {
      const msg = err.message?.toLowerCase() || '';
      return msg.includes('timeout') || 
             msg.includes('network') ||
             msg.includes('connection');
    }
  });
}

/**
 * Drop-in replacement for fixed delays
 * Adds randomness to appear more human-like
 */
async function humanDelay(min = 500, max = 1500) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
}

/**
 * Quick element finder with common fallbacks
 */
async function quickFind(page, type, options = {}) {
  const engine = new SelectorEngine(page);
  const selectors = SELECTOR_GROUPS[type] || [type];
  return engine.findElement(selectors, options);
}

/**
 * Batch processor with sensible defaults
 */
async function quickBatch(items, processor, options = {}) {
  const batcher = new Batcher({
    batchSize: options.batchSize || 5,
    delayBetween: options.delayBetween || { min: 1000, max: 3000 },
    parallel: false
  });
  return batcher.process(items, processor);
}

/**
 * Cached API call wrapper
 */
const httpClient = new HTTPClient({ cacheTtl: 60000 });

async function cachedFetch(url, options = {}) {
  return httpClient.get(url, options);
}

/**
 * Performance tracker for scripts
 */
function trackPerformance(name) {
  const profiler = new Profiler();
  const timer = profiler.start(name);
  
  return {
    end: () => {
      timer.end();
      return profiler.getReport();
    },
    print: () => profiler.printReport()
  };
}

/**
 * Smart navigation with retry
 */
async function smartGoto(page, url, options = {}) {
  return robustOperation(
    () => page.goto(url, {
      waitUntil: options.waitUntil || 'networkidle',
      timeout: options.timeout || 30000
    }),
    options
  );
}

/**
 * Safe element click with fallback
 */
async function safeClick(page, selector, options = {}) {
  const engine = new SelectorEngine(page);
  return engine.smartClick(selector, options);
}

/**
 * Parallel map with concurrency limit
 */
async function parallelMap(items, mapper, concurrency = 3) {
  const results = [];
  const executing = [];
  
  for (let i = 0; i < items.length; i++) {
    const promise = mapper(items[i], i).then(result => {
      results[i] = result;
      return result;
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * Retry with exponential backoff (simplified)
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Memoize function results
 */
function memoize(fn, ttlMs = 60000) {
  const cache = new Map();
  
  return async function(...args) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.time < ttlMs) {
      return cached.value;
    }
    
    const result = await fn.apply(this, args);
    cache.set(key, { value: result, time: Date.now() });
    return result;
  };
}

/**
 * Timeout wrapper
 */
async function withTimeout(promise, ms, message = 'Operation timed out') {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Debounce for frequent operations
 */
function debounce(fn, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle for rate limiting
 */
function throttle(fn, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

module.exports = {
  // Core utilities
  robustOperation,
  humanDelay,
  quickFind,
  quickBatch,
  cachedFetch,
  trackPerformance,
  smartGoto,
  safeClick,
  parallelMap,
  retryWithBackoff,
  memoize,
  withTimeout,
  debounce,
  throttle,
  
  // Re-exports for convenience
  withRetry,
  sleep,
  SelectorEngine,
  SELECTOR_GROUPS,
  HTTPClient,
  Batcher,
  Profiler
};
