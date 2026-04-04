# Anti-Bot Detection Playbook

*Lessons learned from the HEB automation battle. Reference this for any future bot detection issues.*

---

## The Problem: HEB's Bot Detection

HEB uses multi-layered bot detection that blocks standard automation:
- JavaScript fingerprinting (`navigator.webdriver`, plugins, canvas)
- Behavioral analysis (mouse movements, typing patterns, timing)
- Request header inspection (automation flags)
- Session reputation (new sessions flagged immediately)

**Error message:** "This page could not load. It looks like an ad blocker, antivirus software, VPN, or firewall may be causing an issue."

---

## Layer 1: Stealth Injection (Hides Automation Markers)

**What it does:** Removes telltale signs of automated browsers before page scripts run.

**Key Techniques:**
```javascript
// Hide webdriver flag
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Mock realistic plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [{
    name: 'Chrome PDF Plugin',
    filename: 'internal-pdf-viewer',
    description: 'Portable Document Format'
  }]
});

// Set realistic languages
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

// Remove Chrome automation runtime
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
```

**When to use:** Always. This is the baseline for any automation.

**File:** `dinner-automation/scripts/heb-cart-stealth.js`

---

## Layer 2: Fingerprint Randomization (Looks Like Different Real Users)

**What it does:** Randomizes browser fingerprint so each session appears unique.

**Key Techniques:**
```javascript
// Rotate User-Agent (14+ versions)
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0',
  // ... more versions
];

// Randomize viewport slightly (±50px)
const width = 1920 + randomInt(-50, 50);
const height = 1080 + randomInt(-50, 50);

// Spoof device capabilities
Object.defineProperty(navigator, 'deviceMemory', { get: () => randomChoice([4, 8, 16]) });
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => randomInt(4, 8) });
```

**When to use:** When creating new sessions or after being blocked.

**File:** `dinner-automation/scripts/heb-cart-fingerprint.js`

---

## Layer 3: Request Interception (Strips Automation Headers)

**What it does:** Intercepts and modifies HTTP requests to remove automation flags.

**Key Techniques:**
```javascript
// Remove automation headers
headers['X-Playwright-Browser'] = undefined;
headers['X-Automation-Tool'] = undefined;
headers['HeadlessChrome'] = undefined;

// Add realistic headers
headers['Sec-Ch-Ua'] = '"Chromium";v="122", "Google Chrome";v="122"';
headers['Accept-Language'] = 'en-US,en;q=0.9';
headers['DNT'] = '1';
```

**When to use:** When stealth injection alone isn't enough.

**File:** `dinner-automation/scripts/heb-cart-stealth.js` (route.intercept)

---

## Layer 4: Human-Like Behavior (Timing & Movement)

**What it does:** Mimics human interaction patterns to fool behavioral analysis.

**Key Techniques:**

### Timing (Add Random Delays)
```javascript
// Random delay with jitter
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => delay(randomInt(min, max));

// Use between actions
await randomDelay(3000, 7000); // 3-7 seconds
```

### Typing (Human Speed with Word Pauses)
```javascript
async function humanType(page, selector, text) {
  for (const char of text) {
    await page.type(selector, char, { delay: randomInt(50, 150) });
    if (char === ' ' && Math.random() < 0.3) {
      await delay(randomInt(100, 400)); // Pause at word boundaries
    }
  }
}
```

### Mouse Movement (Curved Paths)
```javascript
function generateCurvedPath(startX, startY, endX, endY, steps) {
  const path = [];
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Random control point for bezier curve
  const controlX = midX + randomInt(-200, 200);
  const controlY = midY + randomInt(-150, 150);
  
  for (let t = 0; t <= 1; t += 1/steps) {
    // Quadratic bezier: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = Math.pow(1-t, 2)*startX + 2*(1-t)*t*controlX + Math.pow(t, 2)*endX;
    const y = Math.pow(1-t, 2)*startY + 2*(1-t)*t*controlY + Math.pow(t, 2)*endY;
    path.push({ x, y });
  }
  return path;
}
```

### Scrolling (Random Patterns)
```javascript
async function humanScroll(page) {
  const scrollAmount = randomInt(100, 500);
  await page.mouse.wheel({ deltaY: scrollAmount });
  await randomDelay(1000, 3000); // Pause after scroll
}
```

**When to use:** After passing initial bot checks but getting blocked during actions.

**File:** `dinner-automation/scripts/heb-cart-slow-mode.js`

---

## Layer 5: Session Warming (Builds Trust Over Time)

**What it does:** Builds a "reputation" with the site by mimicking a real shopper's behavior pattern over multiple days.

**The 3-Day Approach:**

### Day 1: Browse Only
- Visit homepage, wait 5-10 seconds
- Browse 3-5 categories (Produce, Meat, Bakery, etc.)
- View 5-10 products for 10-20 seconds each
- **NO cart actions** — just window shopping
- Save cookies for next visit

### Day 2: Search
- Restore cookies from Day 1
- Perform 3-5 searches (chicken, pasta, milk, etc.)
- View search results for 15-30 seconds each
- **NO cart actions**
- Save updated cookies

### Day 3: Cart Test
- Restore fully warmed cookies
- Attempt cart additions
- Monitor for CAPTCHA at every step

**Why it works:** Bot detection tracks:
1. **Time on site** (accumulated across visits)
2. **Click patterns** (human vs bot behavior)
3. **Cookie age** (how long since first visit)

**When to use:** When all other layers fail. This is the nuclear option for stubborn sites.

**File:** `dinner-automation/scripts/heb-cart-session.js`

---

## Layer 6: Canvas & WebGL Spoofing (Advanced Fingerprinting)

**What it does:** Randomizes canvas fingerprints and masks WebGL vendor info.

**Key Techniques:**
```javascript
// Canvas fingerprint randomization (add subtle noise)
const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
CanvasRenderingContext2D.prototype.getImageData = function(...args) {
  const imageData = originalGetImageData.apply(this, args);
  // Add 1-2 pixel noise
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 2;
    imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
  }
  return imageData;
};

// WebGL vendor spoofing
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
  if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
  return getParameter(parameter);
};
```

**When to use:** When facing advanced fingerprinting (rare).

**File:** `dinner-automation/scripts/heb-cart-stealth.js`

---

## Quick Decision Tree

```
Site blocking automation?
│
├─→ Is it detecting webdriver/plugins?
│   └─→ Apply Layer 1: Stealth Injection
│
├─→ Are sessions being fingerprinted and blocked?
│   └─→ Apply Layer 2: Fingerprint Randomization
│
├─→ Are requests being flagged?
│   └─→ Apply Layer 3: Request Interception
│
├─→ Is it detecting bot-like behavior?
│   └─→ Apply Layer 4: Human-Like Behavior
│
├─→ Still being blocked after all above?
│   └─→ Apply Layer 5: Session Warming (3-day approach)
│
└─→ Advanced fingerprinting detected?
    └─→ Apply Layer 6: Canvas & WebGL Spoofing
```

---

## Testing Checklist

Before declaring a site "working":

- [ ] `navigator.webdriver` returns `undefined`
- [ ] `navigator.plugins` has realistic values (not 0)
- [ ] Page loads without ad blocker errors
- [ ] No CAPTCHA on first load
- [ ] Can perform searches
- [ ] Can view products
- [ ] Can add to cart (if applicable)
- [ ] No "I am human" challenges
- [ ] Screenshot shows expected content (not blocked page)

**Test site for validation:** https://bot.sannysoft.com/

---

## Known Blocked Patterns

**These will get you caught:**
- `navigator.webdriver === true`
- `navigator.plugins.length === 0`
- Headers containing `X-Playwright`, `X-Puppeteer`, `HeadlessChrome`
- Mouse movements that are perfectly linear or instant
- Typing that is too fast (<50ms per character) or perfectly consistent
- No delays between actions
- Viewport exactly 1920x1080 (too common)
- Using the same User-Agent across all sessions

---

## Success Metrics

**Good signs:**
- Page loads without errors
- No CAPTCHA for normal browsing
- Cart operations succeed
- Sustained access over multiple sessions

**Bad signs:**
- "Ad blocker" error message
- CAPTCHA on first visit
- Redirected to challenge page
- Session expires quickly
- Actions fail randomly

---

## Files Reference

| Script | Purpose | Use When |
|--------|---------|----------|
| `heb-cart-stealth.js` | Stealth injection + request interception | Baseline for all HEB automation |
| `heb-cart-fingerprint.js` | Fingerprint randomization | Creating new sessions |
| `heb-cart-slow-mode.js` | Human-like timing & movement | Behavioral blocks |
| `heb-cart-session.js` | Multi-day session warming | All else fails |

---

## Notes for Future Me

1. **Start simple:** Try stealth injection first. Don't jump to session warming immediately.

2. **Test incrementally:** Verify each layer works before adding the next. Don't combine everything at once.

3. **Monitor for changes:** Sites update bot detection. What works today might not work tomorrow.

4. **Save successful sessions:** Cookie persistence is key. A warmed session is worth more than any code.

5. **Screenshot everything:** Visual confirmation beats console logs for detecting blocks.

6. **Respect rate limits:** Even with all these techniques, don't hammer the site. Space out requests.

---

*Last updated: February 11, 2026*
*Context: HEB grocery automation battle*
