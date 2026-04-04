const { chromium } = require('playwright');

const CDP_URL = 'http://localhost:9222';

async function loginToHEB() {
  console.log('🔐 Logging into HEB.com...\n');
  
  try {
    // Connect to existing Edge browser
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Check if already logged in
    console.log('Checking current login status...');
    await page.goto('https://www.heb.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const greeting = await page.locator('[data-testid="account-greeting"], .AccountButton_label, header :has-text("Hi,")').textContent().catch(() => '');
    
    if (greeting.includes('Hi,') || greeting.includes('Hello')) {
      console.log(`✅ Already logged in: ${greeting.trim()}`);
      await browser.close();
      return;
    }
    
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('https://www.heb.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill in credentials from environment
    const email = process.env.HEB_EMAIL || process.env.HEB_USERNAME;
    const password = process.env.HEB_PASSWORD;
    
    if (!email || !password) {
      console.error('❌ HEB credentials not found in environment');
      console.log('Looking for: HEB_EMAIL/HEB_USERNAME and HEB_PASSWORD');
      await browser.close();
      return;
    }
    
    console.log(`Logging in as: ${email}`);
    
    // Fill email
    await page.locator('input[type="email"], input[name="email"], #email').fill(email);
    await page.waitForTimeout(1000);
    
    // Fill password
    await page.locator('input[type="password"], input[name="password"], #password').fill(password);
    await page.waitForTimeout(1000);
    
    // Click login button
    await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), #login-button').click();
    
    console.log('Waiting for login to complete...');
    await page.waitForTimeout(5000);
    
    // Verify login
    const newGreeting = await page.locator('[data-testid="account-greeting"], .AccountButton_label').textContent().catch(() => '');
    
    if (newGreeting.includes('Hi,') || newGreeting.includes('Hello') || page.url().includes('heb.com') && !page.url().includes('login')) {
      console.log('✅ Login successful!');
      
      // Save session by visiting cart to ensure cookies are set
      await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      const cartCount = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem('PurchaseCart');
          if (!raw) return 0;
          const data = JSON.parse(raw);
          return data.ProductNames ? data.ProductNames.split('<SEP>').filter(n => n.trim()).length : 0;
        } catch (e) { return 0; }
      });
      
      console.log(`🛒 Cart items: ${cartCount}`);
      
    } else {
      console.log('⚠️ Login may have failed — check if 2FA or CAPTCHA is required');
      console.log(`Current URL: ${page.url()}`);
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

loginToHEB();
