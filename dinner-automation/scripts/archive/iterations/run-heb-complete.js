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

fs.writeFileSync(AUTO_START_FILE, JSON.stringify(autoStartData, null, 2));
console.log(`✅ Written ${items.length} items to autostart-data.json\n`);

console.log('🛒 Starting HEB Auto-Cart Extension (v1.2.0)');
console.log(`📦 Items to add: ${items.length}`);
console.log('⏱️  Estimated time: 10-15 minutes\n');

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
    console.log('✅ HEB.com loaded');
    console.log('⏳ Extension auto-starting in 3 seconds...\n');
    
    await page.waitForTimeout(5000);
    
    // Check for auto-start notification
    const notification = await page.$('#heb-auto-cart-notification');
    if (notification) {
      const text = await notification.textContent();
      console.log(`📢 ${text}\n`);
    }
    
    console.log('🤖 Automation is now running...');
    console.log('   The extension will search and add each item automatically.\n');
    console.log('⏳ Waiting for completion (up to 20 minutes)...');
    console.log('   Do not close the browser. Press Ctrl+C in terminal to stop.\n');
    
    // Monitor progress by checking if automation is still running
    let lastProgress = 0;
    let stallCount = 0;
    const startTime = Date.now();
    const MAX_RUNTIME = 20 * 60 * 1000; // 20 minutes max
    
    while (Date.now() - startTime < MAX_RUNTIME) {
      await page.waitForTimeout(30000); // Check every 30 seconds
      
      // Get status from page
      const status = await page.evaluate(() => {
        // Check if the extension has completed
        const items = document.querySelectorAll('.item-status');
        const done = Array.from(items).filter(i => i.classList.contains('done')).length;
        const errors = Array.from(items).filter(i => i.classList.contains('error')).length;
        return { done, errors, total: items.length };
      }).catch(() => ({ done: 0, errors: 0, total: 0 }));
      
      const currentProgress = status.done + status.errors;
      const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
      
      if (currentProgress > lastProgress) {
        console.log(`   ⏱️  ${elapsed}m elapsed - Progress: ${currentProgress}/${items.length} items`);
        lastProgress = currentProgress;
        stallCount = 0;
      } else {
        stallCount++;
      }
      
      // Check if complete
      if (currentProgress >= items.length && items.length > 0) {
        console.log(`\n✅ Automation complete! ${status.done} added, ${status.errors} failed`);
        break;
      }
      
      // Check if stalled (no progress for 5 minutes)
      if (stallCount > 10) {
        console.log('\n⚠️  Automation appears stalled. Taking screenshot...');
        await page.screenshot({ path: 'heb-stalled.png' });
        break;
      }
    }
    
    // Final status
    const finalStatus = await page.evaluate(() => {
      const cartBadge = document.querySelector('[data-automation-id*="cart" i], .cart-count');
      return {
        url: window.location.href,
        cartCount: cartBadge?.textContent?.trim() || 'unknown'
      };
    }).catch(() => ({ url: page.url(), cartCount: 'unknown' }));
    
    console.log('\n📊 Final Status:');
    console.log(`   URL: ${finalStatus.url}`);
    console.log(`   Cart items: ${finalStatus.cartCount}`);
    console.log(`   Total runtime: ${Math.floor((Date.now() - startTime) / 1000 / 60)} minutes`);
    
    console.log('\n✨ Browser will stay open. Close manually when done.');
    console.log('   (Or press Enter in this terminal to close)\n');
    
    // Keep browser open indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'heb-error.png' });
  } finally {
    try { fs.unlinkSync(AUTO_START_FILE); } catch {}
    console.log('\n🧹 Cleanup complete');
  }
})();
