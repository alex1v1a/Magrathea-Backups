# HEB Cart Automation - Alternative Approaches

> **Status**: Research Phase  
> **Goal**: Find reliable alternatives to Playwright for HEB automation  
> **Priority**: Quick wins first

---

## Executive Summary

| Approach | Time to Implement | Likelihood of Success | Best For |
|----------|------------------|----------------------|----------|
| 1. Enhanced Browser Extension | 2-4 hours | ⭐⭐⭐⭐⭐ (90%) | **RECOMMENDED** - Already partially implemented |
| 2. Selenium + Undetected Chrome | 4-6 hours | ⭐⭐⭐⭐ (75%) | Python shops, complex interactions |
| 3. Puppeteer Extra Stealth | 3-5 hours | ⭐⭐⭐ (60%) | Node.js projects, similar to Playwright |
| 4. Mobile App API | 8-16 hours | ⭐⭐ (30%) | Long-term, requires reverse engineering |
| 5. Manual Session Replay | 2-3 hours setup | ⭐⭐⭐ (50%) | Fallback option, maintenance-heavy |

---

## 1. Enhanced Browser Extension Method ⭐ RECOMMENDED

### Current Status
Extension exists at `dinner-automation/heb-extension/` with basic functionality. Needs API exposure layer.

### Concept
Inject content script into HEB.com that exposes a local HTTP/WebSocket API. External scripts can then control the browser without triggering bot detection (actions originate from real browser context).

### Pros
- ✅ **Actions originate from real browser** - No automation flags
- ✅ **Can use existing logged-in session** - No credential management
- ✅ **Low maintenance** - Extension updates with browser
- ✅ **Already partially built** - Fastest path to working solution
- ✅ **Handles JavaScript-heavy sites** naturally
- ✅ **Works with HEB's anti-bot measures**

### Cons
- ❌ Browser must remain open
- ❌ Extension installation required
- ❌ Single-browser focus (can't run headless easily)
- ❌ Limited to one tab control at a time

### Implementation Steps

1. **Add API Server to Extension**
   ```javascript
   // content-script-api.js - Add to extension
   class HEBCartAPI {
     constructor() {
       this.port = 8765;
       this.server = null;
       this.initServer();
     }
     
     async initServer() {
       // Use chrome.runtime.connectNative or custom protocol
       // For simplicity, use window.postMessage bridge
       window.addEventListener('message', this.handleMessage.bind(this));
     }
     
     async handleMessage(event) {
       if (event.source !== window) return;
       if (event.data.type !== 'HEB_CART_COMMAND') return;
       
       const { command, payload } = event.data;
       const result = await this.executeCommand(command, payload);
       
       window.postMessage({
         type: 'HEB_CART_RESPONSE',
         id: event.data.id,
         result
       }, '*');
     }
     
     async executeCommand(command, payload) {
       switch(command) {
         case 'search':
           return this.searchProduct(payload.term);
         case 'addToCart':
           return this.addToCart(payload.productId, payload.quantity);
         case 'getCart':
           return this.getCartItems();
         case 'removeFromCart':
           return this.removeFromCart(payload.itemId);
         case 'setStore':
           return this.setStore(payload.storeId);
         default:
           throw new Error(`Unknown command: ${command}`);
       }
     }
     
     async searchProduct(term) {
       // Use HEB's internal React components
       const searchInput = document.querySelector('input[placeholder*="Search"]');
       if (!searchInput) throw new Error('Search input not found');
       
       searchInput.focus();
       searchInput.value = term;
       searchInput.dispatchEvent(new Event('input', { bubbles: true }));
       
       // Submit search
       const form = searchInput.closest('form');
       form?.dispatchEvent(new Event('submit', { bubbles: true }));
       
       // Wait for results
       await this.waitForElement('[data-testid="product-grid"]');
       
       // Extract products
       return this.extractProducts();
     }
     
     async addToCart(productId, quantity = 1) {
       // Find product on page
       const product = document.querySelector(`[data-product-id="${productId}"]`);
       if (!product) {
         // Try finding by search
         await this.searchProduct(productId);
       }
       
       // Click add button
       const addBtn = document.querySelector('button[data-testid*="add"], button[aria-label*="Add"]');
       if (!addBtn) throw new Error('Add button not found');
       
       // Human-like click
       addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
       await this.sleep(500);
       addBtn.click();
       
       // Wait for confirmation
       await this.waitForElement('[data-testid*="cart-count"], .cart-updated');
       
       return { success: true, productId, quantity };
     }
     
     async getCartItems() {
       // Navigate to cart page
       window.location.href = 'https://www.heb.com/cart';
       await this.waitForElement('.cart-items, [data-testid="cart-items"]');
       
       // Extract cart items
       const items = [];
       const itemElements = document.querySelectorAll('.cart-item, [data-testid="cart-item"]');
       
       itemElements.forEach(el => {
         items.push({
           id: el.dataset.itemId || el.dataset.productId,
           name: el.querySelector('.product-name, h3')?.textContent?.trim(),
           quantity: el.querySelector('.quantity-input')?.value,
           price: el.querySelector('.price')?.textContent?.trim()
         });
       });
       
       return items;
     }
     
     async waitForElement(selector, timeout = 10000) {
       return new Promise((resolve, reject) => {
         const el = document.querySelector(selector);
         if (el) return resolve(el);
         
         const observer = new MutationObserver(() => {
           const el = document.querySelector(selector);
           if (el) {
             observer.disconnect();
             resolve(el);
           }
         });
         
         observer.observe(document.body, { childList: true, subtree: true });
         
         setTimeout(() => {
           observer.disconnect();
           reject(new Error(`Timeout waiting for ${selector}`));
         }, timeout);
       });
     }
     
     sleep(ms) {
       return new Promise(r => setTimeout(r, ms));
     }
   }
   
   // Initialize
   const api = new HEBCartAPI();
   console.log('HEB Cart API initialized');
   ```

2. **Create External Bridge Script**
   ```javascript
   // bridge.js - Node.js script to communicate with extension
   const WebSocket = require('ws');
   const express = require('express');
   
   class HEBExtensionBridge {
     constructor() {
       this.app = express();
       this.wss = null;
       this.browserTab = null;
     }
     
     async start() {
       // REST API for external control
       this.app.use(express.json());
       
       this.app.post('/api/cart/add', this.handleAdd.bind(this));
       this.app.get('/api/cart', this.handleGetCart.bind(this));
       this.app.post('/api/cart/sync', this.handleSync.bind(this));
       
       this.app.listen(3000, () => {
         console.log('HEB Bridge API listening on http://localhost:3000');
       });
     }
     
     async handleAdd(req, res) {
       const { items } = req.body;
       
       // Send command to browser extension via CDP or postMessage
       const results = [];
       for (const item of items) {
         const result = await this.sendToExtension('addToCart', item);
         results.push(result);
         await this.sleep(2000); // Rate limiting
       }
       
       res.json({ success: true, results });
     }
     
     async sendToExtension(command, payload) {
       // Use Chrome DevTools Protocol (CDP) to execute in page context
       // Or use puppeteer to connect to existing browser
       const puppeteer = require('puppeteer-core');
       
       const browser = await puppeteer.connect({
         browserURL: 'http://localhost:9222', // Chrome debug port
         defaultViewport: null
       });
       
       const pages = await browser.pages();
       const hebPage = pages.find(p => p.url().includes('heb.com'));
       
       if (!hebPage) {
         throw new Error('No HEB tab found. Please open heb.com first.');
       }
       
       // Execute command in page context
       return await hebPage.evaluate((cmd, data) => {
         return new Promise((resolve, reject) => {
           const id = Math.random().toString(36);
           
           window.postMessage({
             type: 'HEB_CART_COMMAND',
             id,
             command: cmd,
             payload: data
           }, '*');
           
           const handler = (e) => {
             if (e.data.type === 'HEB_CART_RESPONSE' && e.data.id === id) {
               window.removeEventListener('message', handler);
               resolve(e.data.result);
             }
           };
           
           window.addEventListener('message', handler);
           setTimeout(() => reject(new Error('Timeout')), 30000);
         });
       }, command, payload);
     }
     
     sleep(ms) {
       return new Promise(r => setTimeout(r, ms));
     }
   }
   
   // Start bridge
   const bridge = new HEBExtensionBridge();
   bridge.start();
   ```

3. **Update Manifest**
   ```json
   {
     "content_scripts": [{
       "matches": ["https://www.heb.com/*"],
       "js": ["content-script-api.js"],
       "run_at": "document_end"
     }],
     "externally_connectable": {
       "matches": ["https://www.heb.com/*"],
       "accepts_tls_channel_id": false
     }
   }
   ```

### Sample Usage
```bash
# 1. Start Edge with remote debugging
start msedge --remote-debugging-port=9222

# 2. Navigate to heb.com and login

# 3. Run bridge
node bridge.js

# 4. Add items via API
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"items": [{"name": "milk", "quantity": 1}]}'
```

### Likelihood of Success: 90%
**Why it works**: Actions are performed by actual browser JavaScript execution, indistinguishable from user actions. No automation flags in headers or navigator properties.

---

## 2. Selenium with Undetected ChromeDriver

### Concept
Use `undetected-chromedriver` (Python) which patches ChromeDriver to bypass bot detection systems like Cloudflare, DataDome, Imperva.

### Pros
- ✅ **Proven bypass** for major anti-bot systems
- ✅ **Python ecosystem** - Rich libraries
- ✅ **Headless support** - Can run without GUI
- ✅ **Active maintenance** - Regular updates
- ✅ **Well-documented** - Large community

### Cons
- ❌ **Python dependency** - Different from existing Node stack
- ❌ **Browser version matching** - Can be finicky
- ❌ **Still detectable** by advanced heuristics (mouse movement patterns)
- ❌ **Requires Chrome** - Not Edge-specific

### Implementation Steps

1. **Install Dependencies**
   ```bash
   pip install undetected-chromedriver selenium
   pip install webdriver-manager
   ```

2. **Basic HEB Automation Script**
   ```python
   # heb_selenium.py
   import undetected_chromedriver as uc
   from selenium.webdriver.common.by import By
   from selenium.webdriver.support.ui import WebDriverWait
   from selenium.webdriver.support import expected_conditions as EC
   from selenium.webdriver.common.action_chains import ActionChains
   import time
   import json
   
   class HEBSeleniumBot:
       def __init__(self):
           self.driver = None
           self.wait = None
           
       def start(self):
           """Initialize undetected Chrome"""
           options = uc.ChromeOptions()
           
           # Mimic real user
           options.add_argument('--disable-blink-features=AutomationControlled')
           options.add_argument('--disable-web-security')
           options.add_argument('--disable-features=IsolateOrigins,site-per-process')
           options.add_argument('--disable-site-isolation-trials')
           
           # User profile (maintains login)
           options.user_data_dir = r"C:\temp\heb_profile"
           
           # Create driver with specific Chrome version
           self.driver = uc.Chrome(options=options, version_main=None)
           self.wait = WebDriverWait(self.driver, 20)
           
           # Remove webdriver property
           self.driver.execute_script("""
               Object.defineProperty(navigator, 'webdriver', {
                   get: () => undefined
               })
           """)
           
       def search_and_add(self, term, quantity=1):
           """Search for product and add to cart"""
           try:
               # Navigate to search
               search_url = f"https://www.heb.com/search?q={term.replace(' ', '+')}"
               self.driver.get(search_url)
               
               # Wait for results (randomized wait)
               time.sleep(3 + (hash(term) % 3))  # 3-6 seconds
               
               # Find first product add button
               add_button = self.wait.until(
                   EC.element_to_be_clickable((By.CSS_SELECTOR, 
                       'button[data-testid*="add"], button[aria-label*="Add"], button:contains("Add")'
                   ))
               )
               
               # Human-like mouse movement
               actions = ActionChains(self.driver)
               actions.move_to_element(add_button)
               actions.pause(0.5 + (hash(term) % 10) / 10)  # 0.5-1.5s pause
               actions.click()
               actions.perform()
               
               # Wait for confirmation
               time.sleep(2)
               
               # Check for success indicator
               success = self.driver.find_elements(By.CSS_SELECTOR, 
                   '[data-testid*="cart-count"], .cart-updated, [aria-live="polite"]'
               )
               
               return {'success': len(success) > 0, 'term': term}
               
           except Exception as e:
               return {'success': False, 'term': term, 'error': str(e)}
       
       def get_cart_items(self):
           """Get current cart contents"""
           self.driver.get('https://www.heb.com/cart')
           time.sleep(3)
           
           items = []
           try:
               # Wait for cart to load
               self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 
                   '.cart-items, [data-testid="cart-items"], .cart-page'
               )))
               
               # Extract items
               item_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                   '.cart-item, [data-testid="cart-item"]'
               )
               
               for el in item_elements:
                   try:
                       name = el.find_element(By.CSS_SELECTOR, 
                           '.product-name, h3, [data-testid*="name"]'
                       ).text
                       
                       price = el.find_element(By.CSS_SELECTOR, 
                           '.price, [data-testid*="price"]'
                       ).text
                       
                       items.append({'name': name, 'price': price})
                   except:
                       pass
                       
           except Exception as e:
               print(f"Error getting cart: {e}")
           
           return items
       
       def sync_cart(self, meal_plan_items):
           """Sync meal plan to cart"""
           results = {'added': [], 'failed': []}
           
           for item in meal_plan_items:
               print(f"Adding: {item['name']}")
               result = self.search_and_add(item['searchTerm'] or item['name'])
               
               if result['success']:
                   results['added'].append(item['name'])
               else:
                   results['failed'].append({'name': item['name'], 'error': result.get('error')})
               
               # Random delay between items
               time.sleep(2 + (hash(item['name']) % 4))
           
           return results
       
       def close(self):
           if self.driver:
               self.driver.quit()
   
   
   # Usage
   if __name__ == '__main__':
       bot = HEBSeleniumBot()
       
       try:
           bot.start()
           
           # Load meal plan
           with open('meal_plan.json', 'r') as f:
               meal_plan = json.load(f)
           
           # Sync to cart
           results = bot.sync_cart(meal_plan['items'])
           print(f"Sync complete: {results}")
           
           # Get current cart
           cart = bot.get_cart_items()
           print(f"Cart now has {len(cart)} items")
           
       finally:
           bot.close()
   ```

3. **Advanced Evasion Techniques**
   ```python
   # evasion_extras.py
   import random
   
   def apply_evasion_patches(driver):
       """Additional evasion patches for Selenium"""
       
       # Randomize viewport
       width = random.choice([1366, 1440, 1536, 1920])
       height = random.choice([768, 900, 864, 1080])
       driver.set_window_size(width, height)
       
       # Override permissions
       driver.execute_cdp_cmd('Browser.grantPermissions', {
           'origin': 'https://www.heb.com',
           'permissions': ['notifications', 'clipboardReadWrite']
       })
       
       # Set realistic user agent
       driver.execute_cdp_cmd('Network.setUserAgentOverride', {
           'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                        '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
       })
       
       # Override plugins
       driver.execute_script("""
           Object.defineProperty(navigator, 'plugins', {
               get: () => [
                   {name: 'Chrome PDF Plugin'}, 
                   {name: 'Native Client'},
                   {name: 'Widevine Content Decryption Module'}
               ]
           });
           
           Object.defineProperty(navigator, 'languages', {
               get: () => ['en-US', 'en']
           });
           
           // Override canvas fingerprint
           const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
           HTMLCanvasElement.prototype.toDataURL = function(type) {
               if (this.width > 16 && this.height > 16) {
                   // Add subtle noise
                   const ctx = this.getContext('2d');
                   const imageData = ctx.getImageData(0, 0, this.width, this.height);
                   const data = imageData.data;
                   data[0] = data[0] ^ 1;
                   ctx.putImageData(imageData, 0, 0);
               }
               return originalToDataURL.call(this, type);
           };
       """)
   ```

### Sample Usage
```bash
# Install
pip install -r requirements.txt

# Run
python heb_selenium.py --meal-plan meal_plan.json
```

### Likelihood of Success: 75%
**Why it might fail**: HEB may use behavioral analysis (mouse movement patterns, timing analysis) that undetected-chromedriver doesn't fully address. Some sites also check for specific browser quirks that are hard to replicate.

---

## 3. Puppeteer Extra Stealth

### Concept
`puppeteer-extra-plugin-stealth` applies various evasion techniques to make Puppeteer-driven Chrome indistinguishable from regular Chrome.

### Pros
- ✅ **Node.js** - Same stack as existing code
- ✅ **Plugin ecosystem** - Easy to extend
- ✅ **Similar to Playwright** - Migration path exists
- ✅ **Active development** - Regular updates

### Cons
- ❌ **Cat and mouse game** - Detection methods evolve
- ❌ **Resource intensive** - Full Chrome instance
- ❌ **Still detected** by advanced fingerprinting
- ❌ **Complex configuration** - Many moving parts

### Implementation Steps

1. **Install Dependencies**
   ```bash
   npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
   npm install puppeteer-extra-plugin-adblocker puppeteer-extra-plugin-user-preferences
   ```

2. **Stealth HEB Bot**
   ```javascript
   // heb-stealth.js
   const puppeteer = require('puppeteer-extra');
   const StealthPlugin = require('puppeteer-extra-plugin-stealth');
   const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
   
   // Configure stealth
   const stealth = StealthPlugin();
   stealth.enabledEvasions.delete('chrome.runtime'); // Keep if you need extensions
   stealth.enabledEvasions.delete('iframe.contentWindow');
   puppeteer.use(stealth);
   puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
   
   class HEBStealthBot {
     constructor() {
       this.browser = null;
       this.page = null;
     }
     
     async start() {
       this.browser = await puppeteer.launch({
         headless: false, // Required for some sites
         executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
         args: [
           '--disable-blink-features=AutomationControlled',
           '--disable-features=IsolateOrigins,site-per-process',
           '--disable-site-isolation-trials',
           '--disable-web-security',
           '--disable-features=BlockInsecurePrivateNetworkRequests',
           '--user-data-dir=C:\\temp\\heb_puppeteer_profile'
         ],
         ignoreDefaultArgs: ['--enable-automation']
       });
       
       this.page = await this.browser.newPage();
       
       // Set realistic viewport
       await this.page.setViewport({
         width: 1920,
         height: 1080,
         deviceScaleFactor: 1,
         hasTouch: false,
         isLandscape: true
       });
       
       // Set user agent
       await this.page.setUserAgent(
         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
         '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
       );
       
       // Additional evasions
       await this.page.evaluateOnNewDocument(() => {
         // Override navigator properties
         Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
         Object.defineProperty(navigator, 'plugins', {
           get: () => [
             { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
             { name: 'Widevine Content Decryption Module', filename: 'widevinecdmadapter.dll' }
           ]
         });
         
         // Override permissions
         const originalQuery = window.navigator.permissions.query;
         window.navigator.permissions.query = (parameters) => (
           parameters.name === 'notifications' 
             ? Promise.resolve({ state: Notification.permission })
             : originalQuery(parameters)
         );
       });
     }
     
     async searchAndAdd(term) {
       const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(term)}`;
       
       // Navigate with human-like delays
       await this.page.goto(searchUrl, {
         waitUntil: 'networkidle2',
         timeout: 30000
       });
       
       // Random wait
       await this.page.waitForTimeout(2000 + Math.random() * 3000);
       
       try {
         // Find add button with multiple selectors
         const addButton = await this.page.waitForSelector(
           'button[data-testid*="add"], button[aria-label*="Add"], button >> text=/add/i',
           { timeout: 10000 }
         );
         
         // Scroll into view
         await addButton.scrollIntoViewIfNeeded();
         await this.page.waitForTimeout(500 + Math.random() * 500);
         
         // Human-like click with random offset
         const box = await addButton.boundingBox();
         await this.page.mouse.move(
           box.x + box.width / 2 + (Math.random() * 10 - 5),
           box.y + box.height / 2 + (Math.random() * 10 - 5)
         );
         await this.page.waitForTimeout(200 + Math.random() * 300);
         await this.page.mouse.down();
         await this.page.waitForTimeout(50 + Math.random() * 100);
         await this.page.mouse.up();
         
         // Wait for add to complete
         await this.page.waitForTimeout(3000);
         
         return { success: true, term };
       } catch (error) {
         return { success: false, term, error: error.message };
       }
     }
     
     async syncCart(mealPlanItems) {
       const results = { added: [], failed: [] };
       
       for (const item of mealPlanItems) {
         console.log(`Adding: ${item.name}`);
         const result = await this.searchAndAdd(item.searchTerm || item.name);
         
         if (result.success) {
           results.added.push(item.name);
         } else {
           results.failed.push({ name: item.name, error: result.error });
         }
         
         // Random delay between items
         await this.page.waitForTimeout(2000 + Math.random() * 3000);
       }
       
       return results;
     }
     
     async close() {
       if (this.browser) {
         await this.browser.close();
       }
     }
   }
   
   module.exports = { HEBStealthBot };
   
   // CLI usage
   if (require.main === module) {
     const bot = new HEBStealthBot();
     const mealPlan = require('./meal_plan.json');
     
     (async () => {
       try {
         await bot.start();
         const results = await bot.syncCart(mealPlan.items);
         console.log('Results:', results);
       } finally {
         await bot.close();
       }
     })();
   }
   ```

3. **Test Detection**
   ```javascript
   // test-stealth.js - Verify evasion works
   const puppeteer = require('puppeteer-extra');
   const StealthPlugin = require('puppeteer-extra-plugin-stealth');
   
   puppeteer.use(StealthPlugin());
   
   (async () => {
     const browser = await puppeteer.launch({ headless: true });
     const page = await browser.newPage();
     
     // Test against fingerprinting service
     await page.goto('https://bot.sannysoft.com');
     await page.waitForTimeout(5000);
     await page.screenshot({ path: 'stealth-test.png', fullPage: true });
     
     // Test against HEB
     await page.goto('https://www.heb.com');
     await page.waitForTimeout(3000);
     
     const title = await page.title();
     console.log('Page title:', title);
     
     // Check for bot block page
     const content = await page.content();
     if (content.includes('Access Denied') || content.includes('blocked')) {
       console.log('❌ BLOCKED by HEB');
     } else {
       console.log('✅ PASSED initial check');
     }
     
     await browser.close();
   })();
   ```

### Likelihood of Success: 60%
**Why it might fail**: Puppeteer stealth patches are well-known and newer anti-bot systems have countermeasures. HEB's protection may be sophisticated enough to detect these evasions.

---

## 4. Mobile App API Reverse Engineering

### Concept
HEB has mobile apps (iOS/Android) that communicate with backend APIs. Reverse engineer these APIs to interact directly without browser automation.

### Research Findings
- HEB has both a consumer app and potentially Instacart integration
- No official public API available
- Apps likely use certificate pinning and obfuscation
- Requires MITM proxy setup to intercept traffic

### Pros
- ✅ **Direct API calls** - Fast, reliable, no browser overhead
- ✅ **No bot detection** - Legitimate API endpoints
- ✅ **Scalable** - Can run headless anywhere
- ✅ **Long-term solution** - Once mapped, very stable

### Cons
- ❌ **High complexity** - Requires reverse engineering skills
- ❌ **Fragile** - API can change without notice
- ❌ **Legal gray area** - Terms of Service violation risk
- ❌ **Authentication challenges** - Token management, possibly device binding
- ❌ **Time intensive** - 8-16 hours minimum for basic mapping

### Implementation Steps

1. **Setup MITM Proxy**
   ```bash
   # Install mitmproxy
   pip install mitmproxy
   
   # Run proxy
   mitmproxy --mode regular --listen-port 8080
   
   # Or use Burp Suite, Charles Proxy, etc.
   ```

2. **Configure Mobile Device**
   - Install HEB app on device/emulator
   - Install MITM certificate on device
   - Route traffic through proxy
   - Bypass certificate pinning (Frida, Objection)

3. **Intercept and Document**
   ```python
   # api_documentation_template.py
   """
   HEB Mobile API Endpoints (Template - Fill in from proxy captures)
   
   Base URL: https://api.heb.com/v1/ (example)
   
   Authentication:
   - Type: Bearer Token
   - Token Endpoint: POST /auth/token
   - Refresh: POST /auth/refresh
   
   Endpoints:
   
   1. Search Products
      GET /products/search?q={query}&store={storeId}
      Headers: Authorization: Bearer {token}
      Response: { products: [...] }
   
   2. Add to Cart
      POST /cart/items
      Body: { productId, quantity, storeId }
   
   3. Get Cart
      GET /cart
   
   4. Checkout (if needed)
      POST /checkout/initiate
   """
   ```

4. **API Client Implementation**
   ```python
   # heb_api_client.py (Template)
   import requests
   from dataclasses import dataclass
   
   @dataclass
   class HEBConfig:
       base_url: str = "https://api.heb.com/v1"
       api_key: str = ""  # From app decompilation
       
   class HEBAPIClient:
       def __init__(self, config: HEBConfig):
           self.config = config
           self.session = requests.Session()
           self.token = None
           
           # Mimic mobile app headers
           self.session.headers.update({
               'User-Agent': 'HEB/8.5.0 (iPhone; iOS 17.0; Scale/3.00)',
               'Accept': 'application/json',
               'Accept-Language': 'en-US',
               'X-HEB-App-Version': '8.5.0',
               'X-HEB-Device-ID': 'YOUR_DEVICE_ID'
           })
       
       def authenticate(self, username: str, password: str):
           """Authenticate and get tokens"""
           # This will depend on the actual auth flow discovered
           pass
       
       def search_products(self, query: str, store_id: str = None):
           """Search for products"""
           params = {'q': query}
           if store_id:
               params['store'] = store_id
               
           response = self.session.get(
               f"{self.config.base_url}/products/search",
               params=params
           )
           response.raise_for_status()
           return response.json()
       
       def add_to_cart(self, product_id: str, quantity: int = 1):
           """Add item to cart"""
           data = {
               'productId': product_id,
               'quantity': quantity
           }
           response = self.session.post(
               f"{self.config.base_url}/cart/items",
               json=data
           )
           response.raise_for_status()
           return response.json()
       
       def get_cart(self):
           """Get current cart contents"""
           response = self.session.get(f"{self.config.base_url}/cart")
           response.raise_for_status()
           return response.json()
   ```

### Likelihood of Success: 30%
**Why it might fail**: Modern apps use certificate pinning, code obfuscation, and device attestation that make reverse engineering extremely difficult. HEB likely has these protections in place.

---

## 5. Manual Session Replay

### Concept
Record all network requests, JavaScript events, and user interactions during a manual session, then replay them programmatically.

### Pros
- ✅ **Exact replica** of successful manual session
- ✅ **No detection** - Actions are identical to manual
- ✅ **Works with complex sites**
- ✅ **Quick to test** - Record once, replay many

### Cons
- ❌ **Brittle** - Breaks on site changes
- ❌ **Session expiration** - Cookies/tokens expire
- ❌ **CSRF tokens** - Dynamic tokens hard to replay
- ❌ **High maintenance** - Must re-record when UI changes
- ❌ **Not scalable** - Per-session customization needed

### Implementation Steps

1. **Recording Tools**
   ```javascript
   // session-recorder.js - Add to page via DevTools
   (() => {
     window.sessionLog = [];
     
     // Record network requests
     const originalFetch = window.fetch;
     window.fetch = async (...args) => {
       const [url, options] = args;
       window.sessionLog.push({
         type: 'fetch',
         timestamp: Date.now(),
         url: url.toString(),
         method: options?.method || 'GET',
         headers: options?.headers,
         body: options?.body
       });
       return originalFetch.apply(window, args);
     };
     
     // Record XHR
     const originalXHR = XMLHttpRequest.prototype.send;
     XMLHttpRequest.prototype.send = function(body) {
       window.sessionLog.push({
         type: 'xhr',
         timestamp: Date.now(),
         url: this._url,
         method: this._method,
         body: body
       });
       return originalXHR.apply(this, arguments);
     };
     
     // Record clicks
     document.addEventListener('click', (e) => {
       window.sessionLog.push({
         type: 'click',
         timestamp: Date.now(),
         target: e.target.outerHTML.slice(0, 200),
         x: e.clientX,
         y: e.clientY
       });
     }, true);
     
     // Record inputs
     document.addEventListener('input', (e) => {
       if (e.target.tagName === 'INPUT') {
         window.sessionLog.push({
           type: 'input',
           timestamp: Date.now(),
           selector: getSelector(e.target),
           value: e.target.value
         });
       }
     }, true);
     
     function getSelector(el) {
       if (el.id) return `#${el.id}`;
       if (el.className) return `.${el.className.split(' ')[0]}`;
       return el.tagName.toLowerCase();
     }
     
     // Export function
     window.exportSession = () => {
       const blob = new Blob([JSON.stringify(window.sessionLog, null, 2)], 
         { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = 'session-record.json';
       a.click();
     };
     
     console.log('Session recorder initialized. Run exportSession() to save.');
   })();
   ```

2. **Replay Script**
   ```javascript
   // session-replayer.js
   const puppeteer = require('puppeteer');
   
   class SessionReplayer {
     constructor(sessionLog) {
       this.log = sessionLog;
       this.browser = null;
       this.page = null;
     }
     
     async start() {
       this.browser = await puppeteer.launch({ headless: false });
       this.page = await browser.newPage();
       
       // Set cookies from session if available
       await this.page.setCookie(...this.extractCookies());
     }
     
     async replay() {
       let lastTimestamp = this.log[0]?.timestamp || 0;
       
       for (const event of this.log) {
         // Maintain original timing
         const delay = event.timestamp - lastTimestamp;
         if (delay > 0 && delay < 60000) { // Max 1 minute wait
           await this.page.waitForTimeout(delay);
         }
         lastTimestamp = event.timestamp;
         
         switch(event.type) {
           case 'fetch':
           case 'xhr':
             // Skip - we'll let the page make these naturally
             break;
             
           case 'click':
             await this.handleClick(event);
             break;
             
           case 'input':
             await this.handleInput(event);
             break;
         }
       }
     }
     
     async handleClick(event) {
       try {
         // Try to find element
         const elements = await this.page.$$(event.target);
         if (elements.length > 0) {
           await elements[0].click();
         }
       } catch (e) {
         console.log('Click failed:', e.message);
       }
     }
     
     async handleInput(event) {
       try {
         await this.page.type(event.selector, event.value, { delay: 50 });
       } catch (e) {
         console.log('Input failed:', e.message);
       }
     }
     
     extractCookies() {
       // Extract cookies from session log if recorded
       return [];
     }
   }
   ```

3. **Simplified Approach - Action Sequence**
   ```javascript
   // action-sequence.js - More maintainable than full replay
   const ACTIONS = {
     async login(page, credentials) {
       await page.goto('https://www.heb.com/login');
       await page.type('input[type="email"]', credentials.email);
       await page.type('input[type="password"]', credentials.password);
       await page.click('button[type="submit"]');
       await page.waitForNavigation();
     },
     
     async search(page, term) {
       await page.type('input[placeholder*="Search"]', term);
       await page.keyboard.press('Enter');
       await page.waitForSelector('.product-grid, [data-testid="results"]', 
         { timeout: 10000 });
     },
     
     async addFirstProduct(page) {
       const addBtn = await page.waitForSelector('button[data-testid*="add"]');
       await addBtn.click();
       await page.waitForTimeout(2000);
     },
     
     async getCart(page) {
       await page.goto('https://www.heb.com/cart');
       await page.waitForSelector('.cart-items', { timeout: 10000 });
       
       return await page.evaluate(() => {
         // Extract cart data
         return Array.from(document.querySelectorAll('.cart-item')).map(el => ({
           name: el.querySelector('h3')?.textContent,
           quantity: el.querySelector('.quantity')?.value
         }));
       });
     }
   };
   
   // Usage - sequence of known-good actions
   async function syncCart(items) {
     await ACTIONS.login(page, creds);
     
     for (const item of items) {
       await ACTIONS.search(page, item.name);
       await ACTIONS.addFirstProduct(page);
       await page.waitForTimeout(2000);
     }
     
     const cart = await ACTIONS.getCart(page);
     return cart;
   }
   ```

### Likelihood of Success: 50%
**Why it might fail**: Session replay is brittle against CSRF tokens, session timeouts, and UI changes. Good for short-term fixes, not long-term solutions.

---

## Recommendation Matrix

| Scenario | Recommended Approach | Fallback |
|----------|---------------------|----------|
| Quick fix needed | Enhanced Extension | Session Replay |
| Long-term solution | Enhanced Extension | Mobile API (if viable) |
| Python stack | Selenium + Undetected | Puppeteer Stealth |
| Node.js stack | Enhanced Extension | Puppeteer Stealth |
| Headless required | Selenium + Undetected | Puppeteer Stealth |
| Complex interactions | Enhanced Extension | Selenium + Undetected |

---

## Next Steps

1. **Immediate (Today)**
   - [ ] Test Enhanced Extension approach (2-4 hours)
   - [ ] Verify CDP connection to Edge works
   - [ ] Test content script API injection

2. **Short-term (This Week)**
   - [ ] Implement full bridge if extension approach works
   - [ ] If not, test Selenium undetected-chromedriver
   - [ ] Document which selectors work for cart operations

3. **Medium-term (Next Sprint)**
   - [ ] Mobile app API investigation (if browser approaches fail)
   - [ ] Build robust error handling and retry logic
   - [ ] Add monitoring and alerting for automation failures

---

## Resources

- **undetected-chromedriver**: https://github.com/ultrafunkamsterdam/undetected-chromedriver
- **puppeteer-extra**: https://github.com/berstend/puppeteer-extra
- **Chrome DevTools Protocol**: https://chromedevtools.github.io/devtools-protocol/
- **MITM Proxy**: https://docs.mitmproxy.org/
