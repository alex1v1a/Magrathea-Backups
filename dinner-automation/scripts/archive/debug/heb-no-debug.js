const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function hebLoginAndAdd() {
  console.log('🛒 HEB Automation - No Debug Port\n');
  
  // Launch Chrome directly (no debug port)
  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized', '--no-first-run']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Navigate to HEB
  console.log('Going to HEB login...');
  await page.goto('https://www.heb.com');
  await sleep(4000);
  
  // Click My Account / Login
  console.log('Clicking login...');
  try {
    await page.click('button:has-text("My account"), a[href*="/login"]');
  } catch (e) {
    await page.goto('https://accounts.heb.com/login');
  }
  await sleep(5000);
  
  // Wait for and fill email
  console.log('Entering credentials...');
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  await page.fill('input[type="email"], input[name="email"]', HEB_EMAIL);
  await sleep(1000);
  
  // Fill password
  await page.fill('input[type="password"]', HEB_PASS);
  await sleep(1000);
  
  // Click login
  await page.click('button[type="submit"]');
  await sleep(8000);
  
  // Check if logged in
  const url = page.url();
  console.log(`Current URL: ${url}`);
  
  if (!url.includes('login') && !url.includes('accounts')) {
    console.log('✅ Logged in!');
    
    // Add items
    const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
    const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
    console.log(`\nAdding ${items.length} items...\n`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[${i+1}/${items.length}] ${item.name}...`);
      
      try {
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`);
        await sleep(4000);
        
        const addBtn = page.locator('button[data-testid*="add-to-cart"]').first();
        if (await addBtn.count() > 0) {
          await addBtn.click();
          await sleep(2000);
          console.log('   ✅ Added');
        } else {
          console.log('   ❌ Button not found');
        }
      } catch (err) {
        console.log(`   ❌ ${err.message}`);
      }
    }
    
    console.log('\n✅ All items processed!');
    await page.goto('https://www.heb.com/cart');
    
  } else {
    console.log('⚠️  Login may have failed. Check browser window.');
  }
}

hebLoginAndAdd().catch(console.error);
