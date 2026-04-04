const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * HEB Auto-Add Items via Chrome Playwright
 * Direct automation without extension
 * Uses Marvin profile only
 */

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_USER_DATA = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const DATA_DIR = path.join(__dirname, '..', 'data');

// Load items from the extension items file
function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (error) {
    console.error('❌ Could not load items:', error.message);
    return [];
  }
}

async function addItemToCart(page, item, index) {
  console.log(`\n${index + 1}. Adding: ${item.name} (${item.searchTerm || item.name})`);
  
  try {
    // Click search box
    const searchBox = await page.locator('input[placeholder*="Search"], input[name="q"], #search-input, [data-automation-id*="search"]').first();
    if (!searchBox) {
      console.log('   ⚠️  Search box not found');
      return false;
    }
    
    // Clear and type search term
    await searchBox.click();
    await searchBox.fill('');
    await searchBox.fill(item.searchTerm || item.name);
    await searchBox.press('Enter');
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Look for "Add to Cart" button on first product
    const addButton = await page.locator('button:has-text("Add to Cart"), button:has-text("Add"), [data-automation-id*="add"]').first();
    
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Added to cart');
      return true;
    } else {
      console.log('   ⚠️  Add button not found');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runAutomation() {
  const items = loadItems();
  if (items.length === 0) {
    console.log('❌ No items to add');
    return;
  }
  
  console.log('🛒 HEB Auto-Add to Cart (Chrome Playwright)');
  console.log(`📦 ${items.length} items to add\n`);
  
  // Launch Chrome with Marvin profile
  const context = await chromium.launchPersistentContext(CHROME_USER_DATA, {
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-restore-session-state',
      '--disable-session-crashed-bubble',
      '--disable-infobars'
    ],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Go to HEB
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    
    // Check if login required
    const url = page.url();
    if (url.includes('login') || url.includes('signin')) {
      console.log('\n⚠️  HEB login required!');
      console.log('   Please log in manually in the browser window.');
      console.log('   Press ENTER here when logged in...');
      
      // Wait for user input
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
      
      await page.waitForTimeout(3000);
    }
    
    // Add items
    let added = 0;
    let failed = 0;
    
    for (let i = 0; i < items.length; i++) {
      const success = await addItemToCart(page, items[i], i);
      if (success) added++;
      else failed++;
      
      // Brief pause between items
      await page.waitForTimeout(1000);
      
      // Go back to homepage for next search
      await page.goto('https://www.heb.com');
      await page.waitForTimeout(2000);
    }
    
    console.log(`\n📊 Results: ${added} added, ${failed} failed, ${items.length} total`);
    
    // Take final screenshot
    await page.screenshot({ path: 'heb-cart-final.png', fullPage: true });
    console.log('📸 Screenshot saved: heb-cart-final.png');
    
    // Keep browser open
    console.log('\n✅ Done! Browser will stay open.');
    console.log('   Review your cart and checkout when ready.');
    
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await context.close();
  }
}

runAutomation().catch(console.error);
