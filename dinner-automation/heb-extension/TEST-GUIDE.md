# HEB Auto-Cart v3.0 - Test & Debug Guide

## 🚀 Quick Start

### 1. Reload Extension
1. Go to `chrome://extensions/`
2. Find "HEB Auto-Cart"
3. Click 🔄 reload icon

### 2. Sign In to HEB
1. Navigate to https://www.heb.com
2. Click "Sign In" (top right)
3. Enter your HEB credentials
4. **Verify**: Your name should appear in top right corner

### 3. Test Login Detection
In Chrome DevTools console (F12), paste:

```javascript
// Test login detection
(async function testLogin() {
  const checks = {
    accountMenu: !!document.querySelector('[data-testid="account-menu"]'),
    noSignIn: !document.querySelector('a[href*="/login"]'),
    realButtons: document.querySelectorAll('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])').length,
    loggedOutButtons: document.querySelectorAll('button[data-testid*="logged-out-add-to-cart"]').length
  };
  
  console.log('Login Detection Results:');
  console.log(JSON.stringify(checks, null, 2));
  
  const isLoggedIn = checks.accountMenu && checks.noSignIn || checks.realButtons > 0;
  console.log(`\n${isLoggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN'}`);
})();
```

### 4. Test Manual Add

```javascript
// Test clicking a button manually
(function testClick() {
  // Find first add button
  const btn = document.querySelector('button[data-testid*="add-to-cart"]');
  if (!btn) {
    console.log('❌ No add button found');
    return;
  }
  
  console.log('Button found:', btn.textContent.trim());
  console.log('data-testid:', btn.getAttribute('data-testid'));
  
  // Scroll and click
  btn.scrollIntoView({ block: 'center' });
  btn.click();
  btn.style.outline = '5px solid lime';
  
  console.log('✅ Clicked! Check cart.');
})();
```

## 🧪 Full Extension Test

### Test Items JSON

```json
{
  "items": [
    {"name": "Milk", "searchTerm": "whole milk", "amount": "1 gallon"},
    {"name": "Eggs", "searchTerm": "large eggs", "amount": "1 dozen"},
    {"name": "Bread", "searchTerm": "white bread", "amount": "1 loaf"}
  ]
}
```

### Expected Behavior

1. **Click Extension Icon**
   - Popup opens with input field
   - Version shows "v3.0 - Production Ready"

2. **Load Items**
   - Paste test JSON
   - Click "📥 Load Items"
   - Should show "✅ Loaded 3 items!"

3. **Start Automation**
   - Click "🚀 Start Adding Items"
   - Progress bar appears
   - Status updates: "Adding: Milk", then "Adding: Eggs", etc.
   - Items get green outline when clicked
   - Console shows detailed logs

4. **Verify**
   - Check HEB cart (top right)
   - Count should increase
   - Items should be in cart

## 🔧 Troubleshooting

### "Not logged in" but I am logged in

**Cause**: HEB shows different button types based on page

**Fix**: 
1. Refresh page (F5)
2. Navigate to a product page
3. Try again

### "Extension not loaded on page"

**Cause**: Content script not injected

**Fix**:
1. Reload extension at `chrome://extensions/`
2. Refresh heb.com page
3. Try again

### Buttons not being clicked

**Debug**:
```javascript
// Check if buttons exist
const buttons = document.querySelectorAll('button[data-testid*="add-to-cart"]');
console.log('Found buttons:', buttons.length);

// Try clicking first one
if (buttons[0]) {
  buttons[0].scrollIntoView({ block: 'center' });
  setTimeout(() => buttons[0].click(), 500);
}
```

### Cart not updating

**Note**: HEB cart updates may be delayed. Check cart manually after automation completes.

## 📊 Console Logging

The extension logs detailed information:

```
🛒 HEB Auto-Cart v3.0 initialized
ℹ️ [HEB Auto-Cart] Ready! Waiting for commands...
ℹ️ [HEB Auto-Cart] Received message: startAutomation
ℹ️ [HEB Auto-Cart] Checking login status...
🔍 [HEB Auto-Cart] Login detection results:
🔍 [HEB Auto-Cart]   - Real add buttons: 5
🔍 [HEB Auto-Cart]   - Account menu: true
🔍 [HEB Auto-Cart]   - No sign-in button: true
✅ [HEB Auto-Cart] Logged in confirmed (via: account-menu)
ℹ️ [HEB Auto-Cart] Searching for: "whole milk"
ℹ️ [HEB Auto-Cart] Found button using strategy 1
ℹ️ [HEB Auto-Cart] Button: "Add to cart" (data-testid: add-to-cart)
🔍 [HEB Auto-Cart] Simulating human-like click...
✅ [HEB Auto-Cart] Item verified in cart!
```

## 🎯 Advanced Testing

### Test with Real Meal Plan

Use your actual `weekly-plan.json`:

1. Open `dinner-automation/data/weekly-plan.json`
2. Copy contents
3. Paste in extension
4. Click Load Items
5. Start automation

### Stress Test

Try with 10+ items to ensure reliability:

```json
{
  "items": [
    {"name": "Item 1", "searchTerm": "item 1", "amount": "1"},
    {"name": "Item 2", "searchTerm": "item 2", "amount": "1"},
    ...
  ]
}
```

### Network Throttling

Test with slow connection:
1. DevTools → Network tab
2. Set to "Slow 3G"
3. Run automation
4. Should still work with longer waits

## 🐛 Report Issues

If something doesn't work:

1. Open DevTools console (F12)
2. Clear console
3. Run automation
4. Copy all console output
5. Note: What you expected vs what happened

## ✨ Features

### v3.0 Improvements

- ✅ **Robust login detection** - Multiple methods, detailed logging
- ✅ **Mutation observers** - Waits for dynamic content
- ✅ **Human-like clicks** - Mouse events, pointer events, scrolling
- ✅ **Item verification** - Checks cart count after each add
- ✅ **Auto-retry** - 3 attempts per item with delays
- ✅ **Visual feedback** - Green outlines, progress bar
- ✅ **Error handling** - Graceful failures, continues on errors
- ✅ **SPA support** - Handles React navigation

## 📁 Files

```
dinner-automation/heb-extension/
├── manifest.json       # Extension config
├── content.js          # Main automation logic (v3.0)
├── popup.html          # UI layout
├── popup.js            # UI logic
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── TEST-GUIDE.md       # This file
```

## 🎓 How It Works

1. **Content Script** runs on heb.com
2. **Popup** sends commands via `chrome.runtime.sendMessage`
3. **Content Script** performs automation:
   - Detects login
   - Searches for items
   - Finds Add to Cart buttons
   - Simulates human clicks
   - Verifies cart updated
4. **Popup** shows progress in real-time

## 🔐 Security

- Only runs on heb.com
- No external network requests
- Local storage only
- User must be logged in
