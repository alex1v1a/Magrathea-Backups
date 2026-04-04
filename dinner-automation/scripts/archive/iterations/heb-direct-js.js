const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function directHEBLogin() {
  console.log('🛒 HEB Direct Login via JavaScript Injection\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Inject anti-detection script
  await context.addInitScript(() => {
    delete navigator.__proto__.webdriver;
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
  
  // Go directly to login
  console.log('Loading HEB login page directly...');
  await page.goto('https://accounts.heb.com/login', { waitUntil: 'networkidle' });
  await sleep(8000);
  
  // Take screenshot
  await page.screenshot({ path: 'heb-login-state.png' });
  
  // Use JavaScript to fill form directly
  console.log('Attempting JavaScript injection...');
  
  const loginResult = await page.evaluate(({email, pass}) => {
    // Find all forms
    const forms = document.querySelectorAll('form');
    console.log(`Found ${forms.length} forms`);
    
    // Find all inputs
    const allInputs = document.querySelectorAll('input');
    console.log(`Found ${allInputs.length} inputs`);
    
    // Log each input
    allInputs.forEach((input, i) => {
      console.log(`Input ${i}: type=${input.type}, name=${input.name}, id=${input.id}`);
    });
    
    // Try to find and fill email
    const emailInput = document.querySelector('input[type="email"], input[name="email"], input[name="username"]');
    const passInput = document.querySelector('input[type="password"]');
    const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
    
    if (emailInput && passInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      passInput.value = pass;
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      if (submitBtn) {
        submitBtn.click();
        return 'Submitted';
      }
      return 'Filled but no submit button';
    }
    
    return `Email: ${!!emailInput}, Pass: ${!!passInput}`;
  }, {email: HEB_EMAIL, pass: HEB_PASS});
  
  console.log('Login result:', loginResult);
  await sleep(10000);
  
  // Check if logged in
  const url = page.url();
  console.log(`Current URL: ${url}`);
  
  if (!url.includes('login') && !url.includes('accounts')) {
    console.log('✅ Login successful!');
    
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
    
    console.log('\n✅ Complete!');
    await page.goto('https://www.heb.com/cart');
  } else {
    console.log('⚠️  Still on login page');
    await page.screenshot({ path: 'heb-login-final.png' });
  }
}

directHEBLogin().catch(console.error);
