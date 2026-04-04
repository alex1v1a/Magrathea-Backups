const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Trigger HEB Extension Automatically via CDP
 */

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

// Load weekly plan items
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'weekly-plan.json'), 'utf8'));
const items = [];
plan.meals.forEach(meal => {
  meal.ingredients.forEach(ing => {
    items.push({ name: ing.name, hebSearch: ing.hebSearch, amount: ing.amount });
  });
});

console.log('🛒 Auto-Trigger HEB Extension v1.2.0');
console.log(`📦 Items ready: ${items.length}\n`);

(async () => {
  try {
    // Connect to existing Chrome instance
    console.log('🔌 Connecting to Chrome...');
    
    // Find Chrome's debugging port
    const { execSync } = require('child_process');
    let wsEndpoint = null;
    
    try {
      // Try to get debugging endpoint
      const response = execSync('curl -s http://localhost:9222/json/version', { encoding: 'utf8', timeout: 5000 });
      const version = JSON.parse(response);
      wsEndpoint = version.webSocketDebuggerUrl;
      console.log('✅ Found Chrome debugging endpoint');
    } catch (e) {
      console.log('⚠️  Chrome debugging not enabled, launching new instance...');
    }
    
    let browser;
    if (wsEndpoint) {
      browser = await chromium.connectOverCDP(wsEndpoint);
    } else {
      // Launch with extension if not already running
      browser = await chromium.launchPersistentContext(MARVIN_PROFILE, {
        headless: false,
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
          '--remote-debugging-port=9222',
          '--start-maximized'
        ]
      });
    }
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // Navigate to HEB
    console.log('🌐 Navigating to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    console.log('✅ HEB.com loaded');
    
    // Wait a moment for extension to initialize
    await page.waitForTimeout(3000);
    
    // Inject script to trigger extension
    console.log('🤖 Triggering extension automation...');
    
    const result = await page.evaluate((itemsData) => {
      // Check if extension is loaded
      const extensionPort = chrome.runtime?.connect?.('heb-auto-cart');
      
      // Alternative: Use window.postMessage to communicate with content script
      window.postMessage({
        type: 'HEB_AUTO_START',
        items: itemsData,
        timestamp: new Date().toISOString()
      }, '*');
      
      return 'Extension trigger message sent';
    }, items).catch(err => `Error: ${err.message}`);
    
    console.log(`📤 ${result}`);
    console.log('\n⏳ Extension should now be running automatically...');
    console.log('   Items will be added to cart one by one.\n');
    
    // Monitor progress
    let lastCartCount = 0;
    let stallCount = 0;
    const startTime = Date.now();
    
    while (Date.now() - startTime < 20 * 60 * 1000) { // 20 min max
      await page.waitForTimeout(30000); // Check every 30 sec
      
      // Try to read cart count from page
      const cartInfo = await page.evaluate(() => {
        const cartBadge = document.querySelector('[data-automation-id*="cart"], .cart-count, [aria-label*="cart" i]');
        const count = cartBadge?.textContent?.match(/\d+/)?.[0];
        return { count: count || 'unknown', url: window.location.href };
      }).catch(() => ({ count: 'error', url: 'unknown' }));
      
      const currentCount = parseInt(cartInfo.count) || 0;
      const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
      
      if (currentCount > lastCartCount) {
        console.log(`   ⏱️  ${elapsed}m - Cart: ${currentCount} items (+${currentCount - lastCartCount})`);
        lastCartCount = currentCount;
        stallCount = 0;
      } else {
        stallCount++;
        if (stallCount % 4 === 0) { // Every 2 minutes
          console.log(`   ⏱️  ${elapsed}m - Cart: ${currentCount} items (waiting...)`);
        }
      }
      
      // If we have all items, we're done
      if (currentCount >= items.length) {
        console.log(`\n✅ All ${items.length} items added to cart!`);
        break;
      }
      
      // If stalled for 5 minutes, take screenshot and continue
      if (stallCount > 10) {
        console.log('\n⚠️  Automation appears stalled');
        await page.screenshot({ path: 'heb-extension-stalled.png' });
        break;
      }
    }
    
    const totalTime = Math.floor((Date.now() - startTime) / 1000 / 60);
    console.log(`\n📊 Final Status (${totalTime} minutes):`);
    console.log(`   Items in cart: ${lastCartCount}/${items.length}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'heb-extension-complete.png', fullPage: true });
    console.log('   Screenshot: heb-extension-complete.png');
    
    console.log('\n✨ Browser will remain open. Close manually when done.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
})();
