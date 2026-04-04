# HEB Auto-Cart Browser Automation

This directory contains browser automation scripts for automatically adding dinner plan ingredients to the HEB cart.

## Overview

The automation uses Playwright to control Chrome and interact with the HEB website. It can:

1. Log into HEB.com automatically
2. Search for each ingredient
3. Add items to cart
4. Report success/failure with screenshots

## Scripts

### auto-heb-cart.js
Main standalone script for running cart automation.

```bash
# Run with default plan (data/weekly-plan.json)
node scripts/auto-heb-cart.js

# Run with custom plan
node scripts/auto-heb-cart.js --plan /path/to/plan.json

# Run with visible browser (for debugging)
node scripts/auto-heb-cart.js --headed

# Show help
node scripts/auto-heb-cart.js --help
```

### heb-cart-automation.js
Integration module used by the weekly automation. Provides:

- `addItemsToHEBCart(plan, options)` - Main automation function
- `hasHEBCredentials()` - Check if credentials are available
- `generateShoppingList(plan)` - Fallback manual list generator

## Setup

### 1. Install Dependencies

```bash
cd dinner-automation
npm install
```

### 2. Set Credentials

Add to your `.env` file or environment:

```bash
# Required for automation
HEB_EMAIL=alex@1v1a.com          # Your HEB.com email
HEB_PASSWORD=your_heb_password   # Your HEB.com password
```

### 3. Verify Setup

```bash
# Check credentials
node scripts/credentials.js --check

# Test cart automation (headed mode for visibility)
node scripts/heb-cart-automation.js --headed
```

## How It Works

### Integration with Weekly Automation

The weekly dinner automation (`dinner-automation.js`) now automatically tries browser automation first:

1. If `HEB_PASSWORD` is set → Attempt browser automation
2. If automation succeeds → Cart populated automatically
3. If automation fails → Falls back to shareable list
4. If no credentials → Always uses shareable list

### Direct Usage

For manual runs or testing:

```bash
# Quick automation run
node scripts/auto-heb-cart.js

# With specific plan
node scripts/auto-heb-cart.js --plan data/weekly-plan.json
```

## Security

- Credentials are never stored in code
- Passwords come from environment variables only
- Screenshots on error help debug without exposing credentials
- Browser runs in isolated context

## Troubleshooting

### "HEB_PASSWORD not set"
```bash
export HEB_PASSWORD=your_password
# Or add to .env file
```

### "Login failed"
- Verify credentials at heb.com
- Check if 2FA is enabled (automation doesn't handle 2FA)
- Try headed mode to see what's happening:
  ```bash
  node scripts/auto-heb-cart.js --headed
  ```

### "Add to Cart button not found"
- HEB may have changed their website layout
- Check screenshots in `data/heb-error-*.png`
- Update selectors in `heb-cart-automation.js`

### Stuck or slow
- Each item takes ~5-7 seconds (rate limiting)
- Full cart of 30 items takes ~3-4 minutes
- Browser automation is intentionally throttled to avoid detection

## Extension Integration

The original Chrome extension (`heb-extension/`) provides a UI for manual runs. The browser automation scripts can work with or without the extension:

- **Direct mode** (default): Uses Playwright to control Chrome directly
- **Extension mode**: Can load extension and use its popup (see `auto-heb-cart.js`)

## Files

| File | Purpose |
|------|---------|
| `auto-heb-cart.js` | Standalone automation script |
| `heb-cart-automation.js` | Integration module for weekly automation |
| `credentials.js` | Secure credential management |
| `../data/heb-cart-results.json` | Automation results |
| `../data/heb-cart-final.png` | Final cart screenshot |
| `../data/heb-error-*.png` | Error screenshots |

## Future Enhancements

- [ ] Handle HEB 2FA if enabled
- [ ] Retry failed items automatically
- [ ] Schedule automation for specific times
- [ ] Cart verification (check if items already in cart)
- [ ] Price tracking and alerts
