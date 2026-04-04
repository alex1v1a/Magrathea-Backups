# Playwright Anti-Bot Techniques & Stealth Research 2025-2026

> **Research Date:** February 2026  
> **Focus:** Latest stealth techniques, anti-detection methods, and automation best practices for e-commerce and protected websites

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Modern Anti-Detect Frameworks (2025)](#modern-anti-detect-frameworks-2025)
3. [Core Stealth Techniques](#core-stealth-techniques)
4. [CDP (Chrome DevTools Protocol) Advanced Features](#cdp-chrome-devtools-protocol-advanced-features)
5. [E-Commerce Anti-Detection Strategies](#e-commerce-anti-detection-strategies)
6. [Session Persistence & Cookie Management](#session-persistence--cookie-management)
7. [Rate Limiting & Retry Patterns](#rate-limiting--retry-patterns)
8. [Detection Testing & Validation](#detection-testing--validation)
9. [Code Examples](#code-examples)
10. [References](#references)

---

## Executive Summary

The browser automation landscape has evolved significantly in 2025. Traditional JavaScript-injection-based stealth methods are becoming less effective as anti-bot systems have adapted. The current state of the art involves:

- **Protocol-level evasion** (avoiding CDP detection rather than patching it)
- **C++ level fingerprint injection** (Camoufox approach)
- **Runtime.Enable leak patching** (Patchright, Rebrowser patches)
- **Minimal-CDP or CDP-free automation** (nodriver)

Key detection vectors being targeted by modern WAFs:
- `Runtime.Enable` CDP command detection
- Console API side effects from CDP
- Navigator.webdriver flag
- Fingerprint inconsistencies across contexts
- Behavioral pattern analysis

---

## Modern Anti-Detect Frameworks (2025)

### 1. **Patchright** (Python)
A drop-in replacement for Playwright with built-in patches for major detection vectors.

**Key Patches:**
- `Runtime.Enable` leak avoidance via isolated ExecutionContexts
- `Console.Enable` leak patched (disables Console API)
- Command flags leak fixes
- Closed Shadow Root interaction support

**Installation:**
```bash
pip install patchright
patchright install chromium
```

**Best Practice Configuration:**
```python
from patchright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch_persistent_context(
        user_data_dir="/path/to/profile",
        channel="chrome",  # Use real Chrome, not Chromium
        headless=False,
        no_viewport=True,
        # Do NOT add custom headers or user_agent
    )
```

**Detection Pass Status (2025):**
- ✅ Cloudflare
- ✅ Kasada
- ✅ Akamai
- ✅ DataDome
- ✅ Fingerprint.com
- ✅ CreepJS
- ✅ Sannysoft
- ✅ Pixelscan

---

### 2. **Camoufox** (Firefox-based)
A custom Firefox build with C++ level fingerprint injection and stealth patches.

**Unique Features:**
- Page agent sandboxing (Playwright code is invisible to JavaScript inspection)
- Fingerprint injection at C++ level (undetectable via JS)
- Uses BrowserForge for statistically accurate fingerprints
- Human-like cursor movement in C++
- WebRTC IP spoofing at protocol level

**Python Usage:**
```python
from camoufox.sync_api import Camoufox

with Camoufox() as browser:
    page = browser.new_page()
    page.goto("https://example.com")
```

**Fingerprint Spoofing Capabilities:**
- Navigator properties (device, OS, hardware, browser)
- Screen size, resolution, viewport
- WebGL parameters and extensions
- AudioContext properties
- Device voices & playback rates
- Battery API
- Geolocation, timezone, locale

---

### 3. **Nodriver** (Python, CDP-free)
Successor to Undetected-Chromedriver. No Selenium, no WebDriver, pure CDP communication.

**Key Features:**
- No chromedriver binary needed
- Direct CDP communication
- OS-level input emulation
- Fresh profile on each run
- Automatic cleanup

```python
import nodriver as uc

async def main():
    browser = await uc.start()
    page = await browser.get('https://www.nowsecure.nl')
    # ... automation logic

uc.loop().run_until_complete(main())
```

---

### 4. **Playwright-Extra + Stealth Plugin** (JavaScript)
The original stealth approach, still effective for moderate protection.

```javascript
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();

chromium.use(stealth);

chromium.launch({ headless: true }).then(async (browser) => {
    const page = await browser.newPage();
    await page.goto("https://bot.sannysoft.com");
    await browser.close();
});
```

---

## Core Stealth Techniques

### 1. Disabling navigator.webdriver Flag

The most basic but essential stealth technique:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    
    # Inject script to disable webdriver flag
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        })
    """)
    
    page = context.new_page()
    page.goto("https://bot.sannysoft.com/")
```

### 2. User-Agent Randomization

```python
import random
from playwright.sync_api import sync_playwright

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
]

with sync_playwright() as p:
    context = browser.new_context(
        user_agent=random.choice(USER_AGENTS)
    )
```

### 3. Realistic Viewport & Device Emulation

```python
VIEWPORTS = [
    {"width": 1920, "height": 1080},  # Desktop
    {"width": 1366, "height": 768},   # Laptop
    {"width": 390, "height": 844},    # iPhone 14
    {"width": 412, "height": 915},    # Android
]

context = browser.new_context(
    viewport=random.choice(VIEWPORTS),
    device_scale_factor=1,
    locale='en-US',
    timezone_id='America/New_York'
)
```

### 4. Human-Like Interaction Patterns

```python
import random
import time

async def human_like_typing(page, selector, text):
    """Type text with human-like delays"""
    for char in text:
        await page.type(selector, char, delay=random.uniform(50, 200))
        # Random pause between words
        if char == ' ':
            time.sleep(random.uniform(0.1, 0.3))

async def human_like_mouse_move(page, x, y):
    """Move mouse with bezier curve simulation"""
    steps = random.randint(5, 15)
    await page.mouse.move(x, y, steps=steps)
    time.sleep(random.uniform(0.1, 0.5))

async def random_delay(min_seconds=1, max_seconds=3):
    """Random delay between actions"""
    time.sleep(random.uniform(min_seconds, max_seconds))
```

---

## CDP (Chrome DevTools Protocol) Advanced Features

### The Runtime.Enable Detection Problem

**Critical Issue (2024-2025):** Major anti-bot systems (Cloudflare, DataDome) now detect CDP automation through the `Runtime.Enable` command.

**How it works:**
1. Automation tools use `Runtime.Enable` to get ExecutionContextIds
2. This enables `Runtime.consoleAPICalled` events
3. Anti-bot scripts trigger serialization via `console.log(errorObject)`
4. If CDP is listening, side effects reveal automation

**Test Sites:**
- https://kaliiiiiiiiii.github.io/brotector/
- https://deviceandbrowserinfo.com/are_you_a_bot
- https://bot-detector.rebrowser.net/

### Solutions:

#### 1. **Rebrowser Patches** (Manual patching)
```bash
# Apply patches to Playwright/Puppeteer source
npx rebrowser-patches@latest patch --packageName playwright-core
```

**Patch approaches:**
- **Isolated Context:** Create new isolated world via `Page.createIsolatedWorld`
- **Runtime.Enable + Disable:** Call `Runtime.Enable` then immediately `Runtime.Disable`

#### 2. **Using CDP for Advanced Control**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    page = context.new_page()
    
    # Create CDP session
    client = context.new_cdp_session(page)
    
    # Block image requests
    client.send("Network.enable")
    client.send("Network.setBlockedURLs", {
        "urls": ["*.png", "*.jpg", "*.jpeg", "*.gif"]
    })
    
    # Capture console logs
    client.send("Log.enable")
    def handle_log(params):
        print(f"Console: {params['entry']['level']} - {params['entry']['text']}")
    client.on("Log.entryAdded", handle_log)
    
    # Emulate network conditions
    client.send("Network.emulateNetworkConditions", {
        "offline": False,
        "latency": 200,
        "downloadThroughput": 50000,
        "uploadThroughput": 20000
    })
```

### Advanced CDP Features for Stealth:

```python
# Execute script before any page scripts run
client.send("Page.addScriptToEvaluateOnNewDocument", {
    "source": """
        // Hide automation indicators
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]});
    """
})

# Intercept and modify requests
client.send("Fetch.enable", {"patterns": [{"urlPattern": "*"}]})

def handle_request(params):
    client.send("Fetch.continueRequest", {
        "requestId": params["requestId"],
        "headers": [
            {"name": "X-Custom-Header", "value": "value"}
        ]
    })

client.on("Fetch.requestPaused", handle_request)
```

---

## E-Commerce Anti-Detection Strategies

### Common E-Commerce Protection Systems

| Platform | Protection | Recommended Approach |
|----------|------------|---------------------|
| Shopify | Basic fingerprinting | Patchright + realistic delays |
| Amazon | Advanced (Kasada) | Camoufox or residential proxies |
| Walmart | DataDome | Patchright with proxy rotation |
| Target | Shape/F5 | Full stealth stack + behavioral mimicry |
| eBay | Multiple layers | Persistent sessions + human patterns |

### E-Commerce Specific Techniques:

#### 1. **Cart Abandonment Pattern Simulation**
```python
# Mimic real shopping behavior
async def realistic_shopping_flow(page):
    # Browse category
    await page.goto("https://example.com/category")
    await random_delay(3, 7)
    
    # Scroll like a human
    await page.evaluate("""
        async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100 + Math.random() * 100);
            });
        }
    """)
    
    # Click product after "reading"
    await random_delay(2, 5)
    await page.click(".product-item:first-child")
    
    # View product details
    await random_delay(4, 8)
    
    # Add to cart with hesitation
    await human_like_mouse_move(page, 800, 600)
    await random_delay(1, 3)
    await page.click("#add-to-cart")
```

#### 2. **Checkout Flow Handling**
```python
# Handle address entry naturally
async def enter_address(page, address_data):
    # Focus field naturally
    await page.click("#address-input")
    await random_delay(0.5, 1.5)
    
    # Type with human-like errors and corrections
    for field, value in address_data.items():
        await human_like_typing(page, f"#{field}", value)
        await page.press(f"#{field}", "Tab")
        await random_delay(0.3, 1.0)
```

---

## Session Persistence & Cookie Management

### Best Practices for 2025

#### 1. **Persistent Context Approach**
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    # Create persistent context
    context = p.chromium.launch_persistent_context(
        user_data_dir="./playwright_cache/profile_1",
        headless=False,
        viewport={"width": 1920, "height": 1080}
    )
    
    page = context.new_page()
    page.goto("https://example.com")
    
    # Cookies and storage are automatically saved
    # Next run will use same session
```

#### 2. **Storage State Export/Import**
```python
# Save authentication state
async def save_auth_state(context, path="auth.json"):
    await context.storage_state(path=path)

# Load authentication state
context = await browser.new_context(
    storage_state="auth.json"
)
```

#### 3. **Cookie Management**
```python
# Add specific cookies
await context.add_cookies([
    {
        "name": "session_id",
        "value": "abc123",
        "domain": ".example.com",
        "path": "/",
        "expires": 1893456000,
        "httpOnly": True,
        "secure": True,
        "sameSite": "Lax"
    }
])

# Get all cookies
cookies = await context.cookies()

# Clear cookies
await context.clear_cookies()
```

#### 4. **Session Rotation Pattern**
```python
import json
import os
from pathlib import Path

class SessionManager:
    def __init__(self, sessions_dir="./sessions"):
        self.sessions_dir = Path(sessions_dir)
        self.sessions_dir.mkdir(exist_ok=True)
    
    def get_session(self, account_id):
        """Get or create session for account"""
        session_path = self.sessions_dir / f"{account_id}.json"
        
        if session_path.exists():
            with open(session_path) as f:
                return json.load(f)
        return None
    
    def save_session(self, account_id, storage_state):
        """Save session state"""
        session_path = self.sessions_dir / f"{account_id}.json"
        with open(session_path, "w") as f:
            json.dump(storage_state, f)
    
    def rotate_session(self, context, account_id):
        """Save current and load new session"""
        # Save current
        current_state = context.storage_state()
        # In real implementation, track current account
        
        # Load new
        new_state = self.get_session(account_id)
        return new_state
```

---

## Rate Limiting & Retry Patterns

### Exponential Backoff with Jitter

```python
import random
import time
from functools import wraps

def exponential_backoff_with_jitter(
    max_retries=5,
    base_delay=1,
    max_delay=60,
    exceptions=(Exception,)
):
    """Decorator for retry logic with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries - 1:
                        raise
                    
                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    
                    # Add jitter (±10%)
                    jitter = random.uniform(-delay * 0.1, delay * 0.1)
                    sleep_time = delay + jitter
                    
                    print(f"Attempt {attempt + 1} failed: {e}")
                    print(f"Retrying in {sleep_time:.2f} seconds...")
                    time.sleep(sleep_time)
            
            return None
        return wrapper
    return decorator

# Usage
@exponential_backoff_with_jitter(max_retries=5, base_delay=2)
def scrape_page(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.text
```

### Adaptive Rate Limiting

```python
class AdaptiveRateLimiter:
    """Adjusts rate based on server responses"""
    
    def __init__(self, base_delay=1.0, max_delay=60.0):
        self.base_delay = base_delay
        self.current_delay = base_delay
        self.max_delay = max_delay
        self.success_count = 0
        self.failure_count = 0
    
    def on_success(self):
        """Call when request succeeds"""
        self.success_count += 1
        self.failure_count = 0
        
        # Gradually reduce delay
        if self.success_count >= 5:
            self.current_delay = max(
                self.base_delay,
                self.current_delay * 0.9
            )
            self.success_count = 0
    
    def on_rate_limited(self):
        """Call when rate limited (429)"""
        self.failure_count += 1
        self.success_count = 0
        
        # Exponential increase
        self.current_delay = min(
            self.max_delay,
            self.current_delay * 2
        )
    
    def wait(self):
        """Wait for current delay"""
        jitter = random.uniform(0, self.current_delay * 0.1)
        time.sleep(self.current_delay + jitter)
```

### Proxy Rotation Strategy

```python
import random
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Proxy:
    server: str
    username: Optional[str] = None
    password: Optional[str] = None
    fail_count: int = 0
    last_used: float = 0

class ProxyRotator:
    def __init__(self, proxies: List[Proxy], max_failures=3):
        self.proxies = proxies
        self.max_failures = max_failures
        self.current_index = 0
    
    def get_next(self) -> Proxy:
        """Get next available proxy"""
        available = [p for p in self.proxies if p.fail_count < self.max_failures]
        
        if not available:
            # Reset all if none available
            for p in self.proxies:
                p.fail_count = 0
            available = self.proxies
        
        # Weight by least recently used
        available.sort(key=lambda p: p.last_used)
        proxy = available[0]
        proxy.last_used = time.time()
        
        return proxy
    
    def report_failure(self, proxy: Proxy):
        """Report proxy failure"""
        proxy.fail_count += 1
    
    def to_playwright_format(self, proxy: Proxy) -> dict:
        """Convert to Playwright proxy format"""
        result = {"server": proxy.server}
        if proxy.username:
            result["username"] = proxy.username
            result["password"] = proxy.password
        return result
```

---

## Detection Testing & Validation

### Test Sites for Stealth Validation

| Site | Tests | Difficulty |
|------|-------|------------|
| https://bot.sannysoft.com/ | Basic fingerprinting | Easy |
| https://arh.antoinevastel.com/bots/areyouheadless | Headless detection | Easy |
| https://abrahamjuliot.github.io/creepjs/ | Advanced fingerprinting | Medium |
| https://pixelscan.net/ | Comprehensive checks | Medium |
| https://www.browserscan.net/ | CDP detection | Hard |
| https://kaliiiiiiiiii.github.io/brotector/ | Runtime.Enable leak | Hard |
| https://iphey.com/ | IP and fingerprint | Medium |
| https://bot.incolumitas.com/ | Multi-vector detection | Hard |

### Automated Validation Script

```python
import asyncio
from playwright.async_api import async_playwright

STEALTH_TEST_URLS = [
    "https://bot.sannysoft.com/",
    "https://arh.antoinevastel.com/bots/areyouheadless",
    "https://abrahamjuliot.github.io/creepjs/"
]

async def test_stealth(browser_type="chromium"):
    """Test stealth configuration against detection sites"""
    results = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for url in STEALTH_TEST_URLS:
            context = await browser.new_context()
            page = await context.new_page()
            
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                
                # Take screenshot for manual review
                await page.screenshot(path=f"stealth_test_{url.split('/')[-1]}.png")
                
                # Check for common detection indicators
                webdriver = await page.evaluate("() => navigator.webdriver")
                plugins = await page.evaluate("() => navigator.plugins.length")
                
                results[url] = {
                    "webdriver": webdriver,
                    "plugins": plugins,
                    "status": "checked"
                }
                
            except Exception as e:
                results[url] = {"error": str(e)}
            finally:
                await context.close()
        
        await browser.close()
    
    return results

# Run tests
results = asyncio.run(test_stealth())
print(json.dumps(results, indent=2))
```

---

## Code Examples

### Complete Stealth Setup (Python)

```python
"""
Production-ready Playwright stealth configuration
"""
import random
import asyncio
from playwright.async_api import async_playwright

class StealthBrowser:
    def __init__(self):
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ]
        self.viewports = [
            {"width": 1920, "height": 1080},
            {"width": 1366, "height": 768},
        ]
    
    async def create_context(self, browser, proxy=None):
        """Create stealth browser context"""
        
        context_options = {
            "viewport": random.choice(self.viewports),
            "user_agent": random.choice(self.user_agents),
            "locale": "en-US",
            "timezone_id": "America/New_York",
            "device_scale_factor": 1,
            "has_touch": False,
            "permissions": ["notifications"],
        }
        
        if proxy:
            context_options["proxy"] = proxy
        
        context = await browser.new_context(**context_options)
        
        # Add stealth scripts
        await context.add_init_script("""
            // Hide webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Fake plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {name: "Chrome PDF Plugin"},
                    {name: "Native Client"}
                ]
            });
            
            // Fake languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            
            // Hide automation
            delete navigator.__proto__.webdriver;
        """)
        
        return context
    
    async def human_like_scroll(self, page):
        """Scroll with human-like behavior"""
        await page.evaluate("""
            async () => {
                const delay = ms => new Promise(r => setTimeout(r, ms));
                const scrollHeight = document.body.scrollHeight;
                const viewportHeight = window.innerHeight;
                let currentPosition = 0;
                
                while (currentPosition < scrollHeight - viewportHeight) {
                    const scrollAmount = Math.floor(Math.random() * 100) + 50;
                    currentPosition += scrollAmount;
                    window.scrollTo(0, currentPosition);
                    await delay(Math.random() * 200 + 100);
                }
            }
        """)
    
    async def type_human_like(self, page, selector, text):
        """Type with human-like delays"""
        for char in text:
            await page.type(selector, char, delay=random.uniform(50, 150))
            if char in [' ', '.', ',']:
                await asyncio.sleep(random.uniform(0.1, 0.3))

# Usage
async def main():
    stealth = StealthBrowser()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        )
        
        context = await stealth.create_context(browser)
        page = await context.new_page()
        
        await page.goto("https://example.com")
        await stealth.human_like_scroll(page)
        
        await browser.close()

asyncio.run(main())
```

### Session Persistence Manager

```python
import json
import os
from pathlib import Path
from datetime import datetime, timedelta

class SessionManager:
    """
    Manages persistent sessions for multiple accounts
    """
    
    def __init__(self, storage_dir="./sessions"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.session_metadata = self._load_metadata()
    
    def _load_metadata(self):
        metadata_path = self.storage_dir / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path) as f:
                return json.load(f)
        return {}
    
    def _save_metadata(self):
        metadata_path = self.storage_dir / "metadata.json"
        with open(metadata_path, "w") as f:
            json.dump(self.session_metadata, f, indent=2)
    
    def get_storage_state(self, account_id):
        """Load storage state for account"""
        state_path = self.storage_dir / f"{account_id}_state.json"
        
        if not state_path.exists():
            return None
        
        # Check if expired
        meta = self.session_metadata.get(account_id, {})
        expires_at = meta.get("expires_at")
        
        if expires_at and datetime.fromisoformat(expires_at) < datetime.now():
            print(f"Session for {account_id} expired")
            return None
        
        with open(state_path) as f:
            return json.load(f)
    
    def save_storage_state(self, account_id, state, ttl_hours=24):
        """Save storage state with TTL"""
        state_path = self.storage_dir / f"{account_id}_state.json"
        
        with open(state_path, "w") as f:
            json.dump(state, f)
        
        # Update metadata
        self.session_metadata[account_id] = {
            "saved_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(hours=ttl_hours)).isoformat()
        }
        self._save_metadata()
    
    def invalidate_session(self, account_id):
        """Remove session for account"""
        state_path = self.storage_dir / f"{account_id}_state.json"
        if state_path.exists():
            state_path.unlink()
        
        if account_id in self.session_metadata:
            del self.session_metadata[account_id]
            self._save_metadata()

# Integration with Playwright
async def login_with_session_persistence(page, account_id, credentials, session_manager):
    """Login with session persistence"""
    
    # Try to use existing session
    storage_state = session_manager.get_storage_state(account_id)
    
    if storage_state:
        print(f"Using existing session for {account_id}")
        return True
    
    # Perform login
    print(f"Logging in {account_id}...")
    await page.goto("https://example.com/login")
    
    await page.fill("#username", credentials["username"])
    await page.fill("#password", credentials["password"])
    await page.click("#login-button")
    
    # Wait for login success
    await page.wait_for_selector(".dashboard", timeout=10000)
    
    # Save session
    state = await page.context.storage_state()
    session_manager.save_storage_state(account_id, state)
    
    return True
```

---

## References

### Frameworks & Libraries
- [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-python) - Patched Playwright
- [Camoufox](https://github.com/daijro/camoufox) - Anti-detect Firefox
- [Nodriver](https://github.com/ultrafunkamsterdam/nodriver) - CDP-free automation
- [Playwright-Extra](https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra) - Enhanced Playwright
- [Rebrowser Patches](https://github.com/rebrowser/rebrowser-patches) - Runtime.Enable fixes
- [BrowserForge](https://github.com/daijro/browserforge) - Fingerprint generation

### Articles & Research
- [DataDome: CDP Detection Research](https://datadome.co/threat-research/how-new-headless-chrome-the-cdp-signal-are-impacting-bot-detection/)
- [Rebrowser: Runtime.Enable Fix](https://rebrowser.net/blog/how-to-fix-runtime-enable-cdp-detection-of-puppeteer-playwright-and-other-automation-libraries)
- [Castle.io: Anti-Detect Framework Evolution](https://blog.castle.io/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/)
- [BrightData: Playwright Stealth Guide](https://brightdata.com/blog/how-tos/avoid-bot-detection-with-playwright-stealth)
- [ScrapeOps: Undetectable Playwright](https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-make-playwright-undetectable/)

### Testing Resources
- [Sannysoft Bot Detection](https://bot.sannysoft.com/)
- [CreepJS Fingerprinting](https://abrahamjuliot.github.io/creepjs/)
- [Brotector CDP Detector](https://kaliiiiiiiiii.github.io/brotector/)
- [Pixelscan](https://pixelscan.net/)
- [Browserscan](https://www.browserscan.net/)

---

*Last Updated: February 2026*

*Note: Anti-bot techniques are in constant evolution. The methods documented here represent the state of the art as of early 2026. Regular testing against detection services and framework updates is recommended.*
