const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addItemsToHEB() {
  console.log('🛒 Adding items to HEB cart...\n');
  
  // Connect to existing Edge
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  
  console.log(`Found ${items.length} items to add\n`);
  
  const results = { added: [], failed: [], skipped: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i+1}/${items.length}] ${item.name}...`);
    
    try {
      // Search for item
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`);
      await sleep(4000);
      
      // Look for add to cart button
      const addBtn = page.locator('button[data-testid*="add-to-cart"], button:has-text("Add to cart")').first();
      
      if (await addBtn.count() > 0) {
        // Check if already in cart (button says something else)
        const btnText = await addBtn.textContent().catch(() => '');
        
        if (btnText.toLowerCase().includes('add')) {
          await addBtn.click();
          await sleep(2000);
          
          // Verify it was added
          const confirm = await page.locator('[data-testid*="cart"], .cart-confirmation, text=/added/i').first();
          if (await confirm.count() > 0 || await addBtn.textContent().catch(() => '').includes('1')) {
            console.log('   ✅ Added to cart');
            results.added.push(item.name);
          } else {
            console.log('   ⚠️  Clicked but unconfirmed');
            results.skipped.push(item.name);
          }
        } else {
          console.log('   ℹ️  Already in cart or unavailable');
          results.skipped.push(item.name);
        }
      } else {
        console.log('   ❌ Add button not found');
        results.failed.push(item.name);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.failed.push(item.name);
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Added: ${results.added.length}`);
  console.log(`   ℹ️  Skipped/Already in cart: ${results.skipped.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);
  
  // Go to cart
  console.log('\nOpening cart...');
  await page.goto('https://www.heb.com/cart');
  await sleep(3000);
  
  console.log('✅ Done!');
  
  await browser.close();
}

addItemsToHEB().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
