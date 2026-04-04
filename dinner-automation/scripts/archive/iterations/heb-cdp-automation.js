const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

async function hebAutomation() {
  console.log('🛒 HEB Automation via Debug Port 9222\n');
  
  // Connect to running Chrome
  console.log('Connecting to Chrome on port 9222...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  console.log('✅ Connected!\n');
  
  // Get page
  let page = browser.contexts()[0].pages()[0];
  
  // Navigate to HEB
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Check login status
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]');
  });
  
  if (!isLoggedIn) {
    console.log('Not logged in. Attempting login...\n');
    
    // Click login
    await page.click('a[href*="/login"], button:has-text("My account")');
    await sleep(4000);
    
    // Fill email
    await page.fill('input[type="email"]', HEB_EMAIL);
    await sleep(1000);
    
    // Fill password
    await page.fill('input[type="password"]', HEB_PASS);
    await sleep(1000);
    
    // Submit
    await page.click('button[type="submit"]');
    await sleep(6000);
  }
  
  // Verify login
  const nowLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]');
  });
  
  if (!nowLoggedIn) {
    console.log('❌ Login failed. Please login manually in Chrome window.');
    await browser.disconnect();
    return;
  }
  
  console.log('✅ Logged in! Adding items...\n');
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i+1}/${items.length}] ${item.name}...`);
    
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`);
      await sleep(4000);
      
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
  
  await page.goto('https://www.heb.com/cart');
  await browser.disconnect();
}

hebAutomation().catch(console.error);
