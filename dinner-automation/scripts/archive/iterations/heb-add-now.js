const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addHEBItemsNewSession() {
  console.log('🛒 Adding items to HEB cart (new session)...\n');
  
  // Launch Edge fresh - user is already logged in via cookies
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  
  console.log(`Found ${items.length} items\n`);
  const results = { added: [], failed: [], alreadyInCart: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i+1}/${items.length}] ${item.name}...`);
    
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`, { timeout: 30000 });
      await sleep(3000);
      
      // Try multiple selectors for add button
      const selectors = [
        'button[data-testid*="add-to-cart"]',
        'button:has-text("Add to cart")',
        'button[data-automation-id*="add"]',
        '[data-testid="product-add-to-cart"]'
      ];
      
      let clicked = false;
      for (const selector of selectors) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            const text = await btn.textContent().catch(() => '');
            if (text.toLowerCase().includes('add')) {
              await btn.click();
              await sleep(2000);
              console.log('   ✅ Added');
              results.added.push(item.name);
              clicked = true;
              break;
            } else if (text.toLowerCase().includes('in cart') || text.includes('1')) {
              console.log('   ℹ️  Already in cart');
              results.alreadyInCart.push(item.name);
              clicked = true;
              break;
            }
          }
        } catch (e) {}
      }
      
      if (!clicked) {
        console.log('   ❌ Could not add');
        results.failed.push(item.name);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.failed.push(item.name);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Added: ${results.added.length}/${items.length}`);
  console.log(`   ℹ️  Already in cart: ${results.alreadyInCart.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed items: ${results.failed.join(', ')}`);
  }
  
  await page.goto('https://www.heb.com/cart');
  console.log('\n✅ Cart opened for review!');
}

addHEBItemsNewSession().catch(console.error);
