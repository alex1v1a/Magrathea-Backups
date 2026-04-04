# Troubleshooting Guide

> **Common issues and fixes for the Marvin Automation Framework**

---

## 🔍 Quick Diagnostics

Run these status checks to identify issues:

```bash
# Check all system statuses
node dinner-automation/scripts/dinner-email-system-v2.js --status
node dinner-automation/scripts/heb-add-cart.js --status
node dinner-automation/scripts/launch-shared-chrome.js --status
```

---

## 🛒 HEB Cart Issues

### Issue: "This page could not load" / Bot Detection

**Symptoms:**
- HEB shows error about ad blockers/VPNs
- Page loads but immediately redirects to error
- Incapsula protection triggered

**Root Cause:** HEB detected automation patterns

**Fix:**
1. ✅ Use **Microsoft Edge** (not Chrome) for HEB
2. ✅ Connect via CDP to existing logged-in session
3. ✅ Use branded product names ("H-E-B Basmati Rice" not "basmati rice")
4. ✅ Add random delays between actions
5. ✅ Process items in batches of 5 with 10-15s pauses

```bash
# Correct approach
node dinner-automation/scripts/launch-shared-chrome.js  # Launches Edge
# Login to HEB manually
node dinner-automation/scripts/heb-add-cart.js
```

**See Also:** [HEB_SOLUTION.md](../HEB_SOLUTION.md), [docs/ANTI-BOT-PLAYBOOK.md](./ANTI-BOT-PLAYBOOK.md)

---

### Issue: Cart Count Not Updating / Verification Failing

**Symptoms:**
- Script says item added but cart count doesn't increase
- Verification fails after multiple retries
- Items missing from final cart

**Root Cause:** HEB changed cart link structure (Feb 14, 2026)

**Fix Applied:** Updated `getCartCount()` to read from `localStorage.PurchaseCart`

```javascript
// NEW: Primary method - read from localStorage
const storageCount = await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('PurchaseCart');
    if (!raw) return 0;
    const cartData = JSON.parse(raw);
    
    if (cartData.ProductNames) {
      const items = cartData.ProductNames.split('<SEP>').filter(n => n.trim());
      return items.length;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
});
```

**Verify Fix:**
```bash
node dinner-automation/scripts/heb-add-cart.js --status
```

---

### Issue: "Chrome not running on port 9222"

**Symptoms:**
```
❌ Could not connect to Chrome on port 9222
Make sure Chrome is running with --remote-debugging-port=9222
```

**Fix:**
```bash
# Launch Edge with debug port
node dinner-automation/scripts/launch-shared-chrome.js

# Or manually:
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="C:\Users\Admin\AppData\Local\Microsoft\Edge\User Data\Marvin"
```

---

### Issue: Product Search Timeouts

**Symptoms:**
- Search for "basmati rice" hangs indefinitely
- "Naan bread" never returns results
- Generic terms fail consistently

**Root Cause:** HEB search works better with branded product names

**Fix:** Update `weekly-plan.json` with HEB-branded search terms:

```json
{
  "hebSearch": "H-E-B Basmati Rice",
  "hebSearch": "Stonefire Naan",
  "hebSearch": "H-E-B Organics Broccoli"
}
```

**Reference:** `docs/HEB-PRODUCT-NAMING.md`

---

## 📧 Email System Issues

### Issue: "Invalid credentials" / SMTP Error

**Symptoms:**
```
❌ SMTP Error: Invalid credentials
```

**Fix:**
1. Verify `.secrets/icloud-smtp.json` exists
2. Use **app-specific password** (not account password)
3. Generate at: https://appleid.apple.com → App-Specific Passwords

```json
{
  "host": "smtp.mail.me.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "MarvinMartian9@icloud.com",
    "pass": "xxxx-xxxx-xxxx-xxxx"
  }
}
```

---

### Issue: Emails Not Being Detected as Opened

**Symptoms:**
- Status stays at "SENT" even after opening
- No tracking pixel trigger

**Root Cause:** Email client blocked remote images

**Fix:**
- Tracking pixel requires images to be enabled
- Some clients block by default (privacy)
- SMS fallback will trigger after 6 hours regardless

**Manual Override:**
```bash
# Force status to confirmed
node dinner-automation/scripts/dinner-email-system-v2.js --simulate "confirmed"
```

---

### Issue: NLP Parser Not Understanding Reply

**Symptoms:**
- Reply received but no changes applied
- Parser returns "unknown intent"

**Fix:** Use clearer language in replies:

| Instead of... | Say... |
|---------------|--------|
| "Monday is wrong" | "Swap Monday to Chicken Alfredo" |
| "I don't want tacos" | "Remove tacos" or "Skip Tuesday" |
| "Add pasta" | "Add Sunday: Spaghetti Carbonara" |
| "Looks fine" | "Looks good!" or "Confirmed" |

**Test Parser:**
```bash
node dinner-automation/scripts/dinner-email-system-v2.js --test-parser "your message here"
```

---

### Issue: SMS Fallback Not Sending

**Symptoms:**
- 6 hours pass but no SMS received
- Twilio error in logs

**Fix:**
1. Verify `.secrets/twilio.json` exists:
```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "fromNumber": "+1xxxxxxxxxx"
}
```

2. Verify phone number in `EMAIL_CONFIG.toPhone`
3. Check Twilio console for delivery errors

---

## 📅 Calendar Sync Issues

### Issue: "Dinner calendar not found"

**Symptoms:**
```
⚠️ No "Dinner" calendar found. Available calendars:
```

**Fix:** Create a calendar named "Dinner" in Apple Calendar app

**Alternative:** Update `TARGET_CALENDAR_NAME` in script to match existing calendar

---

### Issue: Events Not Syncing

**Symptoms:**
- Script runs but no events appear in calendar
- No error messages

**Fix:**
1. Verify CalDAV credentials in `.secrets/icloud-credentials.json`
2. Check `calendar-events.json` exists and has data
3. Verify calendar permissions (app-specific password needs CalDAV access)

---

### Issue: YouTube Links Not Appearing

**Symptoms:**
- Calendar events lack cooking video links

**Fix:**
```bash
# Rebuild YouTube cache
node dinner-automation/scripts/build-youtube-cache.js
```

**Note:** This runs automatically every Sunday at 2:00 AM

---

## 🚗 Facebook Marketplace Issues

### Issue: "Session expired" / Forced Re-login

**Symptoms:**
```
❌ Session expired, needs re-login
```

**Fix:**
1. Chrome session expired (Facebook invalidated)
2. Re-login manually in Chrome
3. Restart Chrome with persistent profile:

```bash
node dinner-automation/scripts/launch-shared-chrome.js
```

**Note:** Facebook sessions can expire if:
- Password changed
- Suspicious activity detected
- Too many rapid actions

---

### Issue: "Chrome profile in use" / Lock Error

**Symptoms:**
```
Failed to launch: Profile in use by another process
```

**Fix:**
```bash
# Kill existing Chrome processes
taskkill /F /IM chrome.exe

# Or use the script's built-in check
node dinner-automation/scripts/launch-shared-chrome.js --status
node dinner-automation/scripts/launch-shared-chrome.js --stop
node dinner-automation/scripts/launch-shared-chrome.js
```

---

### Issue: Sharing to Groups Blocked

**Symptoms:**
- "You're doing that too fast" message
- Temporary sharing restrictions

**Fix:**
- Reduce sharing frequency (currently 3-5 per hour)
- Add longer delays between shares
- Space out group shares across days

**Current Limits:**
- Max 3-5 group shares per hour
- Max 1 share per group per day
- Facebook's rate limiting varies

---

## 🔧 General Automation Issues

### Issue: Scripts Hang / Timeout

**Symptoms:**
- Script runs indefinitely
- No output for minutes

**Fix:**
1. Check if browser is responsive
2. Look for CAPTCHA or bot detection screens
3. Check network connectivity
4. Review screenshot (auto-captured on timeout):

```bash
# Find latest screenshot
ls -lt logs/screenshots/ | head
```

---

### Issue: "Cannot find module"

**Symptoms:**
```
Error: Cannot find module 'playwright'
```

**Fix:**
```bash
# Install dependencies
npm install playwright
npm install tsdav
npm install nodemailer
npm install twilio
```

---

### Issue: CDP Connection Refused

**Symptoms:**
```
connect ECONNREFUSED 127.0.0.1:9222
```

**Fix:**
1. Browser not running with debug port
2. Wrong port number (Edge uses 9222, Chrome may use 18800)
3. Firewall blocking localhost

```bash
# Check if port is listening
netstat -an | findstr 9222

# Launch browser with debug port
node dinner-automation/scripts/launch-shared-chrome.js
```

---

### Issue: Random Delays Too Long

**Symptoms:**
- Automation takes hours to complete
- Delays seem excessive

**Configuration:**
Edit `antiBot` settings in scripts:

```javascript
const antiBot = {
  minDelay: 3000,   // Minimum 3 seconds between actions
  maxDelay: 8000,   // Maximum 8 seconds
  batchPause: 10000 // 10 second pause between batches
};
```

**Note:** Reducing delays may trigger bot detection!

---

## 🐛 Debugging Tips

### Enable Debug Mode

Most scripts support verbose logging:

```bash
# Node debug mode
DEBUG=* node dinner-automation/scripts/heb-add-cart.js

# Script-specific debug
node dinner-automation/scripts/heb-add-cart.js --verbose
```

### Capture Screenshots

Scripts automatically capture on errors. Manual capture:

```javascript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### Check Data Files

```bash
# Verify JSON is valid
cat dinner-automation/data/weekly-plan.json | python -m json.tool

# Check file exists
ls -la dinner-automation/data/

# View recent changes
git log --oneline -10 dinner-automation/data/
```

### Reset State

```bash
# Reset email tracking
node dinner-automation/scripts/dinner-email-system-v2.js --reset

# Clear HEB cart
node dinner-automation/scripts/heb-clear-cart.js

# Reset FB state
rm dinner-automation/data/fb-marketplace-state.json
```

---

## 📞 Still Stuck?

1. Check [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) for system overview
2. Review [API_REFERENCE.md](./API_REFERENCE.md) for module docs
3. Read the script source — heavily commented
4. Check `MEMORY.md` for recent changes and context

---

*Last Updated: February 15, 2026*
