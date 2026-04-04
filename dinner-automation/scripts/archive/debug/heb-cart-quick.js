const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Edge...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) page = await context.newPage();
  
  console.log('Going to cart...');
  await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  // Get cart count
  const cartCount = await page.evaluate(() => {
    const badge = document.querySelector('a[data-testid="cart-link"]');
    const match = badge?.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
    return match ? parseInt(match[1]) : 0;
  });
  
  console.log(`Cart has ${cartCount} items\n`);
  console.log('Scrolling to load items...\n');
  
  // Scroll multiple times
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
    process.stdout.write('.');
  }
  console.log('\n');
  
  // Get cart items
  const items = await page.evaluate(() => {
    const results = [];
    const cartItems = document.querySelectorAll('[class*="CartItem"]');
    
    cartItems.forEach((item, idx) => {
      const nameEl = item.querySelector('h3');
      const qtyEl = item.querySelector('input[type="number"]');
      
      if (nameEl) {
        results.push({
          num: idx + 1,
          name: nameEl.textContent?.trim(),
          qty: qtyEl ? qtyEl.value : '1'
        });
      }
    });
    
    return results;
  });
  
  console.log(`Found ${items.length} items:\n`);
  items.forEach(item => {
    console.log(`${String(item.num).padStart(2)}. ${item.name}`);
    console.log(`    Qty: ${item.qty}`);
  });
  
  await browser.close();
})();
