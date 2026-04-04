const { chromium } = require('playwright');
const fs = require('fs').promises;

(async () => {
  console.log('Connecting to Edge...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) page = await context.newPage();
  
  console.log('Going to cart (wait for load)...');
  await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000); // Wait 10 seconds for everything to load
  
  // Get cart count
  const info = await page.evaluate(() => ({
    cartCount: (() => {
      const badge = document.querySelector('a[data-testid="cart-link"]');
      const match = badge?.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
      return match ? parseInt(match[1]) : 0;
    })(),
    cartHTML: document.querySelector('[data-testid="cart-section"]')?.innerHTML?.substring(0, 5000) || 
              document.querySelector('main')?.innerHTML?.substring(0, 5000) ||
              'No cart section found',
    allText: document.body.innerText.substring(0, 3000)
  }));
  
  console.log(`\nCart count: ${info.cartCount}\n`);
  console.log('Page text preview:');
  console.log(info.allText);
  
  // Save full HTML for analysis
  await fs.writeFile('dinner-automation/data/cart-html-snapshot.txt', info.cartHTML);
  console.log('\nHTML snapshot saved to dinner-automation/data/cart-html-snapshot.txt');
  
  await browser.close();
})();
