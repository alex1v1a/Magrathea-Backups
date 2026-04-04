const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addHEBItems() {
  console.log('🛒 HEB Auto-Add - Direct Launch (No CDP)\n');
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  console.log(`📦 ${items.length} items to add\n`);
  
  // Launch Chrome with Alexander's profile directly
  console.log('Launching Chrome with Alexander\'s profile...');
  const context = await chromium.launchPersistentContext(
    'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data',
    {
      headless: false,
      args: [
        '--profile-directory=Default',
        '--start-maximized',
        '--no-first-run'
      ]
    }
  );
  
  const page = context.pages()[0] || await context.newPage();
  
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
    console.log('\n⚠️  Please LOGIN to HEB in the Chrome window');
    console.log('Waiting for login (120 seconds max)...\n');
    
    for (let i = 0; i < 24; i++) {
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
    console.log('\n❌ Still not logged in. Exiting.');
    console.log('Browser stays open for you to login manually.');
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
  console.log('\nBrowser stays open.');
}

addHEBItems().catch(console.error);
