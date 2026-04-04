const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function hebEdgeImproved() {
  console.log('🛒 HEB Automation - Improved Edge Version\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Go directly to login page and wait for full load
  console.log('Loading HEB login page...');
  await page.goto('https://accounts.heb.com/login', { waitUntil: 'networkidle' });
  await sleep(5000);
  
  // Take screenshot to debug
  await page.screenshot({ path: 'heb-login-debug.png' });
  console.log('Screenshot saved: heb-login-debug.png');
  
  // Get page content to find fields
  const content = await page.content();
  console.log('Page loaded, looking for form fields...');
  
  // Try multiple strategies to find email field
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[id*="email" i]',
    'input[inputmode="email"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]'
  ];
  
  let emailField = null;
  for (const selector of emailSelectors) {
    try {
      const field = page.locator(selector).first();
      if (await field.count() > 0) {
        console.log(`Found email field: ${selector}`);
        emailField = field;
        break;
      }
    } catch (e) {}
  }
  
  if (!emailField) {
    console.log('⚠️  Email field not found with standard selectors');
    console.log('Trying JavaScript injection...');
    
    // Try to find any input field that might be email
    const inputs = await page.locator('input').all();
    console.log(`Total input fields found: ${inputs.length}`);
    
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type').catch(() => 'text');
      const name = await inputs[i].getAttribute('name').catch(() => '');
      const id = await inputs[i].getAttribute('id').catch(() => '');
      console.log(`Input ${i}: type=${type}, name=${name}, id=${id}`);
    }
    
    // Try filling the first visible input
    if (inputs.length > 0) {
      emailField = inputs[0];
    }
  }
  
  if (emailField) {
    console.log('Filling email...');
    await emailField.fill(HEB_EMAIL);
    await sleep(1000);
    
    // Find password field
    const passSelectors = [
      'input[type="password"]',
      'input[name="password"]'
    ];
    
    let passField = null;
    for (const selector of passSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.count() > 0) {
          console.log(`Found password field: ${selector}`);
          passField = field;
          break;
        }
      } catch (e) {}
    }
    
    if (passField) {
      console.log('Filling password...');
      await passField.fill(HEB_PASS);
      await sleep(1000);
      
      // Find submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button:has-text("Continue")',
        'input[type="submit"]'
      ];
      
      for (const selector of submitSelectors) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.count() > 0) {
            console.log(`Found submit button: ${selector}`);
            await btn.click();
            break;
          }
        } catch (e) {}
      }
      
      await sleep(8000);
      
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
        
        console.log('\n✅ All items processed!');
        await page.goto('https://www.heb.com/cart');
      } else {
        console.log('⚠️  Still on login page - check Edge window');
        await page.screenshot({ path: 'heb-login-failed.png' });
      }
    }
  } else {
    console.log('❌ Could not find any input fields');
  }
}

hebEdgeImproved().catch(console.error);
