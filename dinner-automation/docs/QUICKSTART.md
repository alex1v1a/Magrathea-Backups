# HEB Cart Automation - Quick Start Guide

## Recommended Approach: Enhanced Browser Extension + Bridge

This is the **fastest path** to working HEB automation. It injects an API directly into HEB.com pages and exposes a local HTTP API you can call from any script.

### Prerequisites

1. **Microsoft Edge** installed
2. **Node.js** installed
3. Extension loaded in Edge (developer mode)

### Step 1: Load the Extension

1. Open Edge and go to `edge://extensions/`
2. Enable "Developer mode" (toggle in bottom left)
3. Click "Load unpacked"
4. Select `dinner-automation/heb-extension/` folder
5. The HEB Auto Shopper extension should appear

### Step 2: Install Bridge Dependencies

```bash
cd dinner-automation
npm install express puppeteer-core
```

Or if you have a package.json:
```bash
npm install
```

### Step 3: Launch Edge with Remote Debugging

**Option A: Using launch script**
```bash
# If you have the launch script
node scripts/launch-edge.js
```

**Option B: Manual launch**
```bash
# Windows
start msedge --remote-debugging-port=9222

# Or create a shortcut with target:
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222
```

### Step 4: Navigate to HEB and Login

1. Go to `https://www.heb.com`
2. Login with your credentials
3. Keep this tab open

### Step 5: Start the Bridge

```bash
node heb-bridge.js
```

You should see:
```
🔌 Connecting to browser...
✅ Connected to browser
📄 Found existing HEB tab
🔧 Checking API initialization...
✅ API already initialized
🚀 HEB Bridge API running on http://localhost:8765
```

### Step 6: Test the API

**Test health:**
```bash
curl http://localhost:8765/health
```

**Get cart:**
```bash
curl http://localhost:8765/api/cart
```

**Add an item:**
```bash
curl -X POST http://localhost:8765/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"items": [{"searchTerm": "milk", "quantity": 1}]}'
```

**Sync meal plan:**
```bash
curl -X POST http://localhost:8765/api/cart/sync \
  -H "Content-Type: application/json" \
  -d @meal_plan.json
```

Where `meal_plan.json` looks like:
```json
{
  "items": [
    {"searchTerm": "whole milk", "quantity": 1},
    {"searchTerm": "large eggs", "quantity": 1},
    {"searchTerm": "bread", "quantity": 1}
  ]
}
```

### Step 7: Run Test Script

```bash
node test-bridge.js
```

---

## Alternative: Python + Selenium with Undetected Chrome

If the extension approach doesn't work, try Python with undetected-chromedriver.

### Installation

```bash
pip install -r requirements.txt
```

### Usage

```bash
# Quick test
python heb_selenium.py --test

# Sync meal plan
python heb_selenium.py --meal-plan meal_plan.json

# Headless mode (may be detected)
python heb_selenium.py --headless
```

---

## Troubleshooting

### "Bridge not responding"
- Make sure Edge is running with `--remote-debugging-port=9222`
- Check that `http://localhost:9222` is accessible
- Try refreshing the HEB tab

### "HEB Cart API not initialized"
- Check extension is loaded in `edge://extensions/`
- Refresh the HEB page
- Check browser console for errors

### "Add to cart button not found"
- HEB may have changed their HTML structure
- Update selectors in `content-script-api.js`
- Check what selectors exist with browser DevTools

### Items not adding
- Make sure you're logged into HEB
- Check if HEB is showing CAPTCHA or verification
- Try adding delays between actions

---

## API Reference

### POST /api/command
Send arbitrary commands to the HEB page.

```json
{
  "command": "search",
  "payload": { "term": "milk" }
}
```

Commands available:
- `ping` - Test connectivity
- `search` - Search for products
- `addToCart` - Add item to cart
- `getCart` - Get cart contents
- `removeFromCart` - Remove specific item
- `clearCart` - Empty cart
- `getPageInfo` - Get current page state

### POST /api/cart/sync
Sync a meal plan to cart.

```json
{
  "items": [
    {"searchTerm": "milk", "quantity": 1},
    {"searchTerm": "eggs", "quantity": 2}
  ],
  "clearFirst": false
}
```

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Your Script    │────▶│  HEB Bridge      │────▶│  Edge Browser   │
│  (curl/Node)    │     │  (Node.js)       │     │  (CDP Port 9222)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               │                           │
                               ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  REST API        │     │  Content Script │
                        │  Port 8765       │     │  (injected)     │
                        └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────────┐
                                                   │  HEB.com        │
                                                   │  (real browser) │
                                                   └─────────────────┘
```

---

## Next Steps

1. **Test the extension approach** (should work immediately)
2. If blocked, try **Selenium undetected-chromedriver**
3. If both fail, investigate **mobile app API** reverse engineering

See `docs/HEB_ALTERNATIVE_APPROACHES.md` for detailed analysis of all approaches.
