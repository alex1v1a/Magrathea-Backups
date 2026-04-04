const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to HEB.com...');
  await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  console.log('\n=== SEARCH INPUT SELECTORS ===');
  
  // Try various search selectors
  const selectors = [
    '[data-testid="search-input"]',
    'input[name="q"]',
    'input[placeholder*="search" i]',
    '#search',
    'input[type="search"]',
    '[class*="search"] input',
    'header input',
    'nav input'
  ];
  
  for (const sel of selectors) {
    const el = await page.$(sel);
    console.log(`${sel}: ${el ? 'FOUND' : 'NOT FOUND'}`);
  }
  
  console.log('\n=== PRODUCT CARD SELECTORS ===');
  
  const productSelectors = [
    '[data-testid*="product"]',
    '.product-card',
    '[class*="product"]',
    '[data-automation-id*="product"]',
    '[class*="ProductCard"]'
  ];
  
  for (const sel of productSelectors) {
    const count = await page.$$eval(sel, els => els.length).catch(() => 0);
    console.log(`${sel}: ${count} elements`);
  }
  
  console.log('\n=== ADD TO CART BUTTONS ===');
  
  const cartSelectors = [
    'button:has-text("Add to Cart")',
    '[data-testid*="add-to-cart"]',
    'button[class*="add"]',
    '[aria-label*="Add to Cart"]'
  ];
  
  for (const sel of cartSelectors) {
    const count = await page.$$eval(sel, els => els.length).catch(() => 0);
    console.log(`${sel}: ${count} elements`);
  }
  
  console.log('\n=== PAGE STRUCTURE SAMPLE ===');
  const html = await page.content();
  console.log(html.substring(0, 3000));
  
  await browser.close();
  console.log('\nDone!');
})();
