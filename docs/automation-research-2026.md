# Web Automation Research Report 2026

## Modern Techniques for HEB and E-Commerce Automation

**Research Date:** February 2026  
**Target:** HEB Grocery Automation System  
**Scope:** Playwright best practices, stealth techniques, CDP features, session management, proxy rotation, and human-like rate limiting

---

## Executive Summary

The browser automation landscape has undergone significant evolution in 2025-2026. Traditional detection methods are being replaced by sophisticated, multi-layered protection systems. For our HEB automation, we need to modernize our approach with protocol-level evasion techniques, improved session persistence, and realistic human behavior simulation.

### Key Findings for HEB Automation

| Current Approach | Recommended Upgrade | Priority |
|-----------------|---------------------|----------|
| Basic CDP connection via Puppeteer | Patchright or enhanced Playwright with stealth patches | High |
| Fixed 2-second delays between actions | Adaptive, randomized delays with human-like patterns | Medium |
| Basic cookie persistence | Full storage state management with TTL | High |
| Single browser profile | Rotating profiles with fingerprint consistency | Medium |
| No proxy rotation | Residential proxy pool with IP matching | Low |

---

## 1. Playwright Best Practices for 2025/2026

### 1.1 The State of Playwright Stealth

**Major Shift:** Since late 2024, anti-bot systems have moved beyond simple `navigator.webdriver` detection to protocol-level CDP detection. The `Runtime.Enable` command leak is now a primary detection vector.

#### Recommended Configuration for HEB

```javascript
const { chromium } = require('playwright');

// Modern Playwright stealth configuration
const browser = await chromium.launch({
  headless: false, // Headful mode significantly reduces detection
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-extensions-except=/path/to/heb-extension',
    '--load-extension=/path/to/heb-extension'
  ]
});

// Context with realistic fingerprint
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  locale: 'en-US',
  timezoneId: 'America/Chicago', // Match HEB's Texas timezone
  geolocation: { latitude: 30.2672, longitude: -97.7431 }, // Austin, TX
  permissions: ['geolocation'],
  // HEB-specific: Accept cookies by default
  acceptDownloads: true,
  ignoreHTTPSErrors: false
});

// Critical: Remove automation indicators before any page loads
await context.addInitScript(() => {
  // Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  
  // Add realistic plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Native Client', filename: 'nativeclient' }
    ]
  });
  
  // Fake languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  
  // Add chrome object if missing
  if (!window.chrome) {
    window.chrome = { runtime: {} };
  }
});
```

### 1.2 Patchright Integration (Recommended)

For maximum stealth, consider migrating to **Patchright**, a drop-in Playwright replacement with built-in CDP leak patches:

```bash
# Migration is straightforward
npm uninstall playwright
npm install patchright
npx patchright install chromium
```

```javascript
// Same API, enhanced stealth
const { chromium } = require('patchright');

const context = await chromium.launchPersistentContext(
  './heb-sessions/main-profile',
  {
    channel: 'chrome', // Use real Chrome, not Chromium
    headless: false,
    no_viewport: true, // Let Chrome manage viewport
  }
);

// No additional stealth scripts needed - built-in patches handle:
// - Runtime.Enable leak
// - Console.Enable leak  
// - Command flags leak
// - Closed Shadow Root interactions
```

### 1.3 HEB-Specific Considerations

Based on HEB's current protection level (moderate), our automation needs:

1. **Persistent login sessions** - HEB requires 2FA on new devices; session persistence is critical
2. **Cart behavior mimicry** - Add items at human-like intervals
3. **Geolocation consistency** - HEB checks location for store availability
4. **Search pattern randomization** - Vary search queries slightly

---

## 2. New Stealth/Evasion Techniques (2025-2026)

### 2.1 The Runtime.Enable Detection Problem

**Critical Issue:** Modern anti-bot systems detect automation through the `Runtime.Enable` CDP command, which is required for Playwright/Puppeteer to function.

**How Detection Works:**
1. Anti-bot scripts trigger `console.log(errorObject)`
2. If CDP's `Runtime` domain is enabled, this causes serialization
3. Observable side effects reveal automation

**Solution for HEB:**

```javascript
// Option 1: Use rebrowser-patches
// npm install rebrowser-patches
const rebrowser = require('rebrowser-patches');
rebrowser.apply('playwright-core');

// Option 2: Manual mitigation via isolated contexts
const client = await page.context().newCDPSession(page);

// Create isolated world for script injection
const { executionContextId } = await client.send('Page.createIsolatedWorld', {
  frameId: (await client.send('Page.getFrameTree')).frameTree.frame.id,
  worldName: 'heb-automation'
});

// Execute in isolated context where anti-bot scripts can't see
await client.send('Runtime.evaluate', {
  expression: 'window.hebSecretVariable = "hidden"',
  contextId: executionContextId
});
```

### 2.2 Human-Like Behavioral Patterns

**Current Gap:** Our automation uses fixed 2-second delays, which is detectable.

**Recommended Human-Like Delays:**

```javascript
class HumanBehavior {
  // Reading time based on content length
  static async simulateReading(page, selector) {
    const text = await page.textContent(selector);
    const wordCount = text.split(/\s+/).length;
    const readingTimeMs = (wordCount / 200) * 60 * 1000; // 200 WPM average
    const variance = readingTimeMs * 0.3; // ±30% variance
    
    await page.waitForTimeout(
      readingTimeMs + (Math.random() * variance * 2 - variance)
    );
  }
  
  // Natural scrolling with variable speed
  static async humanScroll(page, direction = 'down') {
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      const steps = Math.floor(Math.random() * 5) + 3; // 3-8 scroll actions
      
      for (let i = 0; i < steps; i++) {
        const scrollAmount = Math.floor(Math.random() * 200) + 100;
        window.scrollBy(0, direction === 'down' ? scrollAmount : -scrollAmount);
        
        // Variable delay between scrolls (100-400ms)
        await new Promise(r => setTimeout(r, Math.random() * 300 + 100));
        
        // Occasionally pause (simulating reading)
        if (Math.random() < 0.2) {
          await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
        }
      }
    });
  }
  
  // Mouse movement with bezier curves
  static async humanLikeMouseMove(page, targetX, targetY) {
    const steps = Math.floor(Math.random() * 10) + 5;
    
    // Get current position
    const box = await page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));
    
    // Simple bezier interpolation
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = box.x + (targetX - box.x) * t + (Math.random() * 20 - 10);
      const y = box.y + (targetY - box.y) * t + (Math.random() * 20 - 10);
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(Math.random() * 50 + 20);
    }
  }
  
  // Typing with errors and corrections
  static async humanLikeType(page, selector, text, errorRate = 0.05) {
    await page.focus(selector);
    
    for (let i = 0; i < text.length; i++) {
      // Occasional typo
      if (Math.random() < errorRate && i > 0) {
        const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        await page.keyboard.type(wrongChar, { delay: Math.random() * 100 + 50 });
        await page.waitForTimeout(Math.random() * 200 + 100);
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(Math.random() * 150 + 50);
      }
      
      await page.keyboard.type(text[i], { delay: Math.random() * 100 + 50 });
      
      // Pause after words
      if (text[i] === ' ') {
        await page.waitForTimeout(Math.random() * 200 + 100);
      }
    }
  }
}

// Usage in HEB automation
async function addItemToCart(page, searchTerm) {
  // Search with human-like typing
  await HumanBehavior.humanLikeType(page, '[data-testid="search-input"]', searchTerm);
  await page.keyboard.press('Enter');
  
  // Wait for results with reading time
  await page.waitForSelector('[data-testid="product-grid"]');
  await HumanBehavior.simulateReading(page, '[data-testid="product-grid"]');
  
  // Scroll through results
  await HumanBehavior.humanScroll(page);
  
  // Move to and click add button
  const addButton = await page.locator('[data-testid="add-to-cart"]').first();
  const box = await addButton.boundingBox();
  await HumanBehavior.humanLikeMouseMove(page, box.x + 10, box.y + 10);
  await addButton.click();
  
  // Random delay after action (2-5 seconds)
  await page.waitForTimeout(Math.random() * 3000 + 2000);
}
```

### 2.3 Fingerprint Consistency

**Issue:** Mismatched fingerprints (viewport says desktop, user agent says mobile) trigger detection.

**Solution:** Use BrowserForge or consistent device profiles:

```javascript
const { BrowserForge } = require('browserforge');

// Generate consistent fingerprint
const fingerprint = BrowserForge.generate({
  browser: 'chrome',
  os: 'windows',
  device: 'desktop'
});

const context = await browser.newContext({
  viewport: fingerprint.viewport,
  userAgent: fingerprint.userAgent,
  locale: fingerprint.locale,
  timezoneId: fingerprint.timezone,
  geolocation: fingerprint.geolocation,
  deviceScaleFactor: fingerprint.deviceScaleFactor,
  isMobile: fingerprint.isMobile,
  hasTouch: fingerprint.hasTouch
});

// Inject matching fingerprint data
await context.addInitScript((fp) => {
  // WebGL vendor/renderer
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return fp.webgl.vendor; // UNMASKED_VENDOR_WEBGL
    if (parameter === 37446) return fp.webgl.renderer; // UNMASKED_RENDERER_WEBGL
    return getParameter.call(this, parameter);
  };
  
  // Canvas fingerprint noise
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const ctx = this.getContext('2d');
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    
    // Add imperceptible noise
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] += Math.floor(Math.random() * 3) - 1;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return originalToDataURL.call(this, type);
  };
}, fingerprint);
```

---

## 3. CDP (Chrome DevTools Protocol) Advanced Features

### 3.1 Session Persistence via CDP

```javascript
// Save session state for HEB login persistence
async function saveHEBSession(context, sessionId) {
  const state = await context.storageState();
  const fs = require('fs').promises;
  
  // Encrypt sensitive data in production
  await fs.writeFile(
    `./sessions/heb-${sessionId}.json`,
    JSON.stringify(state, null, 2)
  );
  
  // Save metadata
  await fs.writeFile(
    `./sessions/heb-${sessionId}-meta.json`,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      lastUsed: new Date().toISOString()
    })
  );
}

// Load session with validation
async function loadHEBSession(browser, sessionId) {
  const fs = require('fs').promises;
  
  try {
    const meta = JSON.parse(
      await fs.readFile(`./sessions/heb-${sessionId}-meta.json`, 'utf8')
    );
    
    if (new Date(meta.expiresAt) < new Date()) {
      console.log('Session expired, needs re-authentication');
      return null;
    }
    
    const state = JSON.parse(
      await fs.readFile(`./sessions/heb-${sessionId}.json`, 'utf8')
    );
    
    const context = await browser.newContext({ storageState: state });
    
    // Update last used
    meta.lastUsed = new Date().toISOString();
    await fs.writeFile(
      `./sessions/heb-${sessionId}-meta.json`,
      JSON.stringify(meta, null, 2)
    );
    
    return context;
  } catch (e) {
    return null;
  }
}
```

### 3.2 Network Interception for HEB API Monitoring

```javascript
// Monitor HEB API calls for debugging and optimization
const client = await page.context().newCDPSession(page);

await client.send('Network.enable');

client.on('Network.requestWillBeSent', (params) => {
  if (params.request.url.includes('heb.com/api')) {
    console.log('HEB API Request:', params.request.method, params.request.url);
  }
});

client.on('Network.responseReceived', (params) => {
  if (params.response.url.includes('heb.com/api/cart')) {
    console.log('Cart API Response:', params.response.status);
  }
});

// Block unnecessary resources to speed up automation
await page.route('**/*', (route) => {
  const type = route.request().resourceType();
  const url = route.request().url();
  
  // Block analytics and tracking
  if (url.includes('analytics') || url.includes('tracking')) {
    return route.abort();
  }
  
  // Block images (but not HEB product images)
  if (type === 'image' && !url.includes('heb.com')) {
    return route.abort();
  }
  
  route.continue();
});
```

### 3.3 Performance Monitoring

```javascript
// Monitor page performance for optimization
await client.send('Performance.enable');

// Get performance metrics
const metrics = await client.send('Performance.getMetrics');
const usefulMetrics = metrics.metrics.filter(m => 
  ['JSHeapUsedSize', 'JSEventListeners', 'Nodes', 'LayoutCount'].includes(m.name)
);

console.log('Performance Metrics:', usefulMetrics);
```

---

## 4. Session Persistence and Cookie Management Improvements

### 4.1 Tiered Session Strategy

For HEB automation, we need multiple session tiers:

```javascript
class HEBSessionManager {
  constructor() {
    this.sessionsDir = './dinner-automation/data/sessions';
  }
  
  async getSession(tier = 'main') {
    const tiers = {
      main: { id: 'alex-main', ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 days
      backup: { id: 'alex-backup', ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 days
      temp: { id: `temp-${Date.now()}`, ttl: 24 * 60 * 60 * 1000 } // 1 day
    };
    
    const config = tiers[tier];
    
    // Check if valid session exists
    const existing = await this.loadSession(config.id);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.state;
    }
    
    // Return null if needs new login
    return null;
  }
  
  async loadSession(sessionId) {
    try {
      const fs = require('fs').promises;
      const meta = JSON.parse(
        await fs.readFile(`${this.sessionsDir}/${sessionId}-meta.json`, 'utf8')
      );
      
      if (new Date(meta.expiresAt) < new Date()) {
        return null;
      }
      
      const state = JSON.parse(
        await fs.readFile(`${this.sessionsDir}/${sessionId}-state.json`, 'utf8')
      );
      
      return { state, expiresAt: new Date(meta.expiresAt).getTime() };
    } catch (e) {
      return null;
    }
  }
  
  async saveSession(context, sessionId, ttl = 7 * 24 * 60 * 60 * 1000) {
    const fs = require('fs').promises;
    const state = await context.storageState();
    
    await fs.mkdir(this.sessionsDir, { recursive: true });
    
    await fs.writeFile(
      `${this.sessionsDir}/${sessionId}-state.json`,
      JSON.stringify(state, null, 2)
    );
    
    await fs.writeFile(
      `${this.sessionsDir}/${sessionId}-meta.json`,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl).toISOString(),
        sessionId
      })
    );
  }
}
```

### 4.2 Smart Cookie Handling

```javascript
// HEB-specific cookie management
async function optimizeCookies(context) {
  const cookies = await context.cookies('https://www.heb.com');
  
  // Identify critical cookies
  const criticalCookies = cookies.filter(c => 
    c.name.includes('session') ||
    c.name.includes('auth') ||
    c.name.includes('HEB') ||
    c.name.includes('cart')
  );
  
  // Extend expiration on critical cookies
  for (const cookie of criticalCookies) {
    if (cookie.expires) {
      // Refresh cookies that expire soon
      const daysUntilExpiry = (cookie.expires - Date.now() / 1000) / 86400;
      if (daysUntilExpiry < 2) {
        await context.addCookies([{
          ...cookie,
          expires: (Date.now() / 1000) + 7 * 86400 // Extend 7 days
        }]);
      }
    }
  }
}
```

---

## 5. Proxy Rotation and Request Fingerprinting

### 5.1 Proxy Strategy for HEB

HEB currently doesn't aggressively block IPs, but for robustness:

```javascript
class HEBProxyManager {
  constructor() {
    // Texas-based residential proxies would be ideal for HEB
    this.proxies = [
      { server: 'http://proxy1.example.com:8080', location: 'austin', type: 'residential' },
      { server: 'http://proxy2.example.com:8080', location: 'houston', type: 'residential' },
      { server: 'http://proxy3.example.com:8080', location: 'san_antonio', type: 'residential' }
    ];
    this.currentIndex = 0;
    this.failureCounts = new Map();
  }
  
  getNextProxy() {
    // Rotate through proxies
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    
    // Skip proxies with high failure rates
    if ((this.failureCounts.get(proxy.server) || 0) > 3) {
      return this.getNextProxy();
    }
    
    return proxy;
  }
  
  async reportFailure(proxy) {
    const count = (this.failureCounts.get(proxy.server) || 0) + 1;
    this.failureCounts.set(proxy.server, count);
  }
  
  getContextOptions(proxy) {
    // Match geolocation to proxy location
    const geolocations = {
      austin: { latitude: 30.2672, longitude: -97.7431 },
      houston: { latitude: 29.7604, longitude: -95.3698 },
      san_antonio: { latitude: 29.4241, longitude: -98.4936 }
    };
    
    return {
      proxy: { server: proxy.server },
      geolocation: geolocations[proxy.location],
      timezoneId: 'America/Chicago',
      locale: 'en-US'
    };
  }
}
```

### 5.2 Request Fingerprint Consistency

```javascript
// Ensure headers match browser fingerprint
async function ensureConsistentFingerprint(context) {
  await context.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  });
}
```

---

## 6. Rate Limiting Strategies That Mimic Human Behavior

### 6.1 Adaptive Rate Limiter

```javascript
class AdaptiveRateLimiter {
  constructor() {
    this.baseDelay = 2000; // 2 seconds base
    this.currentDelay = this.baseDelay;
    this.successCount = 0;
    this.failureCount = 0;
    this.maxDelay = 30000; // 30 seconds max
    this.minDelay = 1500; // 1.5 seconds min
  }
  
  async wait() {
    // Add jitter (±25%)
    const jitter = this.currentDelay * 0.25 * (Math.random() * 2 - 1);
    const waitTime = Math.max(0, this.currentDelay + jitter);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  recordSuccess() {
    this.successCount++;
    this.failureCount = 0;
    
    // Gradually decrease delay after successful requests
    if (this.successCount >= 5) {
      this.currentDelay = Math.max(
        this.minDelay,
        this.currentDelay * 0.9
      );
      this.successCount = 0;
    }
  }
  
  recordFailure(type) {
    this.failureCount++;
    this.successCount = 0;
    
    // Increase delay based on failure type
    switch (type) {
      case 'rate_limited':
        this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 2);
        break;
      case 'timeout':
        this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 1.5);
        break;
      case 'error':
        this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 1.3);
        break;
    }
  }
  
  // HEB-specific action delays
  getActionDelay(action) {
    const delays = {
      search: { min: 2000, max: 4000 },
      addToCart: { min: 1500, max: 3000 },
      viewCart: { min: 1000, max: 2000 },
      checkout: { min: 3000, max: 5000 },
      navigate: { min: 1000, max: 2000 }
    };
    
    const delay = delays[action] || delays.navigate;
    return Math.random() * (delay.max - delay.min) + delay.min;
  }
}

// Usage
const rateLimiter = new AdaptiveRateLimiter();

async function performHEBAction(action, page, ...args) {
  await rateLimiter.wait();
  
  try {
    await action(page, ...args);
    rateLimiter.recordSuccess();
  } catch (error) {
    if (error.message.includes('429')) {
      rateLimiter.recordFailure('rate_limited');
    } else if (error.message.includes('timeout')) {
      rateLimiter.recordFailure('timeout');
    } else {
      rateLimiter.recordFailure('error');
    }
    throw error;
  }
}
```

### 6.2 Shopping Pattern Simulation

```javascript
class ShoppingPattern {
  constructor() {
    this.actions = [];
    this.startTime = Date.now();
  }
  
  async simulateBrowsing(page, categories) {
    // Browse 1-3 categories before searching
    const numCategories = Math.floor(Math.random() * 3) + 1;
    const shuffled = categories.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numCategories; i++) {
      await page.goto(`https://www.heb.com/shop/categories/${shuffled[i]}`);
      await HumanBehavior.humanScroll(page);
      await HumanBehavior.simulateReading(page, '.category-content');
    }
  }
  
  async simulateProductComparison(page, products) {
    // Open multiple products in new tabs (common behavior)
    for (const product of products.slice(0, 2)) {
      const newPage = await page.context().newPage();
      await newPage.goto(product.url);
      await HumanBehavior.simulateReading(newPage, '.product-details');
      await newPage.waitForTimeout(Math.random() * 3000 + 2000);
      await newPage.close();
    }
  }
  
  async simulateCartAbandonment(page) {
    // Sometimes abandon cart temporarily (very human)
    if (Math.random() < 0.1) { // 10% chance
      await page.goto('https://www.heb.com/shop/categories');
      await HumanBehavior.humanScroll(page);
      await page.waitForTimeout(Math.random() * 10000 + 5000);
      await page.goto('https://www.heb.com/cart');
    }
  }
}
```

---

## 7. Actionable Recommendations for HEB Automation

### 7.1 Immediate Actions (High Priority)

1. **Migrate to Patchright or enhanced Playwright**
   ```bash
   cd dinner-automation/browser
   npm install patchright
   npx patchright install chromium
   ```

2. **Implement session persistence with TTL**
   - Create `./dinner-automation/data/sessions/` directory
   - Save storage state after successful login
   - Check session validity before automation

3. **Replace fixed delays with human-like behavior**
   - Create `HumanBehavior` utility class
   - Implement `randomDelay()` with variance
   - Add reading time simulation

### 7.2 Short-Term Improvements (Medium Priority)

1. **Add CDP session monitoring**
   - Monitor HEB API calls for debugging
   - Block unnecessary resources (analytics, tracking)

2. **Implement fingerprint consistency**
   - Match viewport, user agent, timezone
   - Add WebGL and canvas noise

3. **Create proxy rotation capability**
   - Even if not immediately used, prepare the infrastructure
   - Texas-based residential proxies ideal for HEB

### 7.3 Long-Term Strategy (Low Priority)

1. **BrowserForge integration** for statistically accurate fingerprints
2. **Machine learning** for adaptive rate limiting based on success/failure patterns
3. **Distributed automation** across multiple sessions for high-volume scenarios

### 7.4 Code Migration Checklist

```markdown
- [ ] Replace `puppeteer-core` with `patchright` or enhanced `playwright`
- [ ] Add context-level init scripts for webdriver removal
- [ ] Implement session persistence (save/load storage state)
- [ ] Replace all `sleep(2000)` with `HumanBehavior.randomDelay()`
- [ ] Add human-like scrolling before interactions
- [ ] Implement adaptive rate limiter
- [ ] Add CDP network monitoring for debugging
- [ ] Create fingerprint consistency checks
- [ ] Test against bot detection services
- [ ] Document session management strategy
```

---

## 8. Testing and Validation

### 8.1 Detection Test Sites

Before deploying, validate stealth against:

| Site | Purpose | Expected Result |
|------|---------|-----------------|
| https://bot.sannysoft.com | Basic fingerprinting | All green |
| https://abrahamjuliot.github.io/creepjs/ | Advanced fingerprinting | Trust score > 80% |
| https://pixelscan.net/ | Comprehensive check | "Consistent" result |
| https://www.browserscan.net/ | CDP detection | No CDP leaks |

### 8.2 HEB-Specific Testing

```javascript
async function validateHEBStealth(page) {
  await page.goto('https://www.heb.com');
  
  // Check for bot warnings
  const botWarning = await page.$('text=/bot|automation|unusual activity/i');
  if (botWarning) {
    console.error('HEB detected automation!');
    return false;
  }
  
  // Verify login form is accessible
  const loginLink = await page.$('a[href*="login"]');
  if (!loginLink) {
    console.error('Login link not found - possible block');
    return false;
  }
  
  // Check for CAPTCHA
  const captcha = await page.$('iframe[src*="captcha"], .g-recaptcha, [data-testid="captcha"]');
  if (captcha) {
    console.warn('CAPTCHA detected');
    return false;
  }
  
  return true;
}
```

---

## 9. References

### Modern Anti-Detect Frameworks
- [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-python) - Patched Playwright
- [Camoufox](https://github.com/daijro/camoufox) - Anti-detect Firefox
- [Nodriver](https://github.com/ultrafunkamsterdam/nodriver) - CDP-free automation
- [Rebrowser Patches](https://github.com/rebrowser/rebrowser-patches) - Runtime.Enable fixes

### Research Articles
- [Castle.io: Anti-Detect Evolution](https://blog.castle.io/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/)
- [BrowserStack: Cloudflare Bypass](https://www.browserstack.com/guide/playwright-cloudflare)
- [Browserless: Scalable Scraping](https://www.browserless.io/blog/scraping-with-playwright-a-developer-s-guide-to-scalable-undetectable-data-extraction)

### Detection Testing
- [Sannysoft Bot Test](https://bot.sannysoft.com/)
- [CreepJS Fingerprinting](https://abrahamjuliot.github.io/creepjs/)
- [BrowserScan](https://www.browserscan.net/)

---

## Appendix: Quick Reference

### Minimum Viable Stealth Setup

```javascript
const { chromium } = require('playwright');

async function createStealthContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    geolocation: { latitude: 30.2672, longitude: -97.7431 }
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [{ name: 'Chrome PDF Plugin' }] });
    window.chrome = { runtime: {} };
  });
  
  return context;
}

// Random delay helper
const randomDelay = (min, max) => new Promise(
  r => setTimeout(r, Math.random() * (max - min) + min)
);
```

---

*Document Version: 1.0*  
*Last Updated: February 17, 2026*  
*Next Review: March 2026*
