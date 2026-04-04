# Chrome Controller - DISABLED

**Status:** DISABLED - DO NOT RUN

## Why Disabled

The chrome-controller.js was causing Chrome to crash repeatedly by:
1. Launching Chrome in a rapid-fire restart loop (100+ times per minute)
2. Multiple overlapping health checks spawning conflicting processes
3. Profile lock conflicts causing immediate crashes

## Solution

All automation now uses **Microsoft Edge** instead of Chrome:
- `facebook-marketplace-edge.js` — F-150 monitoring/sharing
- `heb-cart-edge.js` — Grocery cart automation
- `sync-dinner-to-icloud.js` — Calendar sync

## Edge Benefits
- No profile lock conflicts
- Better Playwright integration
- More reliable session persistence
- No chrome-controller needed

## If You See Chrome Crashes

1. Check Task Manager for `node.exe` processes running chrome-controller
2. Kill them: `taskkill /F /IM node.exe` (if safe)
3. Verify no cron jobs reference chrome-controller

## Re-enable (Not Recommended)

Only if absolutely necessary:
1. Fix the restart loop logic in chrome-controller.js
2. Add proper delays between restart attempts
3. Add file locking to prevent multiple instances
4. Test thoroughly before re-enabling

---
Disabled: 2026-02-10 by Marvin
