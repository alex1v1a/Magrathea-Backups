# Performance Audit: Existing Automation Scripts

**Date:** February 12, 2026  
**Auditor:** Self-Improvement Mode (Marvin)  
**Scope:** Critical path automation scripts

---

## Executive Summary

| Script | Lines | Complexity | Performance Grade | Priority |
|--------|-------|------------|-------------------|----------|
| heb-add-cart.js | ~500 | High | B+ | Critical |
| dinner-email-system-v2.js | ~600 | High | B | Critical |
| facebook-marketplace-shared.js | ~400 | Medium | C+ | Medium |
| kanban-sync.js | ~200 | Low | B | Medium |

---

## Script-by-Script Analysis

### 1. heb-add-cart.js

**Purpose:** Add items to HEB shopping cart via browser automation

**Current Strengths:**
- ✅ Per-item verification (cart count check)
- ✅ Retry logic with verification
- ✅ Anti-bot delays (randomized)
- ✅ Session warmup
- ✅ Batch processing with pauses

**Identified Bottlenecks:**

| Issue | Impact | Location | Recommendation |
|-------|--------|----------|----------------|
| Sequential item processing | High (42 items × ~20s = 14 min) | Main loop | Add controlled parallelism (3-5 concurrent) |
| Fixed batch size of 5 | Medium | `staggeredBatch()` | Dynamic batch sizing based on item complexity |
| Multiple cart count reads | Low | `verifyCartIncreased()` | Cache cart state, read once per batch |
| No connection pooling | Medium | `chromium.connectOverCDP()` | Reuse browser context across sessions |
| Redundant scrolling | Low | `findAndClickAddButton()` | Scroll once per page, not per item |

**Timing Analysis (Estimated):**
```
Current: 42 items × 20s average = ~14 minutes
Optimized: 42 items × 12s average (with parallelism) = ~8-9 minutes
Potential improvement: 35-40%
```

**Optimization Opportunities:**
1. **Parallel Item Search** (High impact, Medium risk)
   - Open 3-5 tabs simultaneously
   - Search for items in parallel
   - Sequential add to cart (HEB limit)
   - Risk: Bot detection increases

2. **Smart Batching** (Medium impact, Low risk)
   - Analyze item search complexity
   - Simple items (common products): larger batches
   - Complex items (specific brands): smaller batches
   - Estimated 10-15% improvement

3. **Connection Reuse** (Medium impact, Low risk)
   - Keep browser context alive between runs
   - Warm cookies/session data
   - Reduces warmup time by ~5s per run

---

### 2. dinner-email-system-v2.js

**Purpose:** Send dinner plan emails with tracking and NLP reply parsing

**Current Strengths:**
- ✅ Comprehensive HTML templates
- ✅ Status tracking (sent → opened → replied → confirmed)
- ✅ NLP-based reply parsing
- ✅ SMS fallback via Twilio
- ✅ Unsplash image integration

**Identified Bottlenecks:**

| Issue | Impact | Location | Recommendation |
|-------|--------|----------|----------------|
| Synchronous image fetching | Medium | `fetchUnsplashImage()` | Parallel image fetching with Promise.all |
| No image caching validation | Low | Image cache | Check cache freshness before reuse |
| Sequential template rendering | Low | `renderMealCard()` | Pre-compile templates |
| No connection pooling for SMTP | Low | Email sending | Reuse SMTP connection |
| Large memory footprint | Medium | HTML templates | Stream rendering for large emails |

**Timing Analysis:**
```
Current: ~3-5 seconds for email generation
Optimized: ~1-2 seconds (with parallel image fetch)
Potential improvement: 50-60%
```

**Optimization Opportunities:**
1. **Parallel Image Fetching** (High impact, Low risk)
   ```javascript
   // Current: Sequential
   for (const meal of meals) {
     image = await fetchUnsplashImage(meal.name);
   }
   
   // Optimized: Parallel
   const images = await Promise.all(
     meals.map(m => fetchUnsplashImage(m.name))
   );
   ```

2. **Template Pre-compilation** (Medium impact, Low risk)
   - Compile HTML templates once at startup
   - Reuse compiled templates
   - Reduces render time by ~30%

3. **Smart Image Caching** (Medium impact, Low risk)
   - Validate cached images exist and are valid
   - Cache hit rate should be >90%
   - Fall back to fetch only on miss

---

### 3. facebook-marketplace-shared.js

**Purpose:** Facebook Marketplace automation (messages, sharing)

**Current Strengths:**
- ✅ CDP connection to existing Chrome
- ✅ Shared browser context
- ✅ Message checking automation

**Identified Bottlenecks:**

| Issue | Impact | Location | Recommendation |
|-------|--------|----------|----------------|
| Full page reload on each check | High | `checkMessages()` | Use AJAX/GraphQL endpoints if available |
| No selective DOM updates | Medium | Message parsing | Parse only new messages |
| Hard-coded selectors | Medium | Multiple locations | Selector abstraction layer |
| No rate limiting | Low | Share operations | Add adaptive delays |

**Timing Analysis:**
```
Current: ~10-15 seconds per check
Optimized: ~3-5 seconds (with selective updates)
Potential improvement: 60-70%
```

---

### 4. kanban-sync.js

**Purpose:** Sync task data to Marvin Dashboard

**Current State:**
- Simple file read/write operations
- Low complexity
- Adequate performance

**Minor Improvements:**
- Add file watching for real-time sync
- Batch multiple updates
- Add debouncing for rapid changes

---

## General Recommendations

### 1. Create Shared Utilities (High Priority)

**Files to Create:**
- `lib/utils.js` - General utilities (✅ Created)
- `lib/browser-utils.js` - Browser automation helpers (✅ Created)
- `lib/config.js` - Configuration management (✅ Created)
- `lib/state.js` - State machine for workflows (✅ Created)

### 2. Implement Performance Monitoring

Add timing wrappers to track:
- Script execution time
- Individual operation latency
- Success/failure rates
- Bot detection triggers

### 3. Connection Pooling

For browser automation:
```javascript
// Create persistent browser pool
const browserPool = {
  maxSize: 3,
  browsers: [],
  queue: [],
  
  async acquire() { /* ... */ },
  async release(browser) { /* ... */ }
};
```

### 4. Parallel Processing Strategy

**Safe to parallelize:**
- Image fetching
- Data loading
- Independent API calls

**Must remain sequential:**
- HEB cart additions (bot detection)
- Facebook interactions (rate limiting)
- Email sends (SMTP limits)

---

## Implementation Priority

### Phase 1: Foundation (This session)
1. ✅ Create shared utility modules
2. ✅ Document performance findings
3. [ ] Create performance monitoring wrapper

### Phase 2: Quick Wins (Next session)
1. Parallel image fetching in email system
2. Smart caching improvements
3. Connection reuse for browsers

### Phase 3: Advanced Optimizations
1. Controlled parallelism for HEB (3-5 concurrent searches)
2. Browser connection pooling
3. AJAX-based Facebook checks

---

## Metrics to Track

After optimizations, monitor:
- Average execution time per script
- Success rate (target: >95%)
- Bot detection rate (target: <5%)
- Resource usage (memory, CPU)

---

*Audit completed: 11:15 PM CST, Feb 12, 2026*
