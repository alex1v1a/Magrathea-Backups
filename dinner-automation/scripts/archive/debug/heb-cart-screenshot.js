const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) page = await context.newPage();
  
  await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
  
  // Wait for cart items to appear
  console.log('Waiting for cart items to load...');
  await page.waitForTimeout(8000);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'dinner-automation/data/heb-cart-screenshot.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Try multiple approaches to find items
  const results = await page.evaluate(() => {
    const r = {
      cartSection: !!document.querySelector('[data-testid="cart-section"]'),
      cartItemsCount: document.querySelectorAll('[class*="CartItem"]').length,
      allH3: document.querySelectorAll('h3').length,
      bodyHasCart: document.body.innerText.includes('Review cart'),
      emptyCart: document.body.innerText.includes('Empty cart'),
      firstH3: document.querySelector('h3')?.textContent?.trim()
    };
    
    // Get all h3 elements (product names are often in h3)
    r.h3Texts = Array.from(document.querySelectorAll('h3')).slice(0, 10).map(h => h.textContent?.trim()).filter(Boolean);
    
    return r;
  });
  
  console.log('Results:', JSON.stringify(results, null, 2));
  
  await browser.close();
})();
