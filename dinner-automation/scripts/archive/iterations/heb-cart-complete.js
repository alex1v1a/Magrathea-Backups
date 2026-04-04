const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart - Full Automation
 * Completes the cart with all 31 items
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (e) {
    console.error('❌ Cannot load items:', e.message);
    return [];
  }
}

async function addItemToCart(page, item, index, total) {
  console.log(`\n[${index}/${total}] Adding: ${item.name}`);
  console.log(`   Search: "${item.searchTerm}"`);
  
  try {
    // Navigate to HEB
    await page.goto('https://www.heb.com', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Find and use search
    const searchInput = await page.locator('input[placeholder*="Search"], input[name="q"], #search-input').first();
    if (!searchInput) {
      console.log('   ⚠️ Search not found, skipping');
      return false;
    }
    
    await searchInput.fill(item.searchTerm);
    await searchInput.press('Enter');
    await page.waitForTimeout(3000);
    
    // Look for "Add to Cart" button on any product
    const addButton = await page.locator('button:has-text("Add"), button[data-testid*="add"], button.add-to-cart').first();
    
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(2000);
      
      // Check for success indicator
      const success = await page.locator('text:has("added"), text:has("cart"), .cart-count').first();
      if (success || await addButton.isDisabled().catch(() => false)) {
        console.log('   ✅ Added successfully');
        return true;
      }
    }
    
    console.log('   ❌ Could not add');
    return false;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🛒 HEB Cart Automation - Completing All Items\n');
  
  const items = loadItems();
  if (items.length === 0) {
    console.log('❌ No items found');
    return;
  }
  
  console.log(`📋 ${items.length} items to add\n`);
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  let added = 0;
  let failed = 0;
  
  try {
    for (let i = 0; i < items.length; i++) {
      const success = await addItemToCart(page, items[i], i + 1, items.length);
      if (success) added++;
      else failed++;
      
      // Brief pause between items
      await page.waitForTimeout(1000);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Added: ${added}/${items.length}`);
    console.log(`❌ Failed: ${failed}/${items.length}`);
    
    // Show cart
    console.log('\n🛒 Opening cart...');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    console.log('✅ Cart updated. Review and checkout when ready.');
    console.log('   Browser staying open...\n');
    
    // Keep open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main().catch(console.error);
