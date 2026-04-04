const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function hebEdgeAutomation() {
  console.log('🛒 HEB Automation via Microsoft Edge\n');
  
  // Launch Edge
  console.log('Launching Microsoft Edge...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized', '--no-first-run']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Navigate to HEB
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(4000);
  
  // Check if already logged in
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') ||
           document.body.innerText.includes('Welcome') ||
           document.body.innerText.includes('My account');
  });
  
  if (!isLoggedIn) {
    console.log('Not logged in. Attempting login...\n');
    
    // Click My Account / Login
    try {
      await page.click('button:has-text("My account"), a[href*="/login"], [data-testid="account-menu"]');
    } catch (e) {
      await page.goto('https://accounts.heb.com/login');
    }
    await sleep(5000);
    
    // Fill email
    console.log('Entering email...');
    await page.fill('input[type="email"], input[name="email"], input[name="username"]', HEB_EMAIL);
    await sleep(1000);
    
    // Fill password
    console.log('Entering password...');
    await page.fill('input[type="password"]', HEB_PASS);
    await sleep(1000);
    
    // Click login
    console.log('Clicking login...');
    await page.click('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
    await sleep(8000);
  }
  
  // Verify login
  const nowLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') ||
           document.body.innerText.includes('Welcome') ||
           !document.querySelector('a[href*="/login"]');
  });
  
  if (!nowLoggedIn) {
    console.log('⚠️  Login may have failed. Check Edge window.');
    console.log('Browser stays open for manual verification.');
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
  console.log(`❌ Failed: ${results.failed.length}`);
  
  await page.goto('https://www.heb.com/cart');
  console.log('\nCart opened for verification.');
}

hebEdgeAutomation().catch(err => {
  console.error('Error:', err.message);
});
