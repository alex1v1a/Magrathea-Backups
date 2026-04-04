const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
const AUTO_START_FILE = path.join(EXTENSION_PATH, 'autostart-data.json');
const WEEKLY_PLAN = path.join(__dirname, '..', 'data', 'weekly-plan.json');

// Load and prepare items
const plan = JSON.parse(fs.readFileSync(WEEKLY_PLAN, 'utf8'));
const items = [];
plan.meals.forEach(meal => {
  meal.ingredients.forEach(ing => {
    items.push({
      name: ing.name,
      hebSearch: ing.hebSearch,
      amount: ing.amount
    });
  });
});

// Create autostart data
const autoStartData = {
  autoStart: true,
  items: items,
  timestamp: new Date().toISOString()
};

// Write to extension folder
fs.writeFileSync(AUTO_START_FILE, JSON.stringify(autoStartData, null, 2));
console.log(`✅ Written ${items.length} items to autostart-data.json`);

console.log('\n🛒 Starting HEB Auto-Cart Extension...');
console.log(`📦 Items to add: ${items.length}\n`);

(async () => {
  const userDataDir = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    console.log('✅ HEB.com loaded\n');
    
    console.log('⏳ Extension will auto-start in 3 seconds...');
    console.log('📋 The extension will automatically:');
    console.log('   1. Read the 44 items from autostart-data.json');
    console.log('   2. Search for each item');
    console.log('   3. Add to cart\n');
    
    await page.waitForTimeout(5000);
    
    // Check for notification
    const notification = await page.$('#heb-auto-cart-notification');
    if (notification) {
      console.log('✅ Extension auto-started!');
      const text = await notification.textContent();
      console.log(`📢 ${text}\n`);
    }
    
    console.log('⏳ Automation running... Browser will stay open for 5 minutes');
    console.log('   (Close manually when done or wait for completion)\n');
    
    // Keep browser open for 5 minutes to allow automation to complete
    await page.waitForTimeout(300000);
    
    // Check final status
    const status = await page.evaluate(() => {
      return {
        url: window.location.href,
        cartCount: document.querySelector('[data-automation-id*="cart" i]')?.textContent || 'unknown'
      };
    });
    
    console.log('\n📊 Final Status:');
    console.log(`   URL: ${status.url}`);
    console.log(`   Cart: ${status.cartCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Clean up autostart file
    try {
      fs.unlinkSync(AUTO_START_FILE);
      console.log('\n🧹 Cleaned up autostart-data.json');
    } catch {}
    
    await browser.close();
    console.log('✅ HEB Auto-Cart session complete');
  }
})();
