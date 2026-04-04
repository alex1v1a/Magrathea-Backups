# HEB Session Warming Guide

## Problem
HEB detects automation because sessions appear instantly with no browsing history. This triggers CAPTCHA challenges when attempting cart operations.

## Solution
Build session trust gradually through realistic browsing patterns over multiple sessions.

---

## Usage

### Multi-Day Approach (Recommended)

**Day 1 - Browse Phase:**
```bash
node dinner-automation/scripts/heb-cart-session.js --phase=1
```
- Visits HEB homepage
- Browses 3-5 categories (produce, meat, bakery, dairy, frozen)
- Views 5-10 products (10-20 seconds each)
- **NO cart actions**
- Saves cookies to `heb-session-phase1.json`

**Day 2 - Search Phase:**
```bash
node dinner-automation/scripts/heb-cart-session.js --phase=2
```
- Restores cookies from Day 1
- Performs 3-5 searches (chicken, pasta, milk, bread, eggs, etc.)
- Views search results (15-30 seconds)
- **NO cart actions**
- Saves cookies to `heb-session-phase2.json`

**Day 3 - Cart Test:**
```bash
node dinner-automation/scripts/heb-cart-session.js --phase=3
```
- Restores fully warmed cookies
- Attempts cart additions
- Monitors for CAPTCHA
- Reports success/failure

### Same-Day Alternative (Less Effective)

```bash
node dinner-automation/scripts/heb-cart-session.js --warm-same-day
```
- Visit site, wait 30 seconds
- Browse categories for 2 minutes
- Return to dashboard for 5 minutes
- Then attempt cart

### Full Automation

```bash
# Run all phases sequentially
node dinner-automation/scripts/heb-cart-session.js --full-warming

# Add items using warmed session
node dinner-automation/scripts/heb-cart-session.js --add-items
```

---

## Session State Files

| File | Description |
|------|-------------|
| `data/cookies/heb-session-phase1.json` | After Day 1 browsing |
| `data/cookies/heb-session-phase2.json` | After Day 2 searching |
| `data/cookies/heb-session-warmed.json` | Fully warmed session |
| `data/cookies/heb-session-current.json` | Most recent session |
| `data/screenshots/*.png` | Debug screenshots |

---

## Expected Results

### Success Indicators
- No CAPTCHA on homepage visit
- No CAPTCHA during searches
- No CAPTCHA during cart additions
- Cart updates successfully

### Failure Indicators
- CAPTCHA appears immediately
- CAPTCHA during search
- CAPTCHA after clicking "Add to Cart"

### What to Do If CAPTCHA Appears
1. Complete CAPTCHA manually
2. Let script finish
3. Wait 24-48 hours before trying again
4. Try same-day warming instead

---

## Technical Details

### Anti-Detection Measures
- Random delays between 3-7 seconds (all actions)
- Realistic mouse movements (human-like)
- Slow typing with variable delays
- Page scrolling before interactions
- Cookie persistence across sessions
- Realistic user agent and headers

### Cookie Persistence
```javascript
// Save cookies
await context.storageState({ path: 'heb-cookies.json' });

// Load cookies
await browser.newContext({ storageState: 'heb-cookies.json' });
```

---

## Monitoring

The script automatically:
- Detects CAPTCHA challenges
- Takes screenshots of errors
- Logs all actions with timestamps
- Reports success/failure rates

---

## Integration with Cart Automation

After successful warming, use the warmed session:

```javascript
const { chromium } = require('playwright');

async function addToCartWithWarmedSession(items) {
  const browser = await chromium.launchPersistentContext(
    'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data',
    {
      storageState: 'dinner-automation/data/cookies/heb-session-warmed.json',
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: false
    }
  );
  
  const page = browser.pages()[0];
  // Proceed with cart operations...
}
```
