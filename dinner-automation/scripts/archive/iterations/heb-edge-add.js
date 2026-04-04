const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addHEBItems() {
  console.log('🛒 HEB Auto-Add - Using Edge\n');
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  console.log(`📦 ${items.length} items to add\n`);
  
  // Launch Edge
  console.log('Launching Microsoft Edge...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Go to HEB
  console.log('Navigating to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Check login
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]');
  });
  
  console.log('Login status:', isLoggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN');
  
  if (!isLoggedIn) {
    console.log('\n⚠️  Please LOGIN to HEB in the Edge window');
    console.log('Waiting for login (180 seconds max)...\n');
    
    for (let i = 0; i < 36; i++) {
      await sleep(5000);
      const nowLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="account-menu"]');
      });
      
      if (nowLoggedIn) {
        console.log('✅ Login detected!\n');
        break;
      }
      
      if ((i + 1) % 4 === 0) {
        console.log(`Waiting... (${(i + 1) * 5}s)`);
      }
    }
  }
  
  // Verify login
  const loggedInNow = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]');
  });
  
  if (!loggedInNow) {
    console.log('\n❌ Not logged in. Keeping browser open.');
    return;
  }
  
  // Add items
  console.log('✅ Starting to add items...\n');
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i+1}/${items.length}] ${item.name}...`);
    
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
  
  console.log(`\n✅ Complete! Added: ${results.added.length}/${items.length}`);
}

addHEBItems().catch(console.error);
