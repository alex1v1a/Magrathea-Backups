const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Credentials
const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

async function loginAndAddItems() {
  console.log('🛒 HEB Auto-Login & Add Items\n');
  
  // Load items
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  console.log(`📦 ${items.length} items to add\n`);
  
  // Launch actual Google Chrome (not Playwright's Chromium)
  console.log('Launching Google Chrome...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--start-maximized',
      '--no-first-run',
      '--disable-extensions'
    ]
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Go to HEB login page directly
  console.log('Navigating to HEB login...');
  await page.goto('https://www.heb.com/login');
  await sleep(5000);
  
  // Fill in email
  console.log('Entering email...');
  await page.fill('input[type="email"], input[name="username"]', HEB_EMAIL);
  await sleep(1000);
  
  // Fill in password  
  console.log('Entering password...');
  await page.fill('input[type="password"], input[name="password"]', HEB_PASS);
  await sleep(1000);
  
  // Click login
  console.log('Clicking login...');
  await page.click('button[type="submit"], button:has-text("Log in")');
  await sleep(8000);
  
  // Check if logged in
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') ||
           document.body.innerText.includes('Welcome') ||
           !document.querySelector('a[href*="/login"]');
  });
  
  if (!isLoggedIn) {
    console.log('⚠️  Login status unclear. Taking screenshot...');
    await page.screenshot({ path: 'heb-login-status.png' });
  } else {
    console.log('✅ Logged in successfully!\n');
  }
  
  // Add items
  console.log('Adding items to cart...\n');
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
  console.log(`❌ Failed: ${results.failed.length}`);
  
  // Go to cart
  await page.goto('https://www.heb.com/cart');
  console.log('\nCart opened for verification.');
}

loginAndAddItems().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
