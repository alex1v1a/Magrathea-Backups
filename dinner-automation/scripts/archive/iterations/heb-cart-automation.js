const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart Automation - Full Implementation
 * Searches and adds items to HEB cart using Edge
 * 
 * Usage: node heb-cart-automation.js [--headless]
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'heb-cart-results.json');

async function createContext(headless = false) {
  return await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless,
    executablePath: EDGE_PATH,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ],
    viewport: { width: 1920, height: 1080 }
  });
}

function loadShoppingList() {
  try {
    const itemsFile = path.join(DATA_DIR, 'heb-extension-items.json');
    const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    return data.items || [];
  } catch (error) {
    console.error('❌ Could not load shopping list:', error.message);
    return [];
  }
}

function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...results
  }, null, 2));
}

/**
 * Search for an item on HEB
 */
async function searchItem(page, searchTerm) {
  try {
    // Find search input
    const searchInput = await page.locator('input[placeholder*="Search"], input[data-testid*="search"], #search-input').first();
    
    if (!searchInput) {
      console.log('   ⚠️  Search input not found');
      return null;
    }
    
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    await page.waitForTimeout(3000);
    
    // Look for first product
    const productSelectors = [
      '[data-testid="product-card"]',
      '.product-card',
      '[data-automation-id="product"]',
      'article[role="article"]'
    ];
    
    for (const selector of productSelectors) {
      const products = await page.locator(selector).all();
      if (products.length > 0) {
        return products[0];
      }
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️  Search error: ${error.message}`);
    return null;
  }
}

/**
 * Add item to cart
 */
async function addToCart(page, product) {
  try {
    // Look for add to cart button
    const addButton = await product.locator('button:has-text("Add"), button[data-testid*="add"], button[aria-label*="Add"]').first();
    
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(2000);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`   ⚠️  Add to cart error: ${error.message}`);
    return false;
  }
}

/**
 * Main automation
 */
async function runHEBCart(headless = false) {
  console.log('🛒 Starting HEB Cart Automation\n');
  
  const items = loadShoppingList();
  if (items.length === 0) {
    console.log('⚠️  No items to add. Exiting.');
    return { success: false, error: 'No items' };
  }
  
  console.log(`📋 ${items.length} items to add\n`);
  
  const context = await createContext(headless);
  const page = context.pages()[0] || await context.newPage();
  
  const results = {
    success: true,
    itemsAdded: 0,
    itemsFailed: 0,
    details: []
  };
  
  try {
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    
    // Handle any location popup
    try {
      const locationBtn = await page.locator('button:has-text("Continue"), button:has-text("Set Location")').first();
      if (locationBtn) {
        await locationBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}
    
    console.log('✅ HEB loaded\n');
    
    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[${i + 1}/${items.length}] 🔍 ${item.name}`);
      console.log(`    Search: "${item.searchTerm}"`);
      
      const product = await searchItem(page, item.searchTerm);
      
      if (product) {
        const added = await addToCart(page, product);
        
        if (added) {
          console.log(`    ✅ Added to cart`);
          results.itemsAdded++;
          results.details.push({ name: item.name, status: 'added' });
        } else {
          console.log(`    ❌ Could not add`);
          results.itemsFailed++;
          results.details.push({ name: item.name, status: 'failed', reason: 'add_failed' });
        }
      } else {
        console.log(`    ❌ Not found`);
        results.itemsFailed++;
        results.details.push({ name: item.name, status: 'failed', reason: 'not_found' });
      }
      
      // Go back to homepage for next search
      await page.goto('https://www.heb.com');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Items added: ${results.itemsAdded}`);
    console.log(`❌ Items failed: ${results.itemsFailed}`);
    console.log(`📦 Total processed: ${items.length}`);
    
    saveResults(results);
    
    // Keep browser open briefly to show results
    if (!headless) {
      console.log('\n⏳ Keeping browser open for 10 seconds...');
      await page.waitForTimeout(10000);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    results.success = false;
    results.error = error.message;
  } finally {
    await context.close();
  }
  
  return results;
}

// CLI
const args = process.argv.slice(2);
const headless = args.includes('--headless');

runHEBCart(headless)
  .then(results => {
    console.log('\n🏁 Automation complete');
    process.exit(results.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
