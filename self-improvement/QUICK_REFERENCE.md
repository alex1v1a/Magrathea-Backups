# Quick Reference: New Automation Capabilities

## 1. Performance Monitor

```javascript
const { getMonitor } = require('./self-improvement/lib/performance-monitor');

const monitor = getMonitor({ sampleRate: 1.0 });

// Track a function
const trackedFunction = monitor.track(
  async () => {
    // Your operation here
    return result;
  },
  'operation-name',
  { metadata: 'value' }
);

// Get performance report
const report = monitor.getReport();
console.log(report.bottlenecks); // Auto-identified slow operations
```

## 2. Intelligent Cache

```javascript
const { caches, IntelligentCache } = require('./self-improvement/lib/intelligent-cache');

// Use pre-configured caches
const apiData = await caches.api.getOrCompute(
  'key',
  async () => fetchData(),
  { ttl: 300000 } // 5 minutes
);

// Or create custom cache
const myCache = new IntelligentCache({
  maxSize: 1000,
  defaultTTL: 60000,
  persistPath: './data/my-cache.json'
});

// Memoize functions
const memoizedFn = myCache.memoize(expensiveFunction);
```

## 3. Batch Optimizer

```javascript
const { BatchOptimizer } = require('./self-improvement/lib/batch-optimizer');

const optimizer = new BatchOptimizer({
  concurrency: 5,
  batchSize: 10,
  retryAttempts: 2,
  onProgress: (p) => console.log(`${p.percent}% complete`)
});

// Process items in optimized batches
const results = await optimizer.execute(
  items,
  async (item) => processItem(item),
  { retryAttempts: 3 }
);

// Map with concurrency
const mapped = await optimizer.map(items, async (item) => transform(item));
```

## 4. Optimized CDP Client

```javascript
const { CDPClientOptimized } = require('./self-improvement/lib/cdp-client-optimized');

const client = new CDPClientOptimized({
  debugPort: 9222,
  connectionPoolSize: 3,
  lazyInit: true,
  healthCheckInterval: 60000
});

// Connect with automatic pooling
const { browser, context, page } = await client.connect();

// Execute with automatic retry
const result = await client.execute(async (page) => {
  return await page.evaluate(() => document.title);
});
```

## 5. Integration Checklist

### Add to dinner-automation/scripts/update-heb-meal-plan.js:
```javascript
const { caches } = require('../self-improvement/lib/intelligent-cache');
const { getMonitor } = require('../self-improvement/lib/performance-monitor');

const monitor = getMonitor();

// Wrap main function
const updateMealPlan = monitor.track(async () => {
  // Use cache for ingredient lookups
  const ingredients = await caches.computed.getOrCompute(
    `meal-plan-${weekOf}`,
    () => generateMealPlan()
  );
  // ... rest of code
}, 'update-heb-meal-plan');
```

### Add to shared-chrome-connector.js:
```javascript
// Replace CDPClient with CDPClientOptimized
const { CDPClientOptimized: CDPClient } = require('../self-improvement/lib/cdp-client-optimized');
```

## 6. MCP Integration (Future)

```javascript
// Example: Using MCP Filesystem server
const mcpFilesystem = require('@modelcontextprotocol/server-filesystem');

// Safer file operations
await mcpFilesystem.readFile('/path/to/file');
await mcpFilesystem.writeFile('/path/to/file', content);
```

## 7. Performance Monitoring Setup

```javascript
// Add to top of automation scripts
const { getMonitor } = require('./self-improvement/lib/performance-monitor');
const monitor = getMonitor();

// At end of script, log report
process.on('exit', () => {
  console.log(monitor.getReport());
});
```

## 8. Cache Warming Strategy

```javascript
// Warm cache on startup
const { caches } = require('./self-improvement/lib/intelligent-cache');

await caches.api.warm(async (key) => {
  if (key === 'common-ingredients') {
    return await fetchCommonIngredients();
  }
  if (key === 'heb-categories') {
    return await fetchHEBCategories();
  }
});
```
