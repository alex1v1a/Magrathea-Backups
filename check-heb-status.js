const { chromium } = require('playwright');

async function checkHEBStatus() {
  console.log('🔍 Checking HEB login status...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://www.heb.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Check for greeting
    const greeting = await page.locator('[data-testid="account-greeting"]').textContent().catch(() => '');
    console.log(`Account greeting: ${greeting || 'Not found'}`);
    
    // Check for login link vs account menu
    const loginLink = await page.locator('a[href*="login"]').isVisible().catch(() => false);
    const accountMenu = await page.locator('[data-testid="account-menu"]').isVisible().catch(() => false);
    
    console.log(`Login link visible: ${loginLink}`);
    console.log(`Account menu visible: ${accountMenu}`);
    
    // Get cart count from localStorage
    const cartData = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    });
    
    if (cartData) {
      const itemCount = cartData.ProductNames 
        ? cartData.ProductNames.split('<SEP>').filter(n => n.trim()).length 
        : 0;
      console.log(`\n🛒 Cart items: ${itemCount}`);
      console.log(`Cart total: $${cartData.OrderTotal || 'N/A'}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'heb-status-check.png', fullPage: false });
    console.log('\nScreenshot saved: heb-status-check.png');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkHEBStatus();
