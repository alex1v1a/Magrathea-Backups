/**
 * HEB Direct Automation - Simple Working Version
 * Uses Playwright to directly control Chrome
 */

const { chromium } = require('playwright');

const CONFIG = {
  debugPort: 9222,
  headless: false,
  slowMo: 100, // Slow down operations by 100ms for human-like timing
  timeout: 30000
};

// Simple logging
const log = (msg, type = 'info') => {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`${icons[type] || 'ℹ️'} ${msg}`);
};

// Sleep helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Add items to HEB cart
 * @param {Array} items - Array of {name, searchTerm, amount}
 */
async function addItemsToHEBCart(items) {
  log('Starting HEB Cart Automation', 'info');
  log(`Items to add: ${items.length}`);
  
  let browser = null;
  const results = { added: [], failed: [] };
  
  try {
    // Connect to existing Chrome or launch new
    log('Connecting to Chrome...');
    try {
      browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.debugPort}`);
      log('Connected to existing Chrome', 'success');
    } catch (e) {
      log('No existing Chrome found, launching new instance...', 'warn');
      browser = await chromium.launch({ 
        headless: false,
        slowMo: CONFIG.slowMo
      });
    }
    
    // Get or create page
    const contexts = browser.contexts();
    let context = contexts[0];
    if (!context) {
      context = await browser.newContext();
    }
    
    const pages = context.pages();
    let page = pages.find(p => p.url().includes('heb.com'));
    
    if (!page) {
      log('Creating new HEB page...');
      page = await context.newPage();
      await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
      await sleep(3000);
    } else {
      log('Using existing HEB page', 'success');
    }
    
    log(`Current URL: ${page.url()}`);
    
    // Check if logged in
    log('Checking login status...');
    const isLoggedIn = await page.evaluate(() => {
      const accountMenu = document.querySelector('[data-testid="account-menu"], a[href*="/account"]');
      const signInBtn = document.querySelector('a[href*="/login"]');
      return !!accountMenu && !signInBtn;
    });
    
    if (!isLoggedIn) {
      log('⚠️  WARNING: You may not be logged in to HEB', 'warn');
      log('Please login manually in the Chrome window, then press Enter to continue...');
      // Wait for user to press enter
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    } else {
      log('Logged in detected', 'success');
    }
    
    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const searchTerm = item.searchTerm || item.hebSearch || item.name;
      
      log(`\n═══════════════════════════════════════`);
      log(`Item ${i + 1}/${items.length}: "${item.name}"`);
      log(`Search: "${searchTerm}"`);
      log(`═══════════════════════════════════════`);
      
      try {
        // Go to homepage for fresh search
        if (i > 0) {
          log('Navigating to homepage...');
          await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
          await sleep(2000);
        }
        
        // Find and fill search
        log('Finding search input...');
        const searchInput = await page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
        
        log('Typing search term...');
        await searchInput.fill(searchTerm);
        await sleep(500);
        
        log('Submitting search...');
        await searchInput.press('Enter');
        
        // Wait for results
        log('Waiting for search results...');
        await page.waitForLoadState('networkidle');
        await sleep(3000);
        
        // Look for add to cart button
        log('Looking for Add to Cart button...');
        
        // Try multiple strategies
        const buttonStrategies = [
          // Strategy 1: Real add-to-cart button
          { selector: 'button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])', name: 'real add button' },
          // Strategy 2: Any add-to-cart button
          { selector: 'button[data-testid*="add-to-cart"]', name: 'any add button' },
          // Strategy 3: Button with "Add to cart" text
          { selector: 'button:has-text("Add to cart")', name: 'text match' }
        ];
        
        let clicked = false;
        for (const strategy of buttonStrategies) {
          try {
            const button = page.locator(strategy.selector).first();
            const count = await button.count();
            
            if (count > 0) {
              log(`Found button using: ${strategy.name}`);
              
              // Scroll to button
              await button.scrollIntoViewIfNeeded();
              await sleep(500);
              
              // Click with human-like behavior
              await button.click({ delay: 100, force: true });
              
              log('Clicked Add to Cart', 'success');
              clicked = true;
              
              // Visual feedback - highlight button
              await button.evaluate(el => {
                el.style.outline = '4px solid lime';
                setTimeout(() => el.style.outline = '', 3000);
              });
              
              break;
            }
          } catch (e) {
            log(`Strategy ${strategy.name} failed: ${e.message}`, 'debug');
          }
        }
        
        if (!clicked) {
          throw new Error('Could not find or click Add to Cart button');
        }
        
        // Wait for cart update
        log('Waiting for cart to update...');
        await sleep(3000);
        
        results.added.push(item);
        log(`✅ Successfully added "${item.name}"`, 'success');
        
      } catch (error) {
        log(`❌ Failed to add "${item.name}": ${error.message}`, 'error');
        results.failed.push({ item: item.name, error: error.message });
      }
      
      // Delay between items
      if (i < items.length - 1) {
        log('Waiting before next item...');
        await sleep(2000);
      }
    }
    
    // Summary
    log('\n═══════════════════════════════════════');
    log('AUTOMATION COMPLETE', 'success');
    log(`Added: ${results.added.length}/${items.length}`);
    log(`Failed: ${results.failed.length}/${items.length}`);
    log('═══════════════════════════════════════');
    
    if (results.failed.length > 0) {
      log('\nFailed items:');
      results.failed.forEach(f => log(`  - ${f.item}: ${f.error}`, 'error'));
    }
    
    return results;
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    throw error;
  } finally {
    if (browser) {
      // Don't close browser, just disconnect
      await browser.disconnect().catch(() => {});
      log('Disconnected from Chrome');
    }
  }
}

// Example usage
const testItems = [
  { name: 'Milk', searchTerm: 'whole milk', amount: '1 gallon' },
  { name: 'Eggs', searchTerm: 'large eggs', amount: '1 dozen' },
  { name: 'Bread', searchTerm: 'white bread', amount: '1 loaf' }
];

// If run directly
if (require.main === module) {
  // Check for items in arguments or use test items
  const items = process.argv.length > 2 
    ? JSON.parse(process.argv[2])
    : testItems;
  
  addItemsToHEBCart(items)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { addItemsToHEBCart };
