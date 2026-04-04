const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * HEB Cart Automation - Ultra Stable Version
 * Fixes: Profile conflicts, bot detection, page context issues
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

// Ensure user data dir exists
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// Load items
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

console.log('🛒 HEB Ultra-Stable Cart Automation');
console.log(`📦 Items: ${ITEMS.length}\n`);

function delay(ms) {
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

async function waitForLogin(page, timeoutMs = 45000) {
  const started = Date.now();
  const accountSelectors = [
    '[data-testid="account-menu-button"]',
    '[aria-label*="Account" i]',
    'text=My Account',
    'text=Sign Out'
  ];
  while (Date.now() - started < timeoutMs) {
    for (const sel of accountSelectors) {
      const el = await page.$(sel);
      if (el) {
        const visible = await el.isVisible().catch(() => false);
        if (visible) return true;
      }
    }
    const signIn = await page.$('text=Sign In');
    if (!signIn) return true;
    await delay(3000);
  }
  return false;
}

(async () => {
  console.log('🚀 Launching Chrome with dedicated profile...');
  console.log(`📁 Profile: ${USER_DATA_DIR}\n`);
  
  // Launch with persistent context (proper way to use user data dir)
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Set longer timeouts
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  
  try {
    // Navigate to HEB
    console.log('🌐 Going to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    await waitForLoadIdle(page, 10000);
    
    console.log(`📍 URL: ${page.url()}`);
    
    // Check login
    const signInLink = await page.$('text=Sign In');
    if (signInLink) {
      console.log('🔐 Need to log in - please check Chrome window');
      console.log('   (Login once and it will be saved for future runs)\n');
      const loggedIn = await waitForLogin(page, 45000);
      if (!loggedIn) {
        console.log('⚠️ Login still not detected after 45s, continuing anyway...');
      }
    } else {
      console.log('✅ Already logged in\n');
    }
    
    // Process items with extreme stability measures
    let added = 0;
    let failed = [];
    
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      console.log(`\n[${i + 1}/${ITEMS.length}] ${item.name}`);
      
      try {
        // Navigate fresh each time (prevents context issues)
        await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
        await waitForLoadIdle(page, 8000);
        
        // Find search with multiple fallbacks
        const searchSelectors = [
          'input[type="search"]',
          'input[placeholder*="Search"]',
          'input[name="q"]',
          'input[data-automation-id*="search"]',
          'header input'
        ];
        
        let searchInput = await waitForVisible(page, searchSelectors, 8000);
        
        if (!searchInput) {
          console.log('  ⚠️ Search not found, skipping');
          failed.push(item.name);
          continue;
        }
        
        // Type and search with human-like delays
        await searchInput.click();
        await delay(300);
        await searchInput.fill(item.searchTerm);
        await delay(500);
        await searchInput.press('Enter');
        
        console.log(`  🔍 "${item.searchTerm}"`);
        await waitForLoadIdle(page, 10000); // Wait for results
        
        // Find add button with multiple strategies
        const addButton = await waitForVisible(page, [
          'button:has-text("Add to Cart")',
          'button:has-text("Add")',
          '[data-testid*="add-to-cart"], [data-automation-id*="addToCart"]'
        ], 10000);
        
        if (addButton) {
          await addButton.scrollIntoViewIfNeeded().catch(() => {});
          await delay(600);
          await addButton.click();
          console.log('  ✅ Added');
          added++;
          await waitForLoadIdle(page, 6000);
          await delay(600);
        } else {
          console.log('  ⚠️ Add button not found');
          failed.push(item.name);
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        failed.push(item.name);
      }
      
      // Progress every 5 items
      if ((i + 1) % 5 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${ITEMS.length} (${added} added)`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('COMPLETE');
    console.log('='.repeat(50));
    console.log(`Added: ${added}/${ITEMS.length}`);
    if (failed.length > 0) {
      console.log(`Failed: ${failed.length}`);
      console.log('Failed items:', failed.join(', '));
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    console.log('\n⏳ Browser will close in 10 seconds...');
    await delay(10000);
    await context.close();
    console.log('✅ Done');
  }
})();
