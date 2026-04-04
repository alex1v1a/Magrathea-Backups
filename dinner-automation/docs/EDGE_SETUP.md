# Microsoft Edge for Dinner Automation

## Overview

**All dinner automation tasks use Microsoft Edge exclusively.**

Chrome was causing issues with profile conflicts and HEB bot detection. Edge provides a cleaner, more reliable automation environment.

---

## Why Edge?

| Issue with Chrome | Edge Solution |
|-------------------|---------------|
| Profile lock conflicts | Clean single profile |
| HEB bot detection | Edge bypasses detection when logged in |
| Multiple Chrome instances | One Edge instance for all tasks |
| Debug port crashes | Stable CDP connection |

---

## Edge Configuration

### Browser Path
```
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

### Debug Port
- **Primary:** 9222 (for all automation)
- **Secondary:** 9223 (for meal plan updates)

### Launch Commands

```bash
# Launch Edge with debugging enabled
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222

# Or use the batch file
dinner-automation/data/launch-edge.bat
```

---

## Scripts Using Edge

| Script | Purpose | Edge Usage |
|--------|---------|------------|
| `heb-extension/*` | Browser extension | Runs in Edge |
| `update-heb-meal-plan.js` | Update meal plan | Connects to Edge via CDP |
| `heb-add-items.js` | Add items to cart | Uses Edge instance |
| `heb-complete.js` | Full cart automation | Uses Edge instance |

---

## HEB Extension (Edge)

The HEB Auto Shopper extension runs exclusively in Microsoft Edge:

### Installation
1. Open Edge → `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `dinner-automation/heb-extension/`

### Features
- ✅ Auto-sync every 30 minutes
- ✅ Adds missing items from meal plan
- ✅ Removes items not in meal plan
- ✅ Runs in your logged-in session

### Extension Files
```
dinner-automation/heb-extension/
├── manifest.json      # Extension config
├── background.js      # Auto-sync logic
├── popup.html         # User interface
├── popup.js           # UI functionality
└── icons/             # Extension icons
```

---

## Playwright + Edge

Scripts that need browser control use Edge via Playwright:

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
  headless: false,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--remote-debugging-port=9222']
});
```

---

## Chrome Status

**Chrome is NOT used for dinner automation.**

Chrome is reserved for:
- Facebook Marketplace (separate profile)
- Other non-HEB automation tasks

This separation prevents:
- Profile conflicts
- Cookie/session mixing
- Bot detection triggers

---

## Troubleshooting

### Edge won't launch with debug port
```bash
# Kill existing Edge processes
taskkill /F /IM msedge.exe

# Try again
node dinner-automation/scripts/launch-edge.js
```

### Extension not working
1. Check Edge is logged into HEB
2. Reload extension at `edge://extensions/`
3. Verify auto-sync toggle is ON

### Playwright can't find Edge
```bash
# Verify Edge path
ls "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# If different, update script paths
```

---

## Quick Commands

```bash
# Launch Edge for automation
cd dinner-automation
node scripts/launch-edge.js

# Update HEB meal plan via Edge
node scripts/update-heb-meal-plan.js

# Check Edge is running
netstat -an | findstr 9222
```

---

**Last Updated:** February 10, 2026  
**Primary Browser:** Microsoft Edge  
**Status:** ✅ All dinner automation uses Edge
