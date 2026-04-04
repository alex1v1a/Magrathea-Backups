const { chromium } = require('playwright');

async function readCartFromStorage() {
  console.log('🛒 Reading cart from localStorage...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://www.heb.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Read PurchaseCart from localStorage
    const cartData = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return { error: e.message, raw: localStorage.getItem('PurchaseCart')?.substring(0, 500) };
      }
    });
    
    if (cartData) {
      console.log('Cart Data Structure:');
      console.log(JSON.stringify(cartData, null, 2).substring(0, 2000));
      
      // Try to find item count
      let itemCount = 0;
      if (cartData.items) {
        itemCount = cartData.items.length;
      } else if (cartData.cartItems) {
        itemCount = cartData.cartItems.length;
      } else if (cartData.lineItems) {
        itemCount = cartData.lineItems.length;
      } else if (cartData.products) {
        itemCount = cartData.products.length;
      } else if (cartData.count) {
        itemCount = cartData.count;
      } else if (cartData.totalItems) {
        itemCount = cartData.totalItems;
      } else if (cartData.itemCount) {
        itemCount = cartData.itemCount;
      }
      
      console.log(`\n✅ Cart item count: ${itemCount}`);
      
      // Show all keys
      console.log('\nCart object keys:', Object.keys(cartData).join(', '));
    } else {
      console.log('No cart data found in localStorage');
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

readCartFromStorage();
