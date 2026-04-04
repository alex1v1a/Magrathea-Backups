const { chromium } = require('playwright');

async function deepCartInvestigation() {
  console.log('🔍 DEEP CART INVESTIGATION\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // 1. Check homepage localStorage
    console.log('=== 1. HOMEPAGE localStorage ===');
    await page.goto('https://www.heb.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    const homeStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('Cart') || key.includes('cart') || key.includes('Purchase')) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    
    console.log('Cart-related localStorage keys:', Object.keys(homeStorage));
    
    // 2. Navigate to cart page and check
    console.log('\n=== 2. CART PAGE DIRECT ===');
    await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'heb-cart-deep-check.png', fullPage: true });
    console.log('Screenshot saved: heb-cart-deep-check.png');
    
    // Check for empty cart message
    const emptyCartMsg = await page.locator('text=/empty|no items|cart is empty/i').isVisible().catch(() => false);
    console.log(`Empty cart message visible: ${emptyCartMsg}`);
    
    // Check for cart items on page
    const cartItems = await page.locator('[data-testid*="cart-item"], .cart-item, tr[class*="item"]').count().catch(() => 0);
    console.log(`Cart items visible on page: ${cartItems}`);
    
    // Check localStorage on cart page
    const cartStorage = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return { error: 'No PurchaseCart in localStorage' };
        const data = JSON.parse(raw);
        return {
          itemCount: data.ProductNames ? data.ProductNames.split('<SEP>').filter(n => n.trim()).length : 0,
          orderTotal: data.OrderTotal,
          productNames: data.ProductNames ? data.ProductNames.split('<SEP>').slice(0, 3) : [],
          rawSample: raw.substring(0, 200)
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('Cart localStorage:', cartStorage);
    
    // 3. Check cookies
    console.log('\n=== 3. COOKIES ===');
    const cookies = await context.cookies();
    const hebCookies = cookies.filter(c => c.domain.includes('heb.com'));
    console.log(`HEB cookies found: ${hebCookies.length}`);
    console.log('Cookie names:', hebCookies.map(c => c.name).join(', '));
    
    // 4. Check login status
    console.log('\n=== 4. LOGIN STATUS ===');
    const greeting = await page.locator('[data-testid="account-greeting"]').textContent().catch(() => 'Not found');
    console.log(`Account greeting: ${greeting}`);
    
    // 5. Try to add one test item manually
    console.log('\n=== 5. TEST ADD ===');
    await page.goto('https://www.heb.com/search?q=milk', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    const buttons = await page.locator('button[data-qe-id="addToCart"]').all();
    console.log(`Found ${buttons.length} Add to Cart buttons for "milk"`);
    
    if (buttons.length > 0) {
      // Check button state
      const firstBtn = buttons[0];
      const isVisible = await firstBtn.isVisible().catch(() => false);
      const isEnabled = await firstBtn.isEnabled().catch(() => false);
      const btnText = await firstBtn.textContent().catch(() => 'no text');
      
      console.log(`First button: visible=${isVisible}, enabled=${isEnabled}, text="${btnText?.trim()}"`);
      
      // Try clicking
      if (isVisible && isEnabled) {
        console.log('Clicking first button...');
        await firstBtn.click();
        await page.waitForTimeout(5000);
        
        // Check cart after click
        const afterClick = await page.evaluate(() => {
          try {
            const raw = localStorage.getItem('PurchaseCart');
            if (!raw) return { count: 0 };
            const data = JSON.parse(raw);
            return {
              count: data.ProductNames ? data.ProductNames.split('<SEP>').filter(n => n.trim()).length : 0,
              total: data.OrderTotal
            };
          } catch (e) { return { error: e.message }; }
        });
        
        console.log('Cart after click:', afterClick);
      }
    }
    
    await browser.close();
    console.log('\n=== INVESTIGATION COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

deepCartInvestigation();
