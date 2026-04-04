const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Alexander's Chrome profile
const USER_DATA_DIR = 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data';

async function addItemsWithAlexanderProfile() {
  console.log('🛒 HEB Cart - Using Alexander\'s Chrome Profile\n');
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  console.log(`Loaded ${items.length} items\n`);
  
  // Launch with Alexander's profile (Default)
  console.log('Launching Chrome with Alexander\'s profile...');
  console.log('Profile:', USER_DATA_DIR);
  
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      '--start-maximized',
      '--profile-directory=Default'
    ]
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  // Go to HEB
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Check login status
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') && 
           !document.querySelector('a[href*="/login"]');
  });
  
  console.log('Login status:', isLoggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN');
  
  if (!isLoggedIn) {
    console.log('\n⚠️  Please login in the Chrome window');
    console.log('Waiting 60 seconds for login...\n');
    
    // Wait for login
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const nowLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="account-menu"]') && 
               !document.querySelector('a[href*="/login"]');
      });
      
      if (nowLoggedIn) {
        console.log('✅ Login detected!\n');
        break;
      }
      
      if ((i + 1) % 3 === 0) {
        console.log(`Waiting... (${(i + 1) * 5}s)`);
      }
    }
  }
  
  // Verify login
  const loggedInNow = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]');
  });
  
  if (!loggedInNow) {
    console.log('❌ Not logged in. Please login and run again.');
    console.log('Browser stays open for you to login.');
    return;
  }
  
  console.log('✅ Starting to add items...\n');
  
  // Add items one by one
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
  console.log('Browser stays open.');
}

addItemsWithAlexanderProfile().catch(console.error);
