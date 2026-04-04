# HEB Cart Automation - Anti-Bot Bypass Research Report
**Research Date:** February 14, 2026  
**Focus:** HEB.com bot protection bypass strategies for 2025-2026

---

## Executive Summary

HEB.com uses modern anti-bot protection (likely DataDome and/or Cloudflare) that can detect standard automation tools. Based on research, the most successful approaches for grocery automation are:

1. **Chrome Extension approach** (least likely to be blocked - runs in real browser)
2. **Patchright** (undetected Playwright fork)
3. **Camoufox** (Firefox-based stealth browser)
4. **SeleniumBase UC Mode** (Chrome with anti-detection)
5. **CDP-based approaches** (Nodriver - directly controls Chrome)

The existing HEB Grocery Agent Chrome Extension by michellemayes confirms that extension-based automation works and is "less likely to be blocked than headless automation."

---

## 1. HEB.com Bot Protection Analysis

### Likely Protection Stack
Based on research of similar grocery sites and the observed behavior:
- **JavaScript fingerprinting** - Canvas, WebGL, audio context
- **Behavioral analysis** - Mouse movements, scroll patterns, timing
- **TLS fingerprinting (JA3/JA4)** - Detects automation libraries
- **IP reputation scoring** - Datacenter IP detection
- **Session consistency checks** - Fingerprint changes mid-session

### Detection Indicators
When blocked, you may see:
- CAPTCHA challenges
- "Checking your browser" pages (Cloudflare UAM)
- Silent failures (add to cart doesn't work)
- Rate limiting (429 errors)

---

## 2. Recommended Solutions (Ranked by Success Probability)

### Solution A: Chrome Extension (HIGHEST SUCCESS RATE)

**Why this works:** Extensions run in a REAL Chrome instance with a real user profile, making them virtually undetectable.

**Evidence:** The open-source `heb-grocery-agent` extension already successfully automates HEB.com shopping.

**Approach:**
1. Build a Chrome extension that injects content scripts into heb.com
2. Use manifest v3 with service worker for coordination
3. Content script performs automation directly on the page

**Key Code Structure:**

```javascript
// manifest.json
{
  "manifest_version": 3,
  "name": "HEB Cart Automation",
  "version": "1.0",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://www.heb.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["https://www.heb.com/*"],
    "js": ["content-script.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html"
  }
}
```

```javascript
// content-script.js - HEB automation logic
class HEBAutomator {
  constructor() {
    this.baseUrl = 'https://www.heb.com';
    this.delays = { min: 1500, max: 3500 };
  }

  async searchAndAdd(itemName) {
    // Navigate to search
    const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(itemName)}`;
    window.location.href = searchUrl;
    
    await this.waitForPageLoad();
    await this.randomDelay();
    
    // Find first product
    const addButton = await this.waitForSelector('[data-testid="add-to-cart"]', 5000);
    if (addButton) {
      // Simulate human-like click
      await this.humanLikeClick(addButton);
      return true;
    }
    return false;
  }

  async humanLikeClick(element) {
    // Move mouse with bezier curve (if using a mouse simulation library)
    // Add small random delay before click
    await this.randomDelay(200, 800);
    
    // Create and dispatch events in order
    const events = ['mousedown', 'mouseup', 'click'];
    for (const eventType of events) {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(event);
      await this.randomDelay(50, 150);
    }
  }

  async randomDelay(min = this.delays.min, max = this.delays.max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  waitForPageLoad() {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  waitForSelector(selector, timeout = 5000) {
    return new Promise(resolve => {
      const element = document.querySelector(selector);
      if (element) return resolve(element);
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const automator = new HEBAutomator();
  
  if (request.action === 'addItems') {
    (async () => {
      for (const item of request.items) {
        await automator.searchAndAdd(item);
        await automator.randomDelay(2000, 5000); // Delay between items
      }
      sendResponse({ success: true });
    })();
    return true; // Keep channel open for async
  }
});
```

**Advantages:**
- Runs in real browser with real user session
- No `navigator.webdriver` flag
- Natural mouse/keyboard events
- Cookies and localStorage persist naturally
- HEB already trusts the browser (user is logged in)

**Disadvantages:**
- Requires Chrome/Edge browser to be running
- User must be logged in
- Extension installation required

---

### Solution B: Patchright (Undetected Playwright)

**Why this works:** Patchright is a fork of Playwright specifically patched to avoid detection. It passes DataDome, Cloudflare, Akamai, and other major anti-bot systems.

**Installation:**
```bash
pip uninstall playwright
pip install patchright
patchright install chromium
```

**Basic Usage:**

```python
import asyncio
import random
from patchright.async_api import async_playwright

async def heb_automation():
    async with async_playwright() as p:
        # Launch with stealth settings
        browser = await p.chromium.launch(
            headless=False,  # Headed mode is less detectable
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
            ]
        )
        
        # Create context with realistic viewport and locale
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/Chicago',  # HEB is Texas-based
            geolocation={'latitude': 30.2672, 'longitude': -97.7431},  # Austin, TX
            permissions=['geolocation']
        )
        
        # Add init script to remove webdriver flags
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
            );
        """)
        
        page = await context.new_page()
        
        # Navigate to HEB
        await page.goto('https://www.heb.com', wait_until='networkidle')
        
        # Simulate human-like behavior
        await asyncio.sleep(random.uniform(2, 4))
        
        # Search for an item
        search_term = "milk"
        search_box = await page.wait_for_selector('[data-testid="search-input"]', timeout=5000)
        
        # Type like a human
        for char in search_term:
            await search_box.type(char, delay=random.randint(50, 150))
        
        await asyncio.sleep(random.uniform(0.5, 1.5))
        await search_box.press('Enter')
        
        # Wait for results and scroll like human
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(random.uniform(1, 3))
        
        # Random scroll
        for _ in range(random.randint(2, 5)):
            scroll_amount = random.randint(200, 600)
            await page.mouse.wheel(0, scroll_amount)
            await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Find and click add to cart
        add_button = await page.wait_for_selector('button:has-text("Add to cart")', timeout=5000)
        if add_button:
            await add_button.click()
            print("Item added to cart!")
        
        await asyncio.sleep(5)
        await browser.close()

if __name__ == '__main__':
    asyncio.run(heb_automation())
```

**Advantages:**
- Drop-in replacement for Playwright
- Passes major anti-bot systems
- Both sync and async APIs
- Python and Node.js support

**Disadvantages:**
- Chromium only (no Firefox/WebKit)
- Still requires careful behavior simulation

---

### Solution C: Camoufox (Firefox-Based Stealth)

**Why this works:** Camoufox modifies Firefox at the C++ level, making fingerprint spoofing undetectable by JavaScript. It achieves 0% detection on CreepJS and BrowserScan.

**Installation:**
```bash
pip install camoufox
playwright install firefox
```

**Usage:**

```python
from camoufox.sync_api import Camoufox
import time
import random

with Camoufox(headless=False) as browser:
    page = browser.new_page()
    
    # Navigate to HEB
    page.goto('https://www.heb.com')
    
    # Wait for load
    time.sleep(random.uniform(2, 4))
    
    # Search with human-like typing
    search_box = page.query_selector('input[type="search"]')
    if search_box:
        for char in "organic eggs":
            search_box.type(char)
            time.sleep(random.uniform(0.05, 0.15))
        
        search_box.press('Enter')
    
    # Wait and scroll
    time.sleep(random.uniform(3, 5))
    
    for _ in range(3):
        page.mouse.wheel(0, random.randint(200, 500))
        time.sleep(random.uniform(0.5, 1.5))
    
    # Add to cart
    add_buttons = page.query_selector_all('button:has-text("Add")')
    if add_buttons:
        add_buttons[0].click()
        print("Added to cart")
    
    time.sleep(5)
```

**Advanced Configuration:**

```python
config = {
    'window.outerHeight': 1080,
    'window.outerWidth': 1920,
    'window.innerHeight': 1008,
    'window.innerWidth': 1920,
    'navigator.language': 'en-US',
    'navigator.hardwareConcurrency': 8,
    'navigator.deviceMemory': 8,
}

with Camoufox(
    headless=True,
    config=config,
    geoip=True,  # Auto-match timezone to proxy location
    proxy={"server": "http://user:pass@proxy:8080"}
) as browser:
    # Your automation here
    pass
```

**Advantages:**
- Firefox-based (different fingerprint than Chrome)
- C++ level modifications (undetectable)
- Consistent fingerprint per session
- Built-in geoIP matching

**Disadvantages:**
- Requires Playwright Firefox installation
- Newer tool (smaller community)

---

### Solution D: SeleniumBase UC Mode (Chrome)

**Why this works:** UC Mode launches Chrome normally then attaches WebDriver, producing a fingerprint identical to human-launched Chrome.

**Installation:**
```bash
pip install seleniumbase
```

**Usage:**

```python
from seleniumbase import SB
import time
import random

def human_delay(min_sec=1.5, max_sec=4):
    time.sleep(random.uniform(min_sec, max_sec))

with SB(uc=True, headed=True) as sb:
    # Open HEB with auto-reconnect for challenges
    sb.uc_open_with_reconnect("https://www.heb.com", reconnect_time=4)
    
    # Handle any Turnstile/CAPTCHA if present
    sb.uc_gui_click_captcha()
    
    human_delay()
    
    # Search for items
    search_term = "ground beef"
    sb.type('input[data-testid="search-input"]', search_term)
    human_delay(0.5, 1.5)
    sb.press_keys('input[data-testid="search-input"]', "Return")
    
    # Wait for results
    human_delay(2, 4)
    
    # Scroll naturally
    for _ in range(random.randint(2, 4)):
        scroll_y = random.randint(300, 700)
        sb.execute_script(f"window.scrollBy(0, {scroll_y});")
        human_delay(0.5, 1.5)
    
    # Click add to cart
    sb.click('button:has-text("Add to cart")')
    
    print("Item added!")
    time.sleep(5)
```

**Advantages:**
- Built-in CAPTCHA handling
- Easy migration from Selenium
- Well-maintained
- Good documentation

---

### Solution E: Nodriver (CDP-Based)

**Why this works:** Nodriver uses Chrome DevTools Protocol directly, avoiding WebDriver detection vectors entirely.

**Installation:**
```bash
pip install nodriver
```

**Usage:**

```python
import nodriver as uc
import asyncio
import random

async def main():
    browser = await uc.start()
    page = await browser.get('https://www.heb.com')
    
    # Wait for load
    await page.sleep(random.uniform(2, 4))
    
    # Find and interact with search
    search_box = await page.select('input[type="search"]')
    if search_box:
        await search_box.send_keys('bananas')
        await page.sleep(random.uniform(0.5, 1.5))
        await search_box.send_keys(uc.Key.ENTER)
    
    # Wait for results
    await page.sleep(random.uniform(3, 5))
    
    # Scroll
    for _ in range(3):
        await page.scroll_down(random.randint(200, 500))
        await page.sleep(random.uniform(0.5, 1.5))
    
    # Find add to cart button
    add_buttons = await page.find_elements_by_text('Add to cart')
    if add_buttons:
        await add_buttons[0].click()
        print("Added to cart!")
    
    await page.sleep(5)
    await browser.stop()

if __name__ == '__main__':
    uc.loop().run_until_complete(main())
```

**Advantages:**
- No WebDriver detection
- Direct CDP control
- Lightweight

**Disadvantages:**
- Async-only API
- Smaller ecosystem

---

## 3. Key Stealth Techniques (Apply to ALL Solutions)

### A. TLS Fingerprint Impersonation
Standard libraries like Python `requests` have detectable TLS fingerprints. Use `curl_cffi` for API calls:

```python
from curl_cffi import requests

response = requests.get(
    "https://www.heb.com/api/search",
    impersonate="chrome136",  # Use Chrome's TLS fingerprint
    proxies={"http": proxy, "https": proxy}
)
```

### B. Human-Like Mouse Movement
```python
async def bezier_mouse_move(page, start_x, start_y, end_x, end_y):
    """Move mouse along Bezier curve with realistic acceleration"""
    ctrl_x = start_x + (end_x - start_x) * random.uniform(0.3, 0.7)
    ctrl_y = start_y + (end_y - start_y) * random.uniform(0.2, 0.8)
    
    steps = random.randint(20, 40)
    for i in range(steps + 1):
        t = i / steps
        # Quadratic Bezier
        x = (1-t)**2 * start_x + 2*(1-t)*t * ctrl_x + t**2 * end_x
        y = (1-t)**2 * start_y + 2*(1-t)*t * ctrl_y + t**2 * end_y
        
        await page.mouse.move(x, y)
        # Variable speed
        speed_factor = 4 * t * (1 - t)
        delay = random.uniform(5, 20) / (speed_factor + 0.5)
        await asyncio.sleep(delay / 1000)
```

### C. Natural Request Timing
```python
def human_delay(min_seconds=2, max_seconds=8):
    base_delay = random.uniform(min_seconds, max_seconds)
    
    # Add occasional longer pauses (10% chance)
    if random.random() < 0.1:
        base_delay += random.uniform(5, 15)
    
    # Add micro-variations
    jitter = random.gauss(0, 0.5)
    return max(0.5, base_delay + jitter)
```

### D. Consistent Session Management
```python
class SessionManager:
    def __init__(self):
        self.session_id = None
        self.fingerprint = None
        self.proxy = None
    
    async def create_session(self):
        # Generate consistent session
        self.session_id = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
        
        # Select proxy and stick with it for session
        self.proxy = self.select_healthy_proxy()
        
        # Create browser with consistent fingerprint
        self.browser = await patchright.chromium.launch(
            proxy={"server": self.proxy}
        )
        
        return self.browser
```

---

## 4. HEB-Specific Selectors & Tips

Based on common grocery site patterns and the existing HEB extension:

### Key Selectors to Use:
```javascript
// Search
const SEARCH_INPUT = '[data-testid="search-input"], input[placeholder*="Search"]';
const SEARCH_BUTTON = 'button[type="submit"], button[aria-label*="Search"]';

// Product results
const PRODUCT_CARDS = '[data-testid="product-card"], .product-card';
const PRODUCT_NAME = '[data-testid="product-name"], .product-name';
const PRODUCT_PRICE = '[data-testid="product-price"], .price';
const ADD_TO_CART_BUTTON = 'button:has-text("Add to cart"), [data-testid="add-to-cart"]';

// Cart
const CART_COUNT = '[data-testid="cart-count"], .cart-badge';
const CART_BUTTON = 'button[aria-label*="cart"], a[href*="cart"]';
```

### HEB-Specific Tips:
1. **Store selection matters** - Ensure user has a store selected before automation
2. **Age verification** - Some items trigger age verification modals
3. **Substitutions** - HEB may suggest substitutions; handle gracefully
4. **Out of stock** - Check for "Out of stock" indicators
5. **Login state** - Always verify user is logged in first

---

## 5. Proxy Recommendations

For HEB automation, use **residential proxies** from:
- Bright Data
- Oxylabs
- Smartproxy
- PacketStream

**Configuration:**
```python
# Rotate but maintain session consistency
proxy_manager = SessionProxyManager(residential_proxy_list)

# For HEB (Texas-based), use US proxies
proxy = proxy_manager.get_proxy(session_id, target_domain="heb.com")
```

---

## 6. Testing Your Setup

Test against these detection services:
1. **https://bot.sannysoft.com** - Basic detection
2. **https://nowsecure.nl** - Cloudflare detection
3. **https://abrahamjuliot.github.io/creepjs/** - Advanced fingerprinting
4. **https://www.browserscan.net/** - Comprehensive scan
5. **https://bot.incolumitas.com/** - Bot detection test

---

## 7. Recommended Implementation Path

### For Quick Fix (Current Setup):
1. **Switch from standard Playwright to Patchright**
2. **Use headed mode** (not headless)
3. **Add human-like delays** between actions
4. **Use persistent browser context** to maintain login
5. **Add realistic user-agent and viewport**

### For Most Reliable Solution:
1. **Build Chrome Extension** using the content script approach
2. Extension runs in user's real browser
3. Communicate with extension via native messaging or CDP

### Code Migration (Playwright → Patchright):
```bash
# 1. Uninstall original
pip uninstall playwright

# 2. Install patchright
pip install patchright
patchright install chromium

# 3. Update imports
# OLD: from playwright.async_api import async_playwright
# NEW: from patchright.async_api import async_playwright

# 4. Code remains mostly the same, just more stealthy!
```

---

## Summary

| Solution | Detection Resistance | Complexity | Best For |
|----------|---------------------|------------|----------|
| Chrome Extension | ★★★★★ (Excellent) | Medium | Long-term, production |
| Patchright | ★★★★☆ (Very Good) | Low | Quick migration from Playwright |
| Camoufox | ★★★★★ (Excellent) | Low-Medium | Maximum stealth needed |
| SeleniumBase UC | ★★★★☆ (Very Good) | Low | Selenium users |
| Nodriver | ★★★★☆ (Very Good) | Medium | CDP enthusiasts |

**Primary Recommendation:** Use **Patchright** for immediate migration from existing Playwright code, then consider a **Chrome Extension** for the most robust long-term solution.

---

## References

1. michellemayes/heb-grocery-agent (GitHub) - Existing HEB automation extension
2. Kaliiiiiiiiii-Vinyzu/patchright - Undetected Playwright fork
3. daijro/camoufox - Firefox-based stealth browser
4. seleniumbase/SeleniumBase - UC Mode for Selenium
5. ultrafunkamsterdam/nodriver - CDP-based automation
