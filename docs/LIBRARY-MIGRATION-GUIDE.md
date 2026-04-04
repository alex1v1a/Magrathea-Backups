# Library Migration Guide

**Purpose:** Guide for migrating existing scripts to use new shared utilities

---

## Quick Start

Replace boilerplate in existing scripts:

### Before:
```javascript
const fs = require('fs').promises;
const path = require('path');

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

async function readJson(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}
```

### After:
```javascript
const { utils } = require('../lib');
const { randomDelay, readJson, logInfo } = utils;
```

---

## Migration Patterns

### 1. File Operations

**Before:**
```javascript
const data = JSON.parse(await fs.readFile('data.json', 'utf8'));
await fs.writeFile('data.json', JSON.stringify(data, null, 2));
```

**After:**
```javascript
const { readJson, writeJson } = require('../lib').utils;

const data = await readJson('data.json', {});
await writeJson('data.json', data);
```

### 2. Retry Logic

**Before:**
```javascript
for (let i = 0; i < 3; i++) {
  try {
    return await riskyOperation();
  } catch (e) {
    if (i === 2) throw e;
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
}
```

**After:**
```javascript
const { retryWithBackoff } = require('../lib').utils;

return await retryWithBackoff(riskyOperation, {
  maxRetries: 3,
  baseDelay: 1000,
  onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error.message}`)
});
```

### 3. Browser Connection

**Before:**
```javascript
const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
```

**After:**
```javascript
const { browser } = require('../lib');

const { browser: bw, context } = await browser.createBrowserContext({
  cdpEndpoint: 'http://localhost:9222'
});
```

### 4. Anti-Bot Patterns

**Before:**
```javascript
await page.evaluate(() => window.scrollBy(0, 300));
await new Promise(r => setTimeout(r, 2000));
```

**After:**
```javascript
const { browser } = require('../lib');

await browser.humanLikeScroll(page);
await browser.antiBotDelay('scroll');
```

### 5. Cart Verification

**Before:**
```javascript
const cartLink = await page.$('a[data-testid="cart-link"]');
const ariaLabel = await cartLink.getAttribute('aria-label');
const match = ariaLabel.match(/(\d+)\s+items?/);
const count = match ? parseInt(match[1]) : 0;
```

**After:**
```javascript
const { browser } = require('../lib');

const count = await browser.extractCartCount(page);
const increased = await browser.verifyCartIncrease(page, initialCount);
```

### 6. Configuration

**Before:**
```javascript
const CONFIG = {
  email: 'alex@1v1a.com',
  delay: 2000,
  retries: 3
};
```

**After:**
```javascript
const { config } = require('../lib');
const cfg = config.load();

const email = config.get(cfg, 'email.to');
const delay = config.get(cfg, 'automation.antiBot.minDelay');
```

### 7. State Management

**Before:**
```javascript
const state = JSON.parse(await fs.readFile('state.json', 'utf8'));
state.status = 'complete';
state.updatedAt = new Date().toISOString();
await fs.writeFile('state.json', JSON.stringify(state));
```

**After:**
```javascript
const { state } = require('../lib');
const sm = state.createDinnerPlanMachine();

await sm.init('pending');
await sm.transition('pending', 'sent', { emailId: '123' });
```

---

## Full Example: Refactored Script

### Before (heb-add-cart.js snippet):
```javascript
const { chromium } = require('playwright');
const fs = require('fs').promises;

const randomDelay = (min, max) => /* ... */;

async function getCartCount(page) {
  // 40 lines of selector logic
}

async function verifyCartIncreased(page, initialCount) {
  // 15 lines of retry logic
}
```

### After (refactored):
```javascript
const { browser, utils } = require('../lib');
const { logInfo, retryWithBackoff } = utils;

async function getCartCount(page) {
  return await browser.extractCartCount(page);
}

async function verifyCartIncreased(page, initialCount) {
  return await browser.verifyCartIncrease(page, initialCount);
}
```

**Lines reduced:** ~55 → ~5 (90% reduction)

---

## Benefits of Migration

1. **Consistency** - Same patterns across all scripts
2. **Maintainability** - Fix bugs in one place
3. **Testing** - Test utilities independently
4. **Documentation** - Self-documenting code
5. **Performance** - Optimized implementations

---

## Migration Checklist

For each script:
- [ ] Identify duplicated utility code
- [ ] Replace with library imports
- [ ] Test functionality unchanged
- [ ] Document any script-specific behavior
- [ ] Update comments

---

*Created during Self-Improvement Session, Feb 12-13 2026*
