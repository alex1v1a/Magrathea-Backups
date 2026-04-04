# Performance Optimization Guidelines

**Version:** 1.0  
**Date:** 2026-02-13  
**Scope:** All automation scripts

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Parallelization Patterns](#parallelization-patterns)
3. [Delay Optimization](#delay-optimization)
4. [File I/O Best Practices](#file-io-best-practices)
5. [Browser Automation](#browser-automation)
6. [Memory Management](#memory-management)
7. [Profiling Techniques](#profiling-techniques)
8. [Anti-Bot Balance](#anti-bot-balance)

---

## Core Principles

### 1. Measure First, Optimize Second

```javascript
// Always measure before optimizing
const startTime = Date.now();
// ... code to measure ...
console.log(`Operation took ${Date.now() - startTime}ms`);
```

### 2. Prefer Parallel Over Sequential

```javascript
// ❌ SLOW - Sequential (4× network latency)
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();
const d = await fetchD();

// ✅ FAST - Parallel (1× network latency)
const [a, b, c, d] = await Promise.all([
  fetchA(), fetchB(), fetchC(), fetchD()
]);
```

### 3. Cache Expensive Operations

```javascript
const cache = new Map();

async function getExpensiveData(key) {
  if (cache.has(key)) {
    return cache.get(key); // Instant return
  }
  
  const data = await fetchExpensiveData(key);
  cache.set(key, data);
  return data;
}
```

---

## Parallelization Patterns

### Pattern 1: Concurrent Array Processing

```javascript
// Process array items with concurrency limit
async function processWithConcurrency(items, processFn, maxConcurrency = 3) {
  const results = [];
  
  for (let i = 0; i < items.length; i += maxConcurrency) {
    const batch = items.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(
      batch.map(item => processFn(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}

// Usage: Process 3 items at a time
await processWithConcurrency(items, processItem, 3);
```

### Pattern 2: Parallel File Loading

```javascript
// ❌ SLOW - Sequential file reads
const plan = await loadWeeklyPlan();
const recipes = await loadRecipeDatabase();
const cache = await loadYouTubeCache();

// ✅ FAST - Parallel file reads
const [plan, recipes, cache] = await Promise.all([
  loadWeeklyPlan(),
  loadRecipeDatabase(),
  loadYouTubeCache()
]);
```

### Pattern 3: Fire-and-Forget

```javascript
// Don't wait for non-critical operations
async function updateSystems() {
  // Wait for critical sync
  await syncCriticalData();
  
  // Fire non-critical updates without waiting
  syncAnalytics().catch(() => {}); // Fire-and-forget
  syncLogs().catch(() => {});      // Fire-and-forget
  
  return { success: true };
}
```

---

## Delay Optimization

### Pattern 1: Smart Waiting (Replace Fixed Delays)

```javascript
// ❌ SLOW - Always waits 5 seconds
await page.waitForTimeout(5000);

// ✅ FAST - Returns early when condition met
await page.waitForSelector('.element-ready', { 
  timeout: 5000 
});

// ✅ BETTER - Multiple condition options
await Promise.race([
  page.waitForSelector('.success', { timeout: 10000 }),
  page.waitForSelector('.error', { timeout: 10000 }),
  page.waitForTimeout(5000) // Fallback
]);
```

### Pattern 2: Adaptive Delays

```javascript
class AdaptiveDelayer {
  constructor() {
    this.baseDelay = 1000;
    this.successRate = 1.0;
  }
  
  async delay() {
    // Adjust delay based on recent success rate
    const adjustedDelay = this.baseDelay * (2 - this.successRate);
    const jitter = Math.random() * 500;
    await new Promise(r => setTimeout(r, adjustedDelay + jitter));
  }
  
  recordSuccess() {
    this.successRate = Math.min(1, this.successRate + 0.1);
  }
  
  recordFailure() {
    this.successRate = Math.max(0.5, this.successRate - 0.2);
  }
}
```

### Pattern 3: Minimum Necessary Delays

```javascript
// For bot detection, use minimum viable delays
const DELAYS = {
  humanLike: { min: 800, max: 2000 },   // Was: 2000-4000ms
  betweenActions: { min: 1500, max: 3500 }, // Was: 3000-8000ms
  pageLoad: { min: 2000, max: 4000 }    // Was: 4000-7000ms
};
```

---

## File I/O Best Practices

### Pattern 1: In-Memory Caching

```javascript
class ConfigCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }
  
  async get(filePath) {
    const now = Date.now();
    const cached = this.cache.get(filePath);
    const timestamp = this.timestamps.get(filePath);
    
    if (cached && timestamp && (now - timestamp) < this.ttl) {
      return cached;
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    this.cache.set(filePath, parsed);
    this.timestamps.set(filePath, now);
    
    return parsed;
  }
  
  invalidate(filePath) {
    this.cache.delete(filePath);
    this.timestamps.delete(filePath);
  }
}
```

### Pattern 2: Debounced Writes

```javascript
function debouncedWrite(filePath, getData, delayMs = 5000) {
  let timeout = null;
  let pendingData = null;
  
  return async (data) => {
    pendingData = data;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(async () => {
      await fs.writeFile(filePath, JSON.stringify(pendingData, null, 2));
      timeout = null;
      pendingData = null;
    }, delayMs);
  };
}
```

### Pattern 3: Streaming Large Files

```javascript
// For large files, use streams
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');
const { createGzip } = require('zlib');

async function compressLargeFile(inputPath, outputPath) {
  await pipeline(
    createReadStream(inputPath),
    createGzip(),
    createWriteStream(outputPath)
  );
}
```

---

## Browser Automation

### Pattern 1: Reuse Browser Contexts

```javascript
let browserContext = null;

async function getReusableContext() {
  if (!browserContext) {
    browserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
  }
  return browserContext;
}

// Use shared context across operations
const context = await getReusableContext();
const page = await context.newPage();
```

### Pattern 2: Optimize Navigation

```javascript
// Choose appropriate wait condition
await page.goto(url, { 
  waitUntil: 'domcontentloaded', // Fastest
  timeout: 15000 
});

// For pages that need more resources:
await page.goto(url, { 
  waitUntil: 'networkidle', // Slower but complete
  timeout: 30000 
});
```

### Pattern 3: Batch DOM Operations

```javascript
// ❌ SLOW - Multiple round trips
const title = await page.$eval('.title', el => el.textContent);
const price = await page.$eval('.price', el => el.textContent);
const stock = await page.$eval('.stock', el => el.textContent);

// ✅ FAST - Single round trip
const data = await page.evaluate(() => {
  return {
    title: document.querySelector('.title')?.textContent,
    price: document.querySelector('.price')?.textContent,
    stock: document.querySelector('.stock')?.textContent
  };
});
```

### Pattern 4: Efficient Selectors

```javascript
// ❌ SLOW - Broad selectors
await page.click('button');
await page.fill('input', 'value');

// ✅ FAST - Specific selectors
await page.click('button[data-testid="add-to-cart"]');
await page.fill('input[name="email"]', 'value');

// ✅ FASTEST - Pre-computed selectors
const ADD_TO_CART_SELECTOR = 'button[data-testid="add-to-cart"]';
await page.click(ADD_TO_CART_SELECTOR);
```

---

## Memory Management

### Pattern 1: Limit Concurrent Operations

```javascript
async function* batchGenerator(items, batchSize) {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize);
  }
}

// Process large datasets without memory explosion
for await (const batch of batchGenerator(largeArray, 100)) {
  await processBatch(batch);
}
```

### Pattern 2: Clear References

```javascript
async function processLargeFile() {
  let largeData = await loadLargeFile();
  
  // Process data
  const result = processData(largeData);
  
  // Clear reference to allow GC
  largeData = null;
  
  return result;
}
```

### Pattern 3: Use Streams for Large Data

```javascript
// Instead of loading entire file into memory
const readline = require('readline');

async function* lineByLine(filePath) {
  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    yield line;
  }
}
```

---

## Profiling Techniques

### Simple Timing Wrapper

```javascript
function timed(name, fn) {
  return async (...args) => {
    const start = Date.now();
    const result = await fn(...args);
    console.log(`${name}: ${Date.now() - start}ms`);
    return result;
  };
}

// Usage
const fetchData = timed('fetchData', async (url) => {
  return await fetch(url);
});
```

### Detailed Performance Logging

```javascript
class PerformanceLogger {
  constructor() {
    this.marks = new Map();
    this.measures = [];
  }
  
  mark(name) {
    this.marks.set(name, performance.now());
  }
  
  measure(name, startMark, endMark) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark) || performance.now();
    
    this.measures.push({
      name,
      duration: end - start,
      timestamp: new Date().toISOString()
    });
  }
  
  report() {
    console.table(this.measures);
  }
}
```

### Memory Profiling

```javascript
function logMemoryUsage(label) {
  const usage = process.memoryUsage();
  console.log(`${label}:`, {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
  });
}

// Usage
logMemoryUsage('Before operation');
await heavyOperation();
logMemoryUsage('After operation');
```

---

## Anti-Bot Balance

### Balancing Speed vs Detection

```javascript
// Configuration for different risk levels
const BOT_PROTECTION = {
  low: {
    minDelay: 500,
    maxDelay: 1500,
    batchSize: 10,
    parallelWorkers: 5
  },
  medium: {
    minDelay: 1500,
    maxDelay: 4000,
    batchSize: 5,
    parallelWorkers: 3
  },
  high: {
    minDelay: 3000,
    maxDelay: 8000,
    batchSize: 3,
    parallelWorkers: 1
  }
};

// Adaptive based on recent success
function getProtectionLevel(recentSuccessRate) {
  if (recentSuccessRate > 0.95) return BOT_PROTECTION.low;
  if (recentSuccessRate > 0.80) return BOT_PROTECTION.medium;
  return BOT_PROTECTION.high;
}
```

### Human-Like Patterns

```javascript
async function humanLikeDelay(baseDelay) {
  // Random delay with normal distribution (more realistic)
  const random = () => Math.random() + Math.random() + Math.random();
  const normalized = random() / 3; // 0 to 1 with central tendency
  const delay = baseDelay * (0.5 + normalized);
  
  await new Promise(r => setTimeout(r, delay));
}

async function humanLikeScroll(page) {
  // Variable scroll amounts
  const scrolls = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < scrolls; i++) {
    const amount = Math.floor(Math.random() * 300) + 100;
    await page.evaluate(a => window.scrollBy(0, a), amount);
    await humanLikeDelay(300);
  }
}
```

---

## Quick Reference

| Pattern | Before | After | Improvement |
|---------|--------|-------|-------------|
| Parallel file loading | 200ms | 60ms | 70% |
| Concurrent image fetch | 10s | 2s | 80% |
| Smart waiting | 5s | 1-2s | 60-80% |
| Batch DOM queries | 3× RTT | 1× RTT | 67% |
| Config caching | 5ms/read | 0ms/read | 100% |

---

## Testing Optimizations

Always verify optimizations don't break functionality:

```javascript
async function testOptimization() {
  // Run original and optimized versions
  const originalResult = await timed('original', originalFn)();
  const optimizedResult = await timed('optimized', optimizedFn)();
  
  // Verify same output
  if (JSON.stringify(originalResult) !== JSON.stringify(optimizedResult)) {
    throw new Error('Optimization changed behavior!');
  }
  
  console.log('✅ Optimization safe and faster');
}
```

---

*Document maintained by Marvin Performance Team*
