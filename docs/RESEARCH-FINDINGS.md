# Automation Research Findings 2024-2025

## Executive Summary

This document contains deep research on new automation techniques and APIs relevant to Alexander's workflow, focusing on browser automation, AI-powered tools, manufacturing APIs, and performance optimizations.

**Last Updated:** February 18, 2026

---

## 1. Latest Playwright 1.40+ Features

### 1.1 Major Version Highlights (1.40 - 1.58)

#### Version 1.58 (Current Latest)
- **Timeline View**: Speedboard tab in HTML reports shows test execution timeline for merged reports
- **UI Mode Improvements**:
  - 'system' theme option that follows OS dark/light mode preference
  - Search functionality (Cmd/Ctrl+F) in code editors
  - Reorganized network details panel
  - Automatic JSON response formatting
- **CDP Local Optimization**: `browserType.connectOverCDP()` now accepts `isLocal: true` for filesystem optimizations
- **Breaking Changes**:
  - Removed `_react` and `_vue` selectors (use locators guide alternatives)
  - Removed `:light` selector engine suffix
  - Removed `devtools` option from `browserType.launch()` (use `args: ['--auto-open-devtools-for-tabs']`)

#### Version 1.57
- **Chrome for Testing**: Playwright now uses Chrome for Testing builds instead of Chromium
- **Speedboard**: New HTML reporter tab showing tests sorted by slowness
- **WebServer Output Matching**: `testConfig.webServer` added `wait` field with regex matching
  ```javascript
  export default defineConfig({
    webServer: {
      command: 'npm run start',
      wait: {
        stdout: /Listening on port (?<my_server_port>\d+)/
      },
    },
  });
  ```
- Named capture groups become environment variables for dynamic port configuration

#### Version 1.56 - AI Test Agents
- **Playwright Test Agents**: Three custom agent definitions for LLM-driven test development
  - 🎭 **planner**: Explores app and produces Markdown test plan
  - 🎭 **generator**: Transforms Markdown plan into Playwright Test files
  - 🎭 **healer**: Executes test suite and automatically repairs failing tests
  
  ```bash
  # Generate agent files for different platforms
  npx playwright init-agents --loop=vscode
  npx playwright init-agents --loop=claude
  npx playwright init-agents --loop=opencode
  ```

#### Version 1.55
- **Automatic toBeVisible() Assertions**: Codegen can now generate automatic visibility assertions (enabled in settings UI)
- **New APIs**:
  - `page.consoleMessages()` - Retrieve recent console messages
  - `page.pageErrors()` - Retrieve recent page errors
  - `page.requests()` - Retrieve recent network requests
  - `testStepInfo.titlePath` - Returns full title path from test file

#### Version 1.54
- **Partitioned Cookies**: New `partitionKey` property in `browserContext.cookies()` and `addCookies()` for CHIPS support
- **No Snippets Option**: Disable code snippets in HTML reports
- **Aria Snapshots**: Renders and compares input placeholders

### 1.2 New Locator Strategies

Playwright continues to prioritize accessibility-first locators:

```javascript
// Recommended locator priority order:
1. page.getByRole('button', { name: 'Submit' })        // ARIA roles
2. page.getByText('Welcome')                           // Text content
3. page.getByTestId('login-button')                    // Test IDs
4. page.getByLabel('Password')                         // Label text
5. page.getByPlaceholder('Enter email')               // Placeholder text
```

### 1.3 Codegen Improvements

The test generator (`npx playwright codegen`) has been significantly enhanced:

- **Smart Locator Selection**: Analyzes rendered page and recommends best locator, prioritizing role/text/test-id
- **Resilient Locators**: When multiple elements match, improves locator to uniquely identify target
- **Built-in Assertions**: Can generate visibility, text, and value assertions directly from UI
- **Storage State Preservation**: 
  ```bash
  # Save authentication state
  npx playwright codegen github.com --save-storage=auth.json
  
  # Reuse authenticated state
  npx playwright codegen --load-storage=auth.json github.com
  ```

### 1.4 Web-First Assertions

```javascript
// Modern approach - auto-retrying assertions
import { expect } from '@playwright/test';

await expect(page.getByRole('heading')).toBeVisible();
await expect(page.getByRole('heading')).toHaveText('Welcome');
await expect(page.getByRole('button')).toBeEnabled();

// New in 1.40+
await expect(locator).toHaveAccessibleErrorMessage('Invalid email');
```

---

## 2. Modern Browser Automation Patterns

### 2.1 Chrome DevTools Protocol (CDP)

The Chrome DevTools Protocol allows for tools to instrument, inspect, debug and profile Chromium-based browsers.

**Key HTTP Endpoints** (when using `--remote-debugging-port=9222`):
- `GET /json/version` - Browser version metadata
- `GET /json` or `/json/list` - List of available WebSocket targets
- `PUT /json/new?{url}` - Opens new tab
- `GET /json/activate/{targetId}` - Brings page to foreground
- `GET /json/close/{targetId}` - Closes target page
- `WebSocket /devtools/page/{targetId}` - Protocol WebSocket endpoint

**Playwright CDP Connection**:
```javascript
// Connect to existing Chrome instance
const browser = await chromium.connectOverCDP('http://localhost:9222', {
  isLocal: true  // New in 1.58 - enables filesystem optimizations
});

// Get existing context or create new
const context = browser.contexts()[0] || await browser.newContext();
const page = context.pages()[0] || await context.newPage();
```

### 2.2 WebDriver BiDi Protocol

**WebDriver BiDi** (Bidirectional) is the future of browser automation - a new standard combining WebDriver Classic reliability with CDP's advanced capabilities.

**Key Capabilities**:
- Real-time console log capture
- Network traffic interception and modification
- Precise complex user input simulation
- Streaming events from browser to controlling software via WebSockets

**Selenium BiDi Enablement**:
```javascript
const options = new chrome.Options();
options.setCapability("webSocketUrl", true);
// Enables WebSocket connection for bidirectional communication
```

**Status**: Currently under active development by browser vendors and Selenium team. Not yet stable for production use but represents the future direction.

### 2.3 Headless vs Headed Tradeoffs

| Aspect | Headless | Headed |
|--------|----------|--------|
| **Performance** | 2-10x faster startup | Slower due to rendering |
| **Detection Risk** | Higher (navigator.webdriver=true) | Lower |
| **Resource Usage** | Lower CPU/memory | Higher |
| **Debugging** | Harder (no visual) | Easier with visible UI |
| **CI/CD** | Preferred | Often problematic |
| **Anti-bot Evasion** | Requires stealth patches | Naturally less detectable |

**Recommendation for HEB/Facebook Automation**:
- Use headed mode for long-running automation sessions
- Use CDP connection to persistent browser profile
- Implement human-like delays and mouse movements

---

## 3. AI-Powered Automation Tools

### 3.1 Claude Code

**Capabilities**:
- Agentic coding with multi-file context awareness
- Can execute commands, read files, and make edits autonomously
- Maintains conversation context across sessions
- Understands complex project structures

**Integration Pattern**:
```bash
# Claude Code can work alongside Playwright
npx playwright init-agents --loop=claude
```

### 3.2 Playwright Test Agents (1.56+)

Three-agent system for LLM-driven test automation:

1. **Planner Agent**: Explores application and produces Markdown test plan
2. **Generator Agent**: Transforms plan into executable Playwright tests
3. **Healer Agent**: Executes tests and automatically repairs failures

**Usage**:
```bash
npx playwright init-agents --loop=claude
npx playwright init-agents --loop=vscode
npx playwright init-agents --loop=opencode
```

### 3.3 GitHub Copilot Patterns

**Effective Patterns for Automation**:
- Use descriptive comments for complex selector logic
- Leverage Copilot for repetitive page object patterns
- Generate test data factories with AI assistance

---

## 4. APIs Relevant to Vectarr

### 4.1 JobBOSS² API

**Overview**: JobBOSS² is a job shop software solution with public API for custom integrations.

**Key Features**:
- Real-time scheduling and inventory data
- Shop floor control module
- Job tracking capabilities
- Available through ECI Solutions

**API Access**: REST API available for paying customers

### 4.2 Fusion 360 CAM API

**Overview**: Comprehensive CAM automation capabilities within Fusion 360.

**Key Capabilities**:
```python
import adsk.core, adsk.fusion, adsk.cam

# Get CAM product
app = adsk.core.Application.get()
cam = adsk.cam.CAM.cast(app.activeProduct)

# Access setups
setups = cam.setups
setup = setups.itemByName('Setup1')

# Generate toolpaths
future = cam.generateAllToolpaths(False)

# Post-process NC files
postInput = adsk.cam.PostProcessInput.create(
    programName='101',
    postConfig=cam.genericPostFolder + '/fanuc.cps',
    outputFolder='C:/NCOutput',
    units=adsk.cam.PostOutputUnitOptions.DocumentUnitsOutput
)
cam.postProcessAll(postInput)
```

**Use Cases for Vectarr**:
- Automated quoting based on CAM analysis
- Toolpath generation for standard parts
- Automated NC code generation
- Setup sheet generation

### 4.3 Onshape API

**Overview**: Cloud-native CAD with robust REST API for ERP/PLM/CAM integrations.

**Key Features**:
- Open REST API with OAuth authentication
- Event webhooks for real-time updates
- Glassworks API Explorer for testing
- Code samples in Python, JavaScript, C/C++

**API Capabilities**:
- Access part geometry and mass properties
- Extract Bill of Materials (BOM)
- Manage versions and releases
- Real-time collaboration data

**Integration Points**:
```javascript
// Example: Extract mass properties for quoting
const response = await fetch(
  `https://cad.onshape.com/api/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/massproperties`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

### 4.4 Manufacturing Quoting APIs

**Xometry Integration**:
- Add-ins available for Fusion 360, SolidWorks, Onshape
- Provides instant quoting and DFM feedback
- API available for enterprise customers

**Paperless Parts API**:
- Automated quoting from CAD files
- Geometry analysis for manufacturability
- Integration with major CAD platforms

---

## 5. APIs for Personal Automation

### 5.1 Financial APIs

#### GoCardless Bank Account Data API
**Coverage**: EEA countries (PSD2 regulated)

**Data Available**:
- Account holder name and account numbers
- Up to 24 months of transaction history
- Current and available balances
- 90 days continuous access

**Rate Limits**: 
- As low as 4 API calls per day per account (varies by bank)
- Rate limit headers provided for tracking

**Authentication**: User secrets from GoCardless portal

```javascript
// Example workflow
1. Create end user reference
2. Get list of supported financial institutions
3. Redirect to GoCardless consent screen
4. Bank authenticates user
5. Access data via API with access token
```

#### Plaid Alternatives

| Provider | Coverage | Best For |
|----------|----------|----------|
| **Plaid** | US, CA, UK | Broad coverage, mature API |
| **Teller** | US only | Modern OAuth-less approach, simpler APIs |
| **GoCardless** | EEA | European coverage, PSD2 compliant |
| **MX** | US | Financial data enhancement |

### 5.2 Calendar APIs

#### Google Calendar API
- RESTful API for event management
- Push notifications via webhook
- Free/busy time queries
- Recurring event support

#### Microsoft Graph API
- Unified API for Microsoft 365
- Calendar, email, tasks in single endpoint
- Delta queries for incremental sync
- Webhook subscriptions for real-time updates

**Integration Pattern**:
```javascript
// Microsoft Graph calendar access
GET https://graph.microsoft.com/v1.0/me/calendar/events
GET https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=...&endDateTime=...
```

### 5.3 Email Processing APIs

#### Resend API
- Modern email API for developers
- Simple REST API
- High deliverability rates
- Generous free tier (3,000 emails/month)

#### Nylas API
- Unified email, calendar, contacts API
- Connects to Gmail, Outlook, Exchange
- Real-time webhook notifications
- AI-powered email parsing

---

## 6. JavaScript/Node.js Performance Patterns (2024-2025)

### 6.1 V8 Engine Optimizations

#### Maglev Compiler (Chrome M117+)

V8's new optimizing compiler sits between Sparkplug (baseline) and TurboFan (peak performance).

**Key Characteristics**:
- **Compile Speed**: ~10x slower than Sparkplug, ~10x faster than TurboFan
- **Performance**: Significantly better than Sparkplug, approaching TurboFan
- **Energy Efficiency**: 3.5% less energy on JetStream, 10% less on Speedometer

**Impact on Automation Scripts**:
- Faster cold starts for frequently-run scripts
- Better performance for medium-hot code paths
- Reduced resource consumption for long-running automation

#### Optimization Best Practices

```javascript
// GOOD: Stable object shapes
function createUser(name, age) {
  return { name, age, active: true };  // Consistent property order
}

// BAD: Changing object shapes
function createUserBad(name, age) {
  const user = { name };
  if (age) user.age = age;  // Shape changes here
  return user;
}

// GOOD: Monomorphic functions
function processUser(user) {
  return user.name.toUpperCase();  // Always same type
}

// GOOD: Use const for never-reassigned variables
const CONFIG = { timeout: 5000 };
```

### 6.2 Zero-Copy Patterns

```javascript
// Use streams for large file processing
const fs = require('fs');
const { pipeline } = require('stream/promises');

// Zero-copy file processing
await pipeline(
  fs.createReadStream('large-file.csv'),
  new Transform({
    transform(chunk, encoding, callback) {
      // Process chunk without copying
      callback(null, processChunk(chunk));
    }
  }),
  fs.createWriteStream('output.csv')
);
```

### 6.3 Async Patterns

```javascript
// Parallel execution with Promise.all
const [users, orders, products] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchProducts()
]);

// Limited concurrency for resource-intensive operations
const pLimit = (concurrency) => {
  const queue = [];
  let activeCount = 0;
  
  const next = () => {
    activeCount--;
    if (queue.length > 0) queue.shift()();
  };
  
  return (fn) => new Promise((resolve, reject) => {
    const run = async () => {
      activeCount++;
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
      next();
    };
    
    if (activeCount < concurrency) run();
    else queue.push(run);
  });
};

// Usage
const limit = pLimit(5);  // Max 5 concurrent
await Promise.all(urls.map(url => limit(() => fetch(url))));
```

---

## 7. Anti-Bot Detection Evasion Techniques

### 7.1 Current Detection Methods

Modern anti-bot systems use:
- **Browser Fingerprinting**: Canvas, WebGL, audio, fonts
- **Behavioral Analysis**: Mouse movements, keystroke timing, scroll patterns
- **JavaScript Challenges**: `navigator.webdriver`, plugin enumeration
- **TLS Fingerprinting**: JA3/JA4 signatures
- **IP Reputation**: Datacenter detection, proxy lists

### 7.2 Stealth Techniques

#### Playwright Stealth (playwright-stealth for Python)
```python
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

async with async_playwright() as p:
    browser = await p.chromium.launch()
    page = await browser.new_page()
    await stealth_async(page)  # Apply stealth patches
```

#### JavaScript Stealth (playwright-extra)
```javascript
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

const browser = await chromium.launch();
```

#### Key Evasion Modules

| Module | Purpose |
|--------|---------|
| `navigator.webdriver` | Remove webdriver flag |
| `chrome.runtime` | Add fake Chrome extension API |
| `window.outerWidth` | Spoof window dimensions |
| `navigator.plugins` | Add fake plugin list |
| `webgl` | Mask WebGL vendor/renderer |
| `canvas` | Add noise to canvas fingerprint |

### 7.3 Human-Like Behavior Patterns

```javascript
// Randomized delays
const randomDelay = (min, max) => 
  new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

// Human-like mouse movements (using CDP)
await page.mouse.move(x, y, { steps: 10 });

// Randomized typing speed
async function humanType(page, selector, text) {
  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 100 + 50 });
  }
}

// Scroll with variable speed
async function humanScroll(page, pixels) {
  await page.evaluate(async (pixels) => {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    const steps = 10;
    const perStep = pixels / steps;
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, perStep);
      await delay(Math.random() * 100 + 50);
    }
  }, pixels);
}
```

### 7.4 TLS Fingerprinting Evasion

**JA3/JA4 Fingerprinting**: Identifies clients by TLS handshake characteristics.

**Mitigation Approaches**:
- Use real browser TLS stacks (Playwright/Puppeteer use real Chrome)
- Rotate through different browser versions
- Use residential/mobile proxies

### 7.5 Recommended Stealth Stack

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
  headless: false,  // Headed mode less detectable
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
  ]
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  locale: 'en-US',
  timezoneId: 'America/Chicago',
});

// Additional evasion scripts
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
});
```

---

## 8. Actionable Improvements for Existing Scripts

### 8.1 HEB Automation Improvements

**Current Pattern**: `check-heb-status.js`, `heb-sync-cart-exact.js`

**Recommended Improvements**:

1. **Use Persistent Context for Login State**:
```javascript
// Instead of logging in each time
const context = await chromium.launchPersistentContext('./heb-profile', {
  headless: false,
});
// Login once, reuse session
```

2. **Implement ARIA-First Locators**:
```javascript
// Replace brittle selectors
const cartLink = page.locator('[data-testid="cart-link"]');

// With resilient ARIA locators
const cartLink = page.getByRole('link', { name: /cart/i });
```

3. **Add Auto-Retry with Exponential Backoff**:
```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await delay(1000 * Math.pow(2, i));
    }
  }
}
```

4. **Use Storage State for Authentication**:
```javascript
// Save after login
await context.storageState({ path: 'heb-auth.json' });

// Load on subsequent runs
const context = await browser.newContext({
  storageState: 'heb-auth.json'
});
```

### 8.2 Facebook Automation Improvements

**Current Pattern**: `f150_facebook_share.js`, `fb-share.js`

**Recommended Improvements**:

1. **Apply Stealth Plugin**:
```javascript
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
```

2. **Human-Like Interaction Patterns**:
```javascript
// Add randomized delays between actions
await page.waitForTimeout(Math.random() * 2000 + 1000);

// Use realistic viewport
viewport: { width: 1366, height: 768 }  // Common resolution
```

3. **Implement Automatic Group Rotation with State**:
```javascript
// Already partially implemented - enhance with:
const state = {
  lastGroupIndex: -1,
  postHistory: [],  // Track what was posted when
  failures: []      // Track failed attempts
};
```

4. **Add Screenshot Evidence Collection**:
```javascript
// After each major step
await page.screenshot({ 
  path: `evidence/${timestamp}-${step}.png`,
  fullPage: true 
});
```

### 8.3 General Automation Improvements

1. **Structured Logging**:
```javascript
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'automation.log' })
  ]
});
```

2. **Health Check Endpoints**:
```javascript
// For scheduled tasks
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    lastRun: state.lastRun,
    chromeConnected: !!browser 
  });
});
```

3. **Circuit Breaker Pattern**:
```javascript
class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
  }
  
  async execute(...args) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}
```

---

## Appendix: Code Examples

### A. Complete Stealth Browser Setup

```javascript
const { chromium } = require('playwright');
const fs = require('fs');

async function createStealthBrowser(options = {}) {
  const {
    headless = false,
    userDataDir = './browser-profile',
    proxy = null
  } = options;
  
  const args = [
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-popup-blocking',
    '--disable-notifications',
  ];
  
  if (proxy) args.push(`--proxy-server=${proxy}`);
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    permissions: ['geolocation'],
  });
  
  // Apply stealth scripts
  await browser.addInitScript(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', { 
      get: () => undefined 
    });
    
    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin' },
        { name: 'Chrome PDF Viewer' },
        { name: 'Native Client' }
      ]
    });
    
    // Fake chrome object
    window.chrome = {
      runtime: {
        OnInstalledReason: { CHROME_UPDATE: 'chrome_update' },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update' }
      }
    };
  });
  
  return browser;
}
```

### B. Resilient Wait Patterns

```javascript
// Wait for element with multiple strategies
async function resilientWait(page, selectors, options = {}) {
  const { timeout = 10000, visible = true } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          if (!visible || await element.isVisible()) {
            return element;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    await page.waitForTimeout(100);
  }
  
  throw new Error(`None of the selectors found within ${timeout}ms`);
}

// Usage
const button = await resilientWait(page, [
  'button[data-testid="submit"]',
  'button:has-text("Submit")',
  '[role="button"]:has-text("Submit")'
]);
```

### C. Rate-Limited API Client

```javascript
class RateLimitedClient {
  constructor(options = {}) {
    this.requestsPerSecond = options.requestsPerSecond || 1;
    this.queue = [];
    this.processing = false;
  }
  
  async request(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
      
      // Rate limit delay
      await new Promise(r => setTimeout(r, 1000 / this.requestsPerSecond));
    }
    
    this.processing = false;
  }
}
```

---

## References

1. Playwright Release Notes: https://playwright.dev/docs/release-notes
2. Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/
3. WebDriver BiDi: https://w3c.github.io/webdriver-bidi/
4. V8 Maglev Compiler: https://v8.dev/blog/maglev
5. Puppeteer Stealth: https://github.com/berstend/puppeteer-extra
6. Onshape API: https://onshape-public.github.io/docs/
7. Fusion 360 CAM API: https://help.autodesk.com/view/fusion360/ENU/
8. GoCardless API: https://developer.gocardless.com/
9. TLS Fingerprinting: https://www.browserless.io/blog/tls-fingerprinting

---

*Document generated by OpenClaw Research Subagent*
*Session: research-automation*
