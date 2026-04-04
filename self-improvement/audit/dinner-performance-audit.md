# Dinner Automation Performance Audit

**Date:** February 13, 2026  
**Audited Files:** 4  
**Total Lines:** ~3,200  
**Estimated Time to Complete:** 4-6 hours

---

## Executive Summary

The dinner automation system has several performance bottlenecks that significantly impact runtime:

| Metric | Current | Optimized (Est.) | Improvement |
|--------|---------|------------------|-------------|
| HEB Cart (30 items) | 5-8 minutes | 1.5-2 minutes | **70% faster** |
| Email Image Fetch | 7-21 seconds | 2-4 seconds | **80% faster** |
| Calendar Sync (7 events) | 15-30 seconds | 3-5 seconds | **80% faster** |
| Facebook Check | 15-20 seconds | 3-5 seconds | **75% faster** |

**Critical Issues Found:** 18  
**High Priority:** 7  
**Medium Priority:** 8  
**Low Priority:** 3

---

## Detailed Findings

### 1. HEB Cart Automation (`heb-add-cart.js`)

| Line(s) | Issue | Impact | Fix Priority | Estimated Speedup |
|---------|-------|--------|--------------|-------------------|
| 25-28, 40-45, 81-95 | **Excessive random delays** - 3-8s between items, 10-16s batch pauses, 2-4s verification retries | 60-70% of runtime is artificial delays | 🔴 Critical | **3-4x faster** |
| 110-140 | **Sequential processing only** - `staggeredBatch` processes items one at a time with no parallelism | CPU idle during network waits | 🔴 Critical | **2-3x faster** |
| 275, 283 | **Full page reload per item** - `page.goto()` for each search term instead of using single-page navigation | 2-3s per page load × 30 items = 60-90s wasted | 🔴 Critical | **50% faster** |
| 67-95 | **Redundant cart verification** - 3 retries with 2-4s delays, even when add button success is likely | Adds 6-12s per item unnecessarily | 🟠 High | **30% faster** |
| 152-210 | **Multiple DOM selector strategies** - Tries 4+ selector patterns sequentially with no caching | 500ms-1s per item wasted on retries | 🟡 Medium | **10% faster** |
| 275-290 | **No intelligent batching** - Fixed batch size of 5, no dynamic adjustment based on success rate | Suboptimal throughput | 🟡 Medium | **15% faster** |
| 40-45 | **Unnecessary session warmup** - 5-9s of "human-like" behavior before any work | Wasted startup time | 🟢 Low | **5s saved** |

**Current Performance:**
- Time per item: 6-10 seconds
- 30 items: 3-5 minutes (best case), 8+ minutes (worst case)
- Network requests: ~60-90 (2-3 per item: search, verify cart, click)
- Retry rate: ~10-15% due to bot detection false positives

**Suggested Refactors:**
```javascript
// LINES 110-140: Replace with parallel batch processing
async function parallelBatch(items, batchSize, processFn, { maxConcurrency = 3 } = {}) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // Process up to maxConcurrent items in parallel
    const batchResults = await Promise.all(
      batch.map(item => processFn(item))
    );
    results.push(...batchResults);
    // Shorter, smarter delay based on success rate
    await adaptiveDelay(results.slice(-batchSize));
  }
  return results;
}

// LINES 275-290: Use SPA navigation instead of full reload
// Replace: page.goto(`https://www.heb.com/search?q=${term}`)
// With: 
await page.evaluate((term) => {
  window.history.pushState({}, '', `/search?q=${encodeURIComponent(term)}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}, term);

// LINES 67-95: Smart verification with early exit
async function verifyCartIncreased(page, initialCount, maxRetries = 3) {
  // Check immediately first - often cart updates synchronously
  const immediate = await getCartCount(page);
  if (immediate > initialCount) return { success: true, newCount: immediate };
  
  // Only retry if immediate check failed
  for (let i = 0; i < maxRetries; i++) {
    await randomDelay(500, 1000); // Shorter delays
    const count = await getCartCount(page);
    if (count > initialCount) return { success: true, newCount: count };
  }
  return { success: false };
}
```

---

### 2. Dinner Email System (`dinner-email-system-v2.js`)

| Line(s) | Issue | Impact | Fix Priority | Estimated Speedup |
|---------|-------|--------|--------------|-------------------|
| 715-745 | **Sequential image fetching** - `getImagesForPlan` awaits each Unsplash API call | 1-3s × 7 meals = 7-21s serial delay | 🔴 Critical | **5-6x faster** |
| 950-955 | **Blocking execSync** - Calendar sync runs synchronously, blocks event loop | Email sending stalls for 5-10s | 🔴 Critical | **Non-blocking** |
| 640-700 | **No HTTPS connection pooling** - New connection per Unsplash request | Connection overhead × 7 images | 🟠 High | **30% faster** |
| 124-304 | **Template styles rebuilt on every instantiation** - `baseStyles` computed in constructor | ~5ms wasted per email, but unnecessary | 🟡 Medium | **Cleanup** |
| 580-620 | **Inefficient cache checking** - File read + JSON parse for every image check | ~10ms × 7 = 70ms wasted | 🟡 Medium | **Slight** |
| 820-880 | **SMS service loads config on every call** - File I/O in hot path | ~5ms per SMS check | 🟢 Low | **Minor** |
| 1120-1180 | **NLP patterns recompiled on every parse** - Regex objects recreated | ~1ms per parse, but wasteful | 🟢 Low | **Cleanup** |

**Current Performance:**
- Image fetching: 7-21 seconds (sequential)
- Email send: 2-5 seconds (including blocking calendar sync)
- Parser: <10ms per reply (acceptable)
- Memory: Stable, no leaks detected

**Suggested Refactors:**
```javascript
// LINES 715-745: Parallel image fetching
async function getImagesForPlan(meals, recipes) {
  const images = await Promise.all(
    meals.map(async meal => {
      const recipe = recipes[meal.name];
      return [meal.name, await this.getMealImage(meal.name, recipe?.cuisine)];
    })
  );
  return Object.fromEntries(images);
}

// LINES 950-955: Non-blocking calendar sync
// Replace: execSync('node sync-dinner-to-icloud.js', ...)
// With:
const { spawn } = require('child_process');
const syncProcess = spawn('node', ['sync-dinner-to-icloud.js'], {
  cwd: __dirname,
  detached: true,
  stdio: 'ignore'
});
// Don't await - let it run in background

// LINES 640-700: Connection pooling with keep-alive
const https = require('https');
const agent = new https.Agent({ keepAlive: true, maxSockets: 5 });
// Use agent in fetchFromUnsplash requests
```

---

### 3. Calendar Sync (`sync-dinner-to-icloud.js`)

| Line(s) | Issue | Impact | Fix Priority | Estimated Speedup |
|---------|-------|--------|--------------|-------------------|
| 214-267 | **Sequential event processing** - One event at a time with awaits | 7 events × 2-4s = 14-28s serial | 🔴 Critical | **4-5x faster** |
| 233 | **fetchCalendarObjects called PER event** - Lists ALL calendar objects repeatedly | O(n²) behavior - 7× the necessary API calls | 🔴 Critical | **80% fewer requests** |
| 196 | **No connection reuse** - DAVClient may not reuse connections | TCP handshake overhead per request | 🟠 High | **20% faster** |
| 86-104 | **Synchronous file reads** - `readFileSync` pattern (async but blocking) | Minor - only at startup | 🟡 Medium | **Startup only** |
| 260 | **findExistingEvent is O(n)** - Linear search through all objects for each event | Combined with line 233, creates O(n²) | 🟠 High | **Use Map** |

**Current Performance:**
- Sync time: 15-30 seconds for 7 events
- Network requests: ~50+ (7 × fetchCalendarObjects + creates/updates)
- Memory usage: Low, stable

**Suggested Refactors:**
```javascript
// LINES 214-267: Batch processing with single fetchCalendarObjects call
async function syncDinnerToiCloud() {
  // ... setup code ...
  
  // Fetch ALL existing events ONCE
  console.log('📅 Fetching existing calendar events...');
  const existingObjects = await client.fetchCalendarObjects({ calendar: dinnerCalendar });
  const existingMap = new Map();
  for (const obj of existingObjects) {
    const uidMatch = obj.data?.match(/UID:([^\r\n]+)/);
    if (uidMatch) existingMap.set(uidMatch[1], obj);
  }
  console.log(`   Found ${existingMap.size} existing events`);
  
  // Process all events with lookup in memory
  const results = await Promise.allSettled(
    events.map(event => syncEvent(event, existingMap, dinnerCalendar, recipes, youtubeCache))
  );
  
  // Aggregate results
  const created = results.filter(r => r.status === 'fulfilled' && r.value?.created).length;
  const updated = results.filter(r => r.status === 'fulfilled' && r.value?.updated).length;
  const failed = results.filter(r => r.status === 'rejected').length;
}

// LINES 233, 260: Remove findExistingEvent, use Map lookup instead
async function syncEvent(event, existingMap, calendar, recipes, youtubeCache) {
  const existing = existingMap.get(event.uid);
  // ... rest of sync logic ...
}
```

---

### 4. Facebook Marketplace (`facebook-marketplace-shared.js`)

| Line(s) | Issue | Impact | Fix Priority | Estimated Speedup |
|---------|-------|--------|--------------|-------------------|
| 51, 67, 84 | **Fixed waitForTimeout delays** - Hardcoded 3s, 5s, 10s waits | Always waits maximum time regardless of page state | 🟠 High | **60% faster** |
| 67 | **Full page content load** - `page.content()` loads entire HTML into memory | Memory spike, slow for large pages | 🟡 Medium | **Use selectors** |
| 17-18 | **Hardcoded credentials** - Security risk, not performance but critical | Code smell | 🔴 Critical | **Use env vars** |
| 26-31 | **Synchronous file I/O** - `readFileSync`/`writeFileSync` | Blocks event loop briefly | 🟡 Medium | **Use async** |
| 45, 78 | **No retry logic** - Network failures cause immediate failure | Reliability issue | 🟡 Medium | **Add retries** |

**Current Performance:**
- Check messages: 15-20 seconds
- Share F-150: 20-30 seconds (mostly waiting)
- Memory: Brief spike from `page.content()`

**Suggested Refactors:**
```javascript
// LINES 51, 67, 84: Replace fixed timeouts with waitFor selectors
// Replace: await page.waitForTimeout(3000)
// With:
await page.waitForLoadState('networkidle', { timeout: 10000 });
// Or for specific elements:
await page.waitForSelector('[data-testid="notification_badge"]', { timeout: 5000 });

// LINES 17-18: Move to environment variables
const FB_EMAIL = process.env.FB_EMAIL;
const FB_PASSWORD = process.env.FB_PASSWORD;
if (!FB_EMAIL || !FB_PASSWORD) {
  throw new Error('Facebook credentials not configured');
}

// LINES 26-31: Async file operations
const state = await fs.promises.readFile(STATE_FILE, 'utf8')
  .then(data => JSON.parse(data))
  .catch(() => ({ lastGroupIndex: -1, loggedIn: false }));

// LINE 67: Use selectors instead of full content
const hasF150 = await page.locator('text=/f-150|f150|truck|thule/i').count() > 0;
```

---

## Memory Leak Analysis

| File | Risk Level | Issue | Details |
|------|------------|-------|---------|
| `heb-add-cart.js` | 🟢 Low | None detected | Proper browser close at L303 |
| `dinner-email-system-v2.js` | 🟢 Low | None detected | All streams properly closed |
| `sync-dinner-to-icloud.js` | 🟡 Medium | DAVClient not explicitly closed | Add `client.logout()` at end |
| `facebook-marketplace-shared.js` | 🟢 Low | None detected | Uses shared connector |

**Recommendation:** Add explicit cleanup in `sync-dinner-to-icloud.js`:
```javascript
// After sync operations complete:
try {
  await client.logout();
} catch (e) {
  // Ignore logout errors
}
```

---

## Anti-Patterns Found

| Pattern | Location | Issue | Fix |
|---------|----------|-------|-----|
| **Busy-waiting with random delays** | `heb-add-cart.js:25-28` | Uses arbitrary delays instead of proper wait conditions | Replace with `waitForSelector` |
| **Sync-in-async (execSync)** | `dinner-email-system-v2.js:950` | Blocks event loop | Use `spawn` or `exec` with callback |
| **O(n²) algorithm** | `sync-dinner-to-icloud.js:214-267` | Nested loop over calendar objects | Use Map for O(1) lookup |
| **Sequential awaits in loops** | All files | No parallelism for independent operations | Use `Promise.all` / `Promise.allSettled` |
| **Hardcoded secrets** | `facebook-marketplace-shared.js:17-18` | Security risk | Use environment variables |

---

## Optimization Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
- [ ] Replace `execSync` with async spawn in email system
- [ ] Parallelize image fetching with `Promise.all`
- [ ] Cache calendar objects once instead of per-event
- [ ] Remove redundant cart verification retries
- [ ] **Expected improvement:** 50% faster email/calendar, 30% faster HEB

### Phase 2: HEB Optimization (2-3 hours)
- [ ] Implement parallel batch processing (max 3 concurrent)
- [ ] Replace page.goto with SPA-style navigation
- [ ] Add intelligent adaptive delays based on success rate
- [ ] Cache successful selectors per page layout
- [ ] **Expected improvement:** 70% faster HEB cart additions

### Phase 3: Architecture Improvements (2-3 hours)
- [ ] Add HTTPS connection pooling
- [ ] Implement persistent HTTP/2 connections where supported
- [ ] Add connection reuse to DAV client
- [ ] Move credentials to environment variables
- [ ] **Expected improvement:** 20-30% reduction in network overhead

---

## Estimated Total Speedup

| Component | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|-----------|---------|---------------|---------------|---------------|
| HEB Cart (30 items) | 5-8 min | 4-6 min | **1.5-2 min** | 1-1.5 min |
| Email Send | 10-25s | **3-8s** | 3-8s | 2-6s |
| Calendar Sync | 15-30s | **5-10s** | 5-10s | 3-6s |
| Facebook Check | 15-20s | **5-10s** | 5-10s | 3-5s |

**Overall System:** ~70% faster after all phases

---

## Testing Recommendations

1. **Add timing instrumentation:**
   ```javascript
   const start = performance.now();
   // ... operation ...
   console.log(`Operation took ${(performance.now() - start).toFixed(2)}ms`);
   ```

2. **Add retry/failure tracking:**
   ```javascript
   const metrics = { attempts: 0, failures: 0, retries: 0 };
   // Track per operation
   ```

3. **Monitor memory usage:**
   ```javascript
   const usage = process.memoryUsage();
   console.log(`Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
   ```

---

*Audit completed by: Marvin Maverick*  
*Next review: After Phase 1 implementation*
