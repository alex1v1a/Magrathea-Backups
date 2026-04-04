# HEB Shopping Helper Extension

## ⚠️ Important Notice

**HEB actively blocks browser automation.** Attempting to automatically add items to cart results in:
- "Ad blocker, antivirus, VPN, or firewall" error pages
- Non-functional "logged-out-add-to-cart" buttons
- IP blocking or rate limiting

This extension provides a **manual helper** instead of automation.

## What This Extension Does

1. **Load your shopping list** - Paste your meal plan JSON
2. **Track progress** - Check off items as you manually add them
3. **Search hints** - Shows what to search for each item

## How to Use

### Method 1: Using the Extension (Manual)

1. Click the extension icon
2. Paste your meal plan JSON
3. Load items
4. As you shop on HEB.com, check off items you've added

### Method 2: Using the Script (Semi-Automated)

The script `heb-add-cart.js` connects to your logged-in Chrome and can add items:

```bash
# Make sure shared Chrome is running
node dinner-automation/scripts/launch-shared-chrome.js

# Run the automation
node dinner-automation/scripts/heb-add-cart.js
```

Or double-click: `add-to-heb-cart.bat`

**Requirements:**
- Chrome must be running with debug port 9222
- You must be logged into HEB.com
- The script waits for you to login if needed

## Why Full Automation Doesn't Work

HEB uses sophisticated bot detection including:
- Webdriver property detection
- Automation flag checking
- Behavior analysis
- IP-based rate limiting

Even with:
- Puppeteer Stealth plugin
- Playwright with anti-detection
- Various bypass techniques

HEB still blocks automated requests.

## Working Solution

The only reliable method is:
1. Use shared Chrome with your logged-in session
2. Connect via CDP (Chrome DevTools Protocol)
3. Navigate and click as a "real" user would

This is implemented in `heb-add-cart.js`.

## Test Data

```json
{
  "items": [
    {"name": "Milk", "searchTerm": "whole milk", "amount": "1 gallon"},
    {"name": "Eggs", "searchTerm": "large eggs", "amount": "1 dozen"},
    {"name": "Bread", "searchTerm": "white bread", "amount": "1 loaf"}
  ]
}
```
