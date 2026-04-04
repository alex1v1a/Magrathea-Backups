const { chromium } = require('playwright');

async function checkActualCart() {
  console.log('🔍 Checking actual HEB cart state...\n');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222', {
      timeout: 60000
    });
    
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Go to cart page
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'heb-cart-actual.png', fullPage: true });
    console.log('📸 Screenshot saved: heb-cart-actual.png\n');
    
    // Get cart count from multiple sources
    const cartData = await page.evaluate(() => {
      const data = {
        cartLinkText: '',
        cartLinkAria: '',
        localStorageCart: null,
        visibleItems: [],
        itemCount: 0
      };
      
      // Check cart link
      const cartLink = document.querySelector('a[data-testid="cart-link"]');
      if (cartLink) {
        data.cartLinkText = cartLink.textContent;
        data.cartLinkAria = cartLink.getAttribute('aria-label');
      }
      
      // Check localStorage
      try {
        const cartRaw = localStorage.getItem('PurchaseCart');
        if (cartRaw) {
          data.localStorageCart = JSON.parse(cartRaw);
        }
      } catch (e) {}
      
      // Count visible items
      const itemSelectors = [
        '[data-testid*="cart-item"]',
        '.cart-item',
        '[data-qe-id*="cart"]',
        '.cart-product'
      ];
      
      for (const selector of itemSelectors) {
        const items = document.querySelectorAll(selector);
        if (items.length > 0) {
          items.forEach(item => {
            const nameEl = item.querySelector('h3, h4, .product-name, [data-testid*="name"], .product-title');
            if (nameEl) {
              data.visibleItems.push(nameEl.textContent.trim());
            }
          });
          data.itemCount = items.length;
          break;
        }
      }
      
      return data;
    });
    
    console.log('📊 Cart Data:');
    console.log('  Cart link text:', cartData.cartLinkText);
    console.log('  Cart link aria:', cartData.cartLinkAria);
    console.log('  Visible items:', cartData.itemCount);
    console.log('  Item names:', cartData.visibleItems.slice(0, 10));
    
    if (cartData.localStorageCart) {
      console.log('\n📦 LocalStorage Cart:');
      console.log('  ProductNames:', cartData.localStorageCart.ProductNames?.split('<SEP>').filter(n => n).length || 0);
      console.log('  Products array:', cartData.localStorageCart.Products?.length || 0);
    }
    
    // Check for rice/naan specifically
    const hasRice = cartData.visibleItems.some(i => i.toLowerCase().includes('rice'));
    const hasNaan = cartData.visibleItems.some(i => i.toLowerCase().includes('naan'));
    
    console.log('\n✅ Key Items:');
    console.log('  Basmati rice in cart:', hasRice ? 'YES' : 'NO');
    console.log('  Naan bread in cart:', hasNaan ? 'YES' : 'NO');
    
    await page.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

checkActualCart();
