# Anti-Bot Automation Playbook

## Lessons Learned (Apply to ALL sites with bot detection)

### Core Principles

**1. VERIFY ACTIONS SUCCEEDED (Most Critical)**
- ❌ NEVER trust "click succeeded" means action completed
- ✅ ALWAYS verify state changed (cart count, page content, etc.)
- Example: Check cart count before/after, verify increase
- Retry 2-3 times if verification fails

**2. RANDOM DELAYS (Critical)**
- ❌ NEVER use fixed intervals like `sleep(2000)`
- ✅ ALWAYS use random delays: `randomDelay(3000, 8000)`
- Vary delays between 3-8 seconds for actions, 10-15 seconds between batches

**2. LONGER PAUSES**
- Wait 4-7 seconds for pages to load (not 2-3)
- 1-2 second pause before clicking
- 10-15 second breaks between batch groups

**3. HUMAN-LIKE BEHAVIOR**
```javascript
// Random scroll amounts
const scrollAmount = Math.floor(Math.random() * 300) + 100;

// Variable click delays (100-400ms)
const clickDelay = Math.floor(Math.random() * 300) + 100;
await button.click({ delay: clickDelay });

// Random mouse movements (if supported)
```

**4. SESSION WARMUP**
- Visit homepage first
- Random scroll (100-400px)
- Wait 3-5 seconds before starting automation
- Don't jump directly to search URLs

**5. BATCH PROCESSING**
- Process items in groups of 5-10 (not all 42 at once)
- Long pause (10-15s) between batches
- This mimics natural shopping behavior

**6. NAVIGATION FLOW**
- Don't start with search URLs
- Navigate to homepage → browse → search
- Use natural navigation patterns

**7. ERROR RECOVERY**
- Continue on individual failures
- Log errors but don't stop entire batch
- Retry with exponential backoff if needed

---

## Reusable Template

```javascript
const { chromium } = require('playwright');

// === ANTI-BOT UTILITIES ===

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

async function humanLikeScroll(page) {
  const scrollAmount = Math.floor(Math.random() * 300) + 100;
  await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
  await randomDelay(500, 1200);
}

async function sessionWarmup(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await randomDelay(3000, 5000);
  await humanLikeScroll(page);
  await randomDelay(2000, 4000);
}

async function staggeredBatch(items, batchSize, processFn) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
    
    for (const item of batch) {
      const result = await processFn(item);
      results.push(result);
      await randomDelay(3000, 8000); // Between items
    }
    
    // Pause between batches
    if (i + batchSize < items.length) {
      const pause = Math.floor(Math.random() * 6) + 10;
      console.log(`Pausing ${pause}s...`);
      await randomDelay(pause * 1000, pause * 1000 + 2000);
    }
  }
  
  return results;
}

// === VERIFICATION UTILITIES ===

async function getCartCount(page) {
  // Check cart count via page evaluation
  const count = await page.evaluate(() => {
    const badge = document.querySelector('[data-testid="cart-badge"]');
    return badge ? parseInt(badge.textContent) || 0 : 0;
  });
  return count;
}

async function verifyCartIncreased(page, initialCount, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    await randomDelay(2000, 4000);
    const newCount = await getCartCount(page);
    if (newCount > initialCount) return { success: true, newCount };
    console.log(`Verification retry ${i + 1}/${maxRetries}...`);
  }
  return { success: false };
}

// === MAIN AUTOMATION ===

async function runAutomation(items) {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  
  // Warmup
  await sessionWarmup(page, 'https://example.com');
  
  // Process in batches WITH VERIFICATION
  await staggeredBatch(items, 5, async (item) => {
    const countBefore = await getCartCount(page);
    
    // Your action here
    await randomDelay(1000, 2000);
    // ... click add button ...
    
    // VERIFY the action worked
    const verification = await verifyCartIncreased(page, countBefore, 3);
    if (verification.success) {
      console.log(`✅ Verified: ${countBefore} → ${verification.newCount}`);
    } else {
      console.log(`❌ Failed verification`);
    }
    
    await randomDelay(3000, 8000);
  });
  
  await browser.close();
}
```

---

## Site-Specific Notes

### HEB
- Detection: Aggressive Incapsula protection
- Working approach: Chrome extension or very slow automation with Marvin profile
- Batch size: 5 items with 10-15s pauses
- Session warmup: Required

### Facebook Marketplace
- Detection: Bot detection on rapid actions
- Working approach: Single Chrome instance, shared sessions
- Batch size: 3-5 group shares per hour
- Session warmup: Login via Edge, persistent profile

### General Pattern
1. Detect bot block (ERR_ABORTED, timeouts, CAPTCHA)
2. Apply anti-bot techniques:
   - Increase delays
   - Add randomization
   - Reduce batch size
   - Add session warmup
3. Retry with exponential backoff
4. Fall back to manual if automation fails

---

## Quick Reference

| Action | Fixed (Bad) | Random (Good) |
|--------|-------------|---------------|
| Page load wait | `sleep(2000)` | `randomDelay(4000, 7000)` |
| Between clicks | `sleep(1000)` | `randomDelay(1000, 2000)` |
| Between items | `sleep(2000)` | `randomDelay(3000, 8000)` |
| Between batches | None | `randomDelay(10000, 15000)` |
| Click delay | `click({delay: 100})` | `click({delay: random(100,400)})` |
| Scroll | `scroll(200)` | `scroll(random(100,400))` |

---

**Apply this pattern to ALL future bot detection issues automatically.**
