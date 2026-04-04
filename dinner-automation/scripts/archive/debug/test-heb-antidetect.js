const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test items
const testItems = [
  { name: 'Milk', searchTerm: 'whole milk', amount: '1 gallon' },
  { name: 'Eggs', searchTerm: 'large eggs', amount: '1 dozen' },
  { name: 'Bread', searchTerm: 'white bread', amount: '1 loaf' }
];

async function testHEB() {
  console.log('Testing HEB with anti-detection measures...\n');
  
  // Launch with anti-detection
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--start-maximized'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  
  const page = await context.newPage();
  
  // Hide automation
  await page.addInitScript(() => {
    // Delete webdriver property
    delete Object.getPrototypeOf(navigator).webdriver;
    
    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // Fake chrome
    window.chrome = { runtime: {} };
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' 
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );
  });
  
  console.log('Going to HEB...');
  
  try {
    await page.goto('https://www.heb.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('Page loaded. Waiting for content...');
    await page.waitForTimeout(5000);
    
    // Check for error message
    const errorText = await page.locator('text=/ad blocker|firewall|VPN/i').first().textContent().catch(() => null);
    if (errorText) {
      console.log('❌ HEB showing blocking message:', errorText.substring(0, 100));
    } else {
      console.log('✅ Page loaded without blocking message');
    }
    
    // Check login status
    const hasAccount = await page.locator('[data-testid="account-menu"], a[href*="/account"]').first().count() > 0;
    const hasSignIn = await page.locator('a[href*="/login"]').first().count() > 0;
    
    console.log('Account menu visible:', hasAccount);
    console.log('Sign in button visible:', hasSignIn);
    console.log('Logged in:', hasAccount && !hasSignIn);
    
    // Test search
    console.log('\nTesting search for "milk"...');
    await page.goto('https://www.heb.com/search?q=milk', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // Check for add buttons
    const buttons = await page.locator('button[data-testid*="add-to-cart"]').all();
    console.log(`Found ${buttons.length} add-to-cart buttons`);
    
    for (let i = 0; i < Math.min(3, buttons.length); i++) {
      const testId = await buttons[i].getAttribute('data-testid').catch(() => 'none');
      const text = await buttons[i].textContent().catch(() => 'no text');
      console.log(`  Button ${i+1}: "${text?.trim()}" (data-testid: ${testId})`);
    }
    
    // Try to click first button
    if (buttons.length > 0) {
      console.log('\nTrying to click first button...');
      try {
        await buttons[0].scrollIntoViewIfNeeded();
        await buttons[0].click({ delay: 100 });
        await buttons[0].evaluate(el => el.style.outline = '4px solid lime');
        console.log('✅ Clicked!');
        
        await page.waitForTimeout(3000);
        
        // Check cart
        const cartCount = await page.locator('[data-testid*="cart"] .count, [data-testid*="cart"] [data-testid*="badge"]').first().textContent().catch(() => '0');
        console.log('Cart count:', cartCount);
        
      } catch (err) {
        console.log('❌ Click failed:', err.message);
      }
    }
    
    // Keep browser open for inspection
    console.log('\nBrowser staying open for 60 seconds...');
    await page.waitForTimeout(60000);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
}

testHEB().catch(console.error);
