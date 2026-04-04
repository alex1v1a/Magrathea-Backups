const { chromium } = require('playwright');

async function clearBrokenCart() {
  console.log('🧹 Clearing broken HEB cart...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // 1. Clear localStorage cart data
    console.log('Step 1: Clearing localStorage...');
    await page.goto('https://www.heb.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => {
      localStorage.removeItem('PurchaseCart');
      localStorage.removeItem('CartDataStorageInfo');
      // Also clear any other cart-related items
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('cart') || key.toLowerCase().includes('purchase'))) {
          localStorage.removeItem(key);
        }
      }
    });
    console.log('✅ localStorage cleared');
    
    // 2. Navigate to cart and click "Try again" or clear button if present
    console.log('\nStep 2: Checking cart page...');
    await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'heb-cart-after-clear.png', fullPage: false });
    
    // Check if there's a "Try again" button and click it
    const tryAgainBtn = await page.locator('button:has-text("Try again")').first();
    if (await tryAgainBtn.isVisible().catch(() => false)) {
      console.log('Clicking "Try again" button...');
      await tryAgainBtn.click();
      await page.waitForTimeout(5000);
    }
    
    // Check for empty cart message
    const emptyMsg = await page.locator('text=/empty|no items|start shopping/i').first().isVisible().catch(() => false);
    console.log(`Empty cart message visible: ${emptyMsg}`);
    
    // 3. Verify cart is clear
    console.log('\nStep 3: Verifying cart is empty...');
    const afterClear = await page.evaluate(() => {
      const raw = localStorage.getItem('PurchaseCart');
      return {
        hasData: !!raw,
        data: raw ? JSON.parse(raw) : null
      };
    });
    
    if (!afterClear.hasData || !afterClear.data || afterClear.data.OrderTotal === 0) {
      console.log('✅ Cart successfully cleared!');
      console.log('Ready to add items fresh.');
    } else {
      console.log('⚠️ Cart may still have data:', afterClear.data.OrderTotal);
    }
    
    // 4. Try adding one item to verify it works
    console.log('\nStep 4: Testing with one item...');
    await page.goto('https://www.heb.com/search?q=milk', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    const buttons = await page.locator('button[data-qe-id="addToCart"]').all();
    if (buttons.length > 0 && await buttons[0].isVisible().catch(() => false)) {
      console.log('Found Add to Cart button, clicking...');
      await buttons[0].click();
      await page.waitForTimeout(5000);
      
      // Check if it was added
      const testResult = await page.evaluate(() => {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return { count: 0 };
        const data = JSON.parse(raw);
        return {
          count: data.ProductNames ? data.ProductNames.split('<SEP>').filter(n => n.trim()).length : 0,
          total: data.OrderTotal
        };
      });
      
      console.log('Test result:', testResult);
      
      if (testResult.count > 0) {
        console.log('✅ SUCCESS! Cart is working again.');
      } else {
        console.log('❌ Still having issues');
      }
    }
    
    await browser.close();
    console.log('\n=== CART CLEAR COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearBrokenCart();
