# Automation Utilities Documentation

## Overview

The `utils/` directory contains production-ready utility modules for automation optimization.

## Quick Start

```javascript
const { BrowserPool, RetryWrapper, CacheManager } = require('./utils');

// Use browser pooling
const pool = new BrowserPool({ maxContexts: 5 });
const { page, release } = await pool.acquirePage({ url: 'https://heb.com' });
// ... automation ...
await release();

// Add retry logic
const wrapper = new RetryWrapper({ maxRetries: 3 });
const robustFn = wrapper.wrap(async () => { /* flaky operation */ });

// Cache expensive operations
const cache = new CacheManager();
const result = await cache.getOrCompute('key', () => fetchData());
```

## Modules

### BrowserPool

Manages browser contexts efficiently.

```javascript
const pool = new BrowserPool({
  browserType: 'chromium',    // 'chromium' | 'firefox' | 'webkit'
  maxContexts: 5,             // Max concurrent contexts
  maxPagesPerContext: 3,      // Pages per context
  idleTimeout: 60000,         // Close idle contexts (ms)
  reuseContexts: true         // Enable pooling
});

// Acquire a page
const { page, release } = await pool.acquirePage({
  url: 'https://example.com',  // Auto-navigate
  viewport: { width: 1920, height: 1080 }
});

// Or use with helper
await pool.withPage(async page => {
  await page.goto('https://example.com');
  return await page.title();
});

// Cleanup
await pool.close();
```

### RetryWrapper

Intelligent retry with circuit breaker.

```javascript
const wrapper = new RetryWrapper({
  maxRetries: 3,
  delay: 1000,          // Initial delay (ms)
  backoff: 2,           // Exponential backoff multiplier
  maxDelay: 30000,      // Max delay cap
  jitter: true,         // Add randomness
  timeout: 60000        // Per-attempt timeout
});

// Wrap a function
const robust = wrapper.wrap(async (url) => {
  return await fetch(url);
}, {
  useCircuitBreaker: true,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000
  }
});

// One-off retry
const result = await withRetry(async () => {
  return await riskyOperation();
}, { maxRetries: 2 });
```

### ParallelProcessor

Controlled concurrent execution.

```javascript
const processor = new ParallelProcessor({
  concurrency: 5,       // Max parallel
  rateLimit: 10,        // Ops per second
  retryAttempts: 2,
  stopOnError: false,   // Continue on individual failure
  onProgress: (p) => console.log(`${p.percent}%`)
});

// Process array
const results = await processor.process(items, async (item) => {
  return await processItem(item);
});

// Batch with delays
await processor.processBatched(items, processor, {
  batchSize: 10,
  delayBetween: 5000
});

// Convenience functions
const mapped = await parallelMap(items, mapper, 5);
const filtered = await parallelFilter(items, predicate, 5);
```

### CacheManager

Multi-tier caching.

```javascript
const cache = new CacheManager({
  cacheDir: './.cache',
  defaultTTL: 3600000,      // 1 hour
  maxMemoryItems: 100,      // LRU limit
  compression: true         // Compress >1KB
});

// Basic operations
await cache.set('key', value, { ttl: 60000 });
const value = await cache.get('key');
await cache.delete('key');

// Cache-aside pattern
const result = await cache.getOrCompute('expensive', async () => {
  return await expensiveOperation();
}, { ttl: 300000 });

// Namespacing
const userCache = cache.namespace('users');
await userCache.set('123', userData);

// Statistics
console.log(cache.getStats());
// { hits: 45, misses: 10, hitRate: '81.82%' }
```

### MetricsCollector

Performance instrumentation.

```javascript
const metrics = new MetricsCollector({
  outputDir: './metrics',
  autoSave: true,
  retentionCount: 10
});

// Timing
const timer = metrics.startTimer('operation');
// ... work ...
timer.end();

// Or use decorator
class MyClass {
  @metrics.time('methodName')
  async myMethod() { }
}

// Counters and gauges
metrics.increment('requests');
metrics.increment('bytes', 1024);
metrics.gauge('active', 5);

// Histograms (percentiles)
for (const time of responseTimes) {
  metrics.histogram('response_time', time);
}

// Memory snapshot
console.log(metrics.getMemoryUsage());

// Export
await metrics.save('json');
await metrics.save('csv');

// Print report
metrics.printReport();
```

## Testing

```bash
# Run all tests
npm test

# Run benchmarks only
npm run test:benchmarks

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

## Performance Tips

1. **Always use BrowserPool** for multiple operations
2. **Set appropriate concurrency** (5 is usually safe)
3. **Enable rate limiting** for external APIs (10/sec default)
4. **Cache expensive operations** (API calls, searches)
5. **Use circuit breakers** for external services
6. **Collect metrics** to identify bottlenecks

## Error Handling

All modules emit events and handle errors gracefully:

```javascript
pool.on('error', console.error);
wrapper.on('retry', ({ attempt, max }) => console.log(`Retry ${attempt}/${max}`));
```
