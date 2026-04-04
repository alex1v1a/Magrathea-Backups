# HEB Auto Shopper Extension v3.0 - Installation Guide

## What's New in v3.0

✅ **Automatic Sync** - Extension automatically syncs your cart every 30 minutes  
✅ **Bidirectional Sync** - Adds new items AND removes items no longer in meal plan  
✅ **Meal Plan Management** - Edit your meal plan directly in the extension  
✅ **Auto-Sync Toggle** - Enable/disable automatic synchronization  
✅ **Manual Sync** - Trigger sync immediately when needed

## Installation Steps

### 1. Install the Extension

1. **Open Edge** and go to `edge://extensions/`

2. **Enable Developer Mode**
   - Toggle "Developer mode" ON (top right)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select this folder: `dinner-automation/heb-extension`
   - The extension icon (🛒) should appear in your toolbar

4. **Pin the Extension** (recommended)
   - Click the puzzle piece icon in Edge toolbar
   - Click the pin next to "HEB Auto Shopper"

### 2. Initial Setup

1. **Go to heb.com** and login to your account

2. **Click the extension icon** to open the popup

3. **Click "Load Default"** to load the 31-item meal plan (or add your own items)

4. **Enable Auto-Sync** (toggle should be green)

### 3. How to Use

#### Automatic Mode (Recommended)
- Extension checks every 30 minutes
- Compares meal plan with cart
- Adds new items, removes items not in meal plan
- Runs in background - no action needed

#### Manual Sync
- Click extension icon
- Click "Sync Now"
- Extension opens HEB in background tab
- Adds/removes items automatically
- Opens cart when complete

#### Edit Meal Plan
- Click extension icon
- Go to "Meal Plan" tab
- Add items: Type name and click "Add"
- Remove items: Click × next to item
- Load default: Click "Load Default" button
- Clear all: Click "Clear All" button

### 4. How Sync Works

**When sync runs:**
1. Opens HEB.com (or uses existing tab)
2. Checks if logged in (stops if not)
3. Gets current cart items
4. Compares with meal plan
5. **Removes** items in cart but not in meal plan
6. **Adds** items in meal plan but not in cart
7. Updates last sync time

**Example:**
- Meal plan: Chicken, Rice, Broccoli
- Cart: Chicken, Rice, Pasta, Sauce
- After sync: Cart has Chicken, Rice, Broccoli (Pasta and Sauce removed)

### 5. Integration with Dinner Automation

The extension can be updated automatically from your weekly dinner plan:

```bash
cd dinner-automation/scripts
node update-heb-meal-plan.js
```

This will:
- Read the weekly dinner plan
- Extract all ingredients
- Update the extension's meal plan
- Extension will sync on next run

## Troubleshooting

### Extension says "Not logged in" but I am
- Refresh the HEB page
- Click extension icon again
- Try manual sync anyway (it may work)

### Items not being added
- Check if item is already in cart
- Try searching the item manually on HEB
- Some items may not be available

### Sync not running automatically
- Check Auto-Sync toggle is ON (green)
- Check that extension has permission to run in background
- Try manual sync to verify it works

### Extension won't load
- Make sure "Developer mode" is ON
- Check that you selected the correct folder
- Look for red error messages on extensions page

## File Structure

```
heb-extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker (auto-sync logic)
├── popup.html         # Extension popup UI
├── popup.js           # Popup functionality
├── external-api.js    # API for external scripts
├── icons/             # Extension icons
└── INSTALL.md         # This file
```

## Updating the Extension

After making changes to the code:

1. Go to `edge://extensions/`
2. Find "HEB Auto Shopper"
3. Click the 🔄 reload icon
4. Changes take effect immediately

## Uninstalling

1. Go to `edge://extensions/`
2. Find "HEB Auto Shopper"
3. Click "Remove"

---

**Version:** 3.0.0  
**Last Updated:** February 2026  
**Features:** Auto-sync, bidirectional sync, meal plan management
