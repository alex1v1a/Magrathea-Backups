# HEB Cart Automation - Final Solution

## ⚠️ Reality Check

**Full browser automation of HEB is NOT possible.** HEB has extremely sophisticated bot detection that blocks all automation attempts, including:

- Chrome extensions (detected immediately)
- Playwright/Puppeteer with stealth plugins
- Anti-detection measures
- VPN/proxy bypass attempts

**Error you will see:**
> "This page could not load. It looks like an ad blocker, antivirus software, VPN, or firewall may be causing an issue."

## ✅ Working Solution

The **only reliable method** is using Playwright connected to your already logged-in Chrome session.

### Quick Start

**Double-click:** `add-to-heb-cart.bat`

Or manually:
```bash
# 1. Start shared Chrome (one time)
node dinner-automation/scripts/launch-shared-chrome.js

# 2. Login to HEB in the Chrome window

# 3. Run automation
node dinner-automation/scripts/heb-add-cart.js
```

### How It Works

1. **Shared Chrome** runs on debug port 9222
2. **Playwright connects** to this Chrome via CDP
3. **Uses your logged-in session** - appears as normal user activity
4. **Navigates and clicks** just like you would manually

### Files

| File | Purpose |
|------|---------|
| `add-to-heb-cart.bat` | One-click launcher |
| `dinner-automation/scripts/launch-shared-chrome.js` | Starts Chrome with debug port |
| `dinner-automation/scripts/heb-add-cart.js` | Main automation script |
| `dinner-automation/data/heb-extension-items.json` | Shopping list items |

### Extension (Manual Helper)

The Chrome extension has been converted to a **shopping list helper**:
- Load your meal plan items
- See what to search for
- Check off items as you add them manually
- No automation (HEB blocks it)

## Technical Details

### Why Extensions Don't Work

Content scripts injected into pages are easily detected by:
```javascript
// HEB can detect:
- window.chrome.runtime
- Content script isolation
- Non-standard event timing
- Missing human behavior patterns
```

### Why Playwright Direct Works

When connecting to existing Chrome:
- Uses real browser profile with cookies
- Authenticated session already established
- Appears as normal user navigation
- No "webdriver" flags

### HEB's Detection Methods

1. **Navigator properties:** Checks for `navigator.webdriver`
2. **Window properties:** Looks for `window.chrome.runtime`
3. **Behavioral analysis:** Timing of clicks, mouse movements
4. **Request fingerprinting:** Headers, TLS signature
5. **IP reputation:** Blocks known VPS/datacenter IPs

### Tested Approaches (All Failed)

| Approach | Result |
|----------|--------|
| Chrome Extension | ❌ Detected immediately |
| Playwright anti-detection | ❌ Blocked |
| Puppeteer Stealth | ❌ Blocked |
| Custom CDP scripts | ❌ Blocked without existing session |
| VPN/Proxy rotation | ❌ IP-based blocking |

## Recommendation

**Use the Playwright script** (`heb-add-cart.js`) for bulk adding items.

**Use the extension** as a shopping list tracker for manual shopping.

Both are provided in this solution.
