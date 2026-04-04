const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 5000)); // Wait longer for cart to load
  
  // Scroll down to load cart items
  await page.evaluate(() => window.scrollTo(0, 800));
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to find cart items with various selectors
  const cartData = await page.evaluate(() => {
    const results = {
      selectors: {},
      items: []
    };
    
    // Check various selectors
    const selectors = {
      cartItem: [
        '[data-testid="cart-item"]',
        '[data-qe-id="cartItem"]',
        '.CartItem_cartItem__',
        '[class*="CartItem"]',
        '.cart-item',
        '[data-automation-id="cart-item"]'
      ],
      productName: [
        '[data-testid="product-name"]',
        '[data-qe-id="productName"]',
        '.ProductName_productName__',
        '[class*="ProductName"]',
        '.product-name',
        'h3', 'h4'
      ],
      quantity: [
        '[data-testid="quantity-selector"]',
        '[data-qe-id="quantity"]',
        'input[type="number"]',
        '[class*="quantity"]'
      ]
    };
    
    for (const [key, selectorList] of Object.entries(selectors)) {
      for (const sel of selectorList) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          results.selectors[key] = { selector: sel, count: elements.length };
          break;
        }
      }
    }
    
    // Try to extract all text from elements that might be cart items
    const allElements = document.querySelectorAll('*');
    const possibleItems = [];
    
    for (const el of allElements) {
      const text = el.textContent?.trim();
      // Look for price patterns like $12.01
      if (text && /\$\d+\.\d+/.test(text) && text.length < 200) {
        const parent = el.parentElement;
        const parentText = parent?.textContent?.trim();
        if (parentText && parentText.length > 50 && parentText.length < 500) {
          possibleItems.push({
            price: text.match(/\$[\d.]+/)?.[0],
            text: parentText.substring(0, 200)
          });
        }
      }
    }
    
    results.items = possibleItems.slice(0, 20); // First 20
    
    // Also get raw HTML structure around cart area
    const cartSection = document.querySelector('[data-testid="cart-section"]') 
      || document.querySelector('[class*="cart"]')
      || document.querySelector('main');
    
    if (cartSection) {
      results.cartHTML = cartSection.innerHTML.substring(0, 2000);
    }
    
    return results;
  });
  
  console.log('Selectors found:', JSON.stringify(cartData.selectors, null, 2));
  console.log('\nPossible items (first 5):');
  cartData.items.slice(0, 5).forEach((item, i) => {
    console.log(`${i + 1}. ${item.price} - ${item.text.substring(0, 100)}...`);
  });
  
  await browser.close();
})();
