const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * HEB Full Cart Automation - Zero Manual Input
 * Based on successful previous runs for 27 items
 */

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_USER_DATA = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const DATA_DIR = path.join(__dirname, '..', 'data');

// Load items from weekly plan
const plan = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'weekly-plan.json'), 'utf8'));
const ITEMS = [];
plan.meals.forEach(meal => {
  meal.ingredients.forEach(ing => {
    ITEMS.push({
      name: ing.name,
      searchTerm: ing.hebSearch,
      amount: ing.amount
    });
  });
});

console.log('🛒 HEB Full Cart Automation (Zero Manual Input)');
console.log(`📦 Items to add: ${ITEMS.length}\n`);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForVisible(page, selectors, timeout = 8000) {
  for (const selector of selectors) {
    const el = await page.waitForSelector(selector, { timeout, state: 'visible' }).catch(() => null);
    if (el) return el;
  }
  return null;
}

async function waitForLoadIdle(page, timeout = 8000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

async function addItem(page, item, index) {
  const searchTerm = item.searchTerm || item.name;
  console.log(`\n[${index + 1}/${ITEMS.length}] Adding: ${item.name}`);
  
  try {
    // Navigate to homepage first to ensure search is available
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
    await waitForLoadIdle(page, 8000);
    
    // Find search input
    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]'
    ];
    let searchInput = await waitForVisible(page, searchSelectors, 8000);
    
    if (!searchInput) {
      // Try broader search
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder');
        const type = await input.getAttribute('type');
        if ((placeholder && placeholder.toLowerCase().includes('search')) || type === 'search') {
          searchInput = input;
          break;
        }
      }
    }
    
    if (!searchInput) {
      console.log('  ⚠️ Search input not found, skipping item');
      return { success: false, error: 'Search input not found' };
    }
    
    // Clear and type search
    await searchInput.click();
    await searchInput.fill('');
    await delay(500);
    await searchInput.fill(searchTerm);
    await delay(500);
    
    // Submit search
    await searchInput.press('Enter');
    console.log(`  🔍 Searching: "${searchTerm}"`);
    
    // Wait for results to load without hard sleeping
    await waitForLoadIdle(page, 10000);
    
    // Look for add to cart button with multiple strategies
    const addSelectors = [
      'button:has-text("Add to Cart")',
      'button:has-text("Add")',
      '[data-testid*="add-to-cart"], [data-automation-id*="addToCart"]'
    ];
    let addButton = await waitForVisible(page, addSelectors, 10000);
    
    if (addButton) {
      // Scroll and click
      await addButton.scrollIntoViewIfNeeded().catch(() => {});
      await delay(800);
      
      await addButton.click();
      console.log('  ✅ Added to cart');
      
      // Wait for cart update
      await waitForLoadIdle(page, 6000);
      await delay(800);
      
      return { success: true };
    } else {
      console.log('  ⚠️ Add button not found - item may be unavailable');
      return { success: false, error: 'Add button not found' };
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

(async () => {
  console.log('🚀 Launching Chrome with saved session...\n');
  
  const browser = await chromium.launchPersistentContext(CHROME_USER_DATA, {
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Set longer timeout
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  
  try {
    // Go to HEB
    console.log('🌐 Navigating to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
    await waitForLoadIdle(page, 10000);
    
    const currentUrl = page.url();
    console.log(`📍 Current page: ${currentUrl}\n`);
    
    // Check if we need to log in
    if (currentUrl.includes('login') || await page.$('text=Sign In')) {
      console.log('🔐 Logging in...');
      
      const email = process.env.HEB_EMAIL || 'alex@1v1a.com';
      const password = process.env.HEB_PASSWORD;
      
      if (!password) {
        throw new Error('HEB_PASSWORD environment variable required');
      }
      
      const emailField = await page.$('input[type="email"], input[name="email"]');
      if (emailField) await emailField.fill(email);
      
      const passwordField = await page.$('input[type="password"]');
      if (passwordField) await passwordField.fill(password);
      
      const submitBtn = await page.$('button[type="submit"], button:has-text("Sign In")');
      if (submitBtn) {
        await submitBtn.click();
        await waitForLoadIdle(page, 12000);
      }
      
      console.log('✅ Login submitted\n');
    } else {
      console.log('✅ Already logged in\n');
    }
    
    // Process all items
    let added = 0;
    let failed = [];
    
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      const result = await addItem(page, item, i);
      
      if (result.success) {
        added++;
      } else {
        failed.push({ name: item.name, error: result.error });
      }
      
      // Delay between items
      if (i < ITEMS.length - 1) {
        const delayTime = 3000 + Math.random() * 2000;
        await delay(delayTime);
      }
      
      // Every 10 items, take a screenshot and save progress
      if ((i + 1) % 10 === 0) {
        await page.screenshot({ path: `heb-progress-${i + 1}.png` });
        console.log(`\n📸 Progress screenshot saved: heb-progress-${i + 1}.png`);
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('HEB CART AUTOMATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total items: ${ITEMS.length}`);
    console.log(`Added: ${added} ✅`);
    console.log(`Failed: ${failed.length} ❌`);
    console.log('='.repeat(50));
    
    if (failed.length > 0) {
      console.log('\nFailed items:');
      failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'heb-cart-complete.png', fullPage: true });
    console.log('\n📸 Final screenshot: heb-cart-complete.png');
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      total: ITEMS.length,
      added,
      failed: failed.length,
      failedItems: failed
    };
    fs.writeFileSync(path.join(DATA_DIR, 'heb-cart-results.json'), JSON.stringify(results, null, 2));
    
    console.log('\n✅ Results saved to heb-cart-results.json');
    console.log('⏳ Browser will close in 10 seconds...\n');
    
    await delay(10000);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    await page.screenshot({ path: 'heb-error.png' });
  } finally {
    await browser.close();
    console.log('✅ Browser closed');
  }
})();
