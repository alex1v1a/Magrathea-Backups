# HEB Automation - Pre-Production Test Checklist

## Pre-Run Setup
- [ ] Verify HEB.com account credentials are set in `.env` file (HEB_EMAIL, HEB_PASSWORD)
- [ ] Ensure HEB account has an active cart/address configured
- [ ] Close any existing Chrome browser windows (prevents port conflicts)
- [ ] Verify stable internet connection

## Script Verification
- [ ] Weekly plan has meals: **5 meals loaded** ✅
- [ ] Total unique ingredients: **30 items to add** ✅
- [ ] Playwright is installed: **v1.58.2** ✅

## Manual Test Steps
1. [ ] Open terminal in `dinner-automation` folder
2. [ ] Run: `node scripts/heb-direct-automation.js`
3. [ ] Wait for browser to open and navigate to HEB.com
4. [ ] If not logged in:
   - [ ] Log in manually with HEB credentials
   - [ ] Wait for the 60-second countdown to complete
5. [ ] Monitor the batch processing:
   - [ ] Should process 10 batches of 3 items each (30 total)
   - [ ] Expected: ~4.5s per item (vs 18s in original)
   - [ ] Total estimated time: ~2-3 minutes
6. [ ] Verify results:
   - [ ] Check console output for success/failure counts
   - [ ] Log in to HEB.com in another browser tab
   - [ ] Verify items were added to cart
7. [ ] Close browser when complete (Ctrl+C in terminal)

## Success Criteria
- [ ] All 30 items processed without fatal errors
- [ ] Success rate >= 80% (24+ items added)
- [ ] No browser crashes or hangs
- [ ] Average time per item < 6 seconds

## Known Limitations
- HEADLESS is set to `false` (browser visible) - set to `true` for true production
- Manual login may be required on first run
- Some items may fail if HEB search returns no results
- Rate limiting protection: 3 concurrent items with delays between batches

## Post-Test Actions
- [ ] Review failed items (if any) in console output
- [ ] Manually add failed items via HEB.com if needed
- [ ] Consider adjusting selectors if HEB.com UI changes
- [ ] Set `CONFIG.HEADLESS = true` for production automation

## Rollback Plan
If automation fails catastrophically:
1. Close browser window
2. Clear HEB cart manually if partially filled
3. Use original `auto-heb-cart.js` as fallback: `npm run heb:cart`
