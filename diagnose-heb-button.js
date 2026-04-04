const { chromium } = require('playwright');

async function diagnoseHEBButton() {
  console.log('🔍 Diagnosing HEB Add to Cart Button...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Go to a specific product page
    console.log('Navigating to cod fillets search...');
    await page.goto('https://www.heb.com/search?q=cod+fillets', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'heb-diagnose-1.png', fullPage: false });
    console.log('Screenshot saved: heb-diagnose-1.png');
    
    // Check for button
    const buttons = await page.locator('button[data-qe-id="addToCart"]').all();
    console.log(`\nFound ${buttons.length} buttons with data-qe-id="addToCart"`);
    
    for (let i = 0; i < Math.min(buttons.length, 3); i++) {
      const btn = buttons[i];
      const visible = await btn.isVisible().catch(() => false);
      const enabled = await btn.isEnabled().catch(() => false);
      const text = await btn.textContent().catch(() => 'no text');
      const disabled = await btn.getAttribute('disabled').catch(() => null);
      
      console.log(`\nButton ${i + 1}:`);
      console.log(`  Visible: ${visible}`);
      console.log(`  Enabled: ${enabled}`);
      console.log(`  Disabled attr: ${disabled}`);
      console.log(`  Text: ${text?.substring(0, 50)}`);
      
      // Get outerHTML
      const html = await btn.evaluate(el => el.outerHTML.substring(0, 200));
      console.log(`  HTML: ${html}...`);
    }
    
    // Check cart count
    const cartLink = await page.locator('a[data-testid="cart-link"]').first();
    const cartLabel = await cartLink.getAttribute('aria-label').catch(() => 'not found');
    console.log(`\n🛒 Cart: ${cartLabel}`);
    
    // Try clicking first button with different methods
    if (buttons.length > 0) {
      console.log('\n--- Click Testing ---');
      
      // Method 1: Normal click
      try {
        await buttons[0].click({ timeout: 5000 });
        console.log('✅ Method 1 (click) succeeded');
      } catch (e) {
        console.log(`❌ Method 1 failed: ${e.message}`);
      }
      
      await page.waitForTimeout(3000);
      
      // Check cart again
      const cartLabel2 = await cartLink.getAttribute('aria-label').catch(() => 'not found');
      console.log(`🛒 Cart after click: ${cartLabel2}`);
      
      // Method 2: JavaScript click
      try {
        await buttons[0].evaluate(el => el.click());
        console.log('✅ Method 2 (JS click) succeeded');
      } catch (e) {
        console.log(`❌ Method 2 failed: ${e.message}`);
      }
      
      await page.waitForTimeout(3000);
      
      // Check cart again
      const cartLabel3 = await cartLink.getAttribute('aria-label').catch(() => 'not found');
      console.log(`🛒 Cart after JS click: ${cartLabel3}`);
      
      // Method 3: force click
      try {
        await buttons[0].click({ force: true, timeout: 5000 });
        console.log('✅ Method 3 (force click) succeeded');
      } catch (e) {
        console.log(`❌ Method 3 failed: ${e.message}`);
      }
      
      await page.waitForTimeout(3000);
      
      // Check cart again
      const cartLabel4 = await cartLink.getAttribute('aria-label').catch(() => 'not found');
      console.log(`🛒 Cart after force click: ${cartLabel4}`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'heb-diagnose-2.png', fullPage: false });
    console.log('\nFinal screenshot saved: heb-diagnose-2.png');
    
    await browser.close();
    console.log('\n✅ Diagnosis complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnoseHEBButton();
