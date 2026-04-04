const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function finalHEBAttempt() {
  console.log('🛒 HEB Final Login Attempt\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  // Go to login and wait extended time
  console.log('Loading HEB login (waiting 20 seconds for full load)...');
  await page.goto('https://accounts.heb.com/login');
  await sleep(20000);
  
  // Check what's actually on the page
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  
  // Look for email/password patterns in HTML
  const hasEmailInput = html.includes('type="email"') || html.includes('name="email"');
  const hasPassInput = html.includes('type="password"');
  const hasForm = html.includes('<form') || html.includes('<FORM');
  
  console.log('Email input found in HTML:', hasEmailInput);
  console.log('Password input found in HTML:', hasPassInput);
  console.log('Form found in HTML:', hasForm);
  
  // Take screenshot
  await page.screenshot({ path: 'heb-final-state.png', fullPage: true });
  console.log('Screenshot saved: heb-final-state.png');
  
  // If we found inputs, try to interact
  if (hasEmailInput || hasPassInput) {
    console.log('\nTrying to interact with form...');
    
    // Try Playwright selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      'input[name="username"]',
      'input[autocomplete="email"]',
      'input[autocomplete="username"]'
    ];
    
    for (const selector of emailSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.count() > 0) {
          console.log(`Found email with: ${selector}`);
          await el.fill(HEB_EMAIL);
          await sleep(500);
          break;
        }
      } catch (e) {}
    }
    
    const passSelectors = [
      'input[type="password"]',
      'input[autocomplete="current-password"]'
    ];
    
    for (const selector of passSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.count() > 0) {
          console.log(`Found password with: ${selector}`);
          await el.fill(HEB_PASS);
          await sleep(500);
          break;
        }
      } catch (e) {}
    }
    
    // Find submit
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Log")',
      'button:has-text("Sign")'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.count() > 0) {
          console.log(`Found submit with: ${selector}`);
          await el.click();
          break;
        }
      } catch (e) {}
    }
    
    await sleep(10000);
    
    const url = page.url();
    console.log(`Final URL: ${url}`);
    
    if (!url.includes('login')) {
      console.log('✅ SUCCESS! Login appears to have worked!');
      
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
      return;
    }
  }
  
  console.log('\n❌ HEB login form could not be automated.');
  console.log('The page appears to use advanced anti-bot protection.');
  console.log('\nBrowser will stay open - please login manually.');
}

finalHEBAttempt().catch(console.error);
