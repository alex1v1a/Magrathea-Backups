const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function advancedHEBLogin() {
  console.log('🛒 HEB Advanced Login Attempt\n');
  
  // Launch with anti-detection measures
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.0 Edg/144.0.0.0',
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  
  // Remove webdriver property
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
  });
  
  const page = await context.newPage();
  
  // Go to HEB and wait
  console.log('Navigating to HEB...');
  await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
  await sleep(5000);
  
  // Click My Account with human-like behavior
  console.log('Clicking My Account...');
  const accountBtn = await page.locator('button, a').filter({ hasText: /My account|Account|Log in/i }).first();
  
  if (await accountBtn.count() > 0) {
    // Move mouse like human
    await accountBtn.hover();
    await sleep(500 + Math.random() * 500);
    await accountBtn.click();
  } else {
    await page.goto('https://accounts.heb.com/login');
  }
  
  await sleep(6000);
  
  // Wait for and interact with login form
  console.log('Looking for login form...');
  
  try {
    // Wait for any input to appear
    await page.waitForSelector('input', { timeout: 15000 });
    
    // Find all inputs and log them
    const inputs = await page.locator('input:visible').all();
    console.log(`Found ${inputs.length} visible inputs`);
    
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type').catch(() => 'text');
      const placeholder = await inputs[i].getAttribute('placeholder').catch(() => '');
      console.log(`  Input ${i}: type=${type}, placeholder=${placeholder}`);
    }
    
    // Try to find and fill email
    const emailInput = await page.locator('input[type="email"]:visible, input[name="email"]:visible, input[placeholder*="email" i]:visible').first();
    
    if (await emailInput.count() > 0) {
      console.log('Filling email...');
      await emailInput.click();
      await sleep(300);
      await emailInput.fill(HEB_EMAIL);
      await sleep(500);
      
      // Tab to password or find it
      await page.keyboard.press('Tab');
      await sleep(500);
      
      // Try to fill password
      const passInput = await page.locator('input[type="password"]:visible').first();
      if (await passInput.count() > 0) {
        console.log('Filling password...');
        await passInput.fill(HEB_PASS);
        await sleep(500);
        
        // Submit
        await page.keyboard.press('Enter');
        console.log('Submitted login form');
        await sleep(10000);
        
        // Check result
        const url = page.url();
        if (!url.includes('login')) {
          console.log('✅ Login appears successful!');
          
          // Add items
          await addItems(page);
        } else {
          console.log('⚠️  Still on login page');
          await page.screenshot({ path: 'heb-login-result.png' });
        }
      }
    } else {
      console.log('❌ Could not find email input');
      await page.screenshot({ path: 'heb-no-inputs.png' });
    }
  } catch (err) {
    console.error('Error during login:', err.message);
    await page.screenshot({ path: 'heb-error.png' });
  }
}

async function addItems(page) {
  const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
  
  console.log(`\nAdding ${items.length} items...\n`);
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
}

advancedHEBLogin().catch(console.error);
