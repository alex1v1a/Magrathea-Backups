const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addItemsToCart() {
  console.log('🛒 Testing HEB Cart Addition\n');
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  console.log(`Loaded ${items.length} items\n`);
  
  // Launch browser
  console.log('Launching Chrome...');
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Go to HEB
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Check login
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]');
  });
  
  if (!isLoggedIn) {
    console.log('⚠️  Please LOGIN to HEB in the browser window');
    console.log('Waiting 60 seconds...\n');
    await sleep(60000);
  }
  
  // Add items one by one
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < Math.min(5, items.length); i++) {
    const item = items[i];
    console.log(`[${i+1}] ${item.name}...`);
    
    try {
      // Search
      await page.fill('input[placeholder*="Search" i]', item.searchTerm || item.name);
      await page.press('input[placeholder*="Search" i]', 'Enter');
      await sleep(4000);
      
      // Click add button
      const addBtn = page.locator('button[data-testid*="add-to-cart"]').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        await addBtn.evaluate(el => el.style.outline = '4px solid lime');
        await sleep(2000);
        console.log('   ✅ Added');
        results.added.push(item.name);
      } else {
        throw new Error('Button not found');
      }
      
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
      results.failed.push(item.name);
    }
  }
  
  console.log(`\n✅ Added: ${results.added.length}, ❌ Failed: ${results.failed.length}`);
  
  // Keep browser open
  console.log('\nBrowser stays open. Press Ctrl+C to exit.');
}

addItemsToCart().catch(console.error);
