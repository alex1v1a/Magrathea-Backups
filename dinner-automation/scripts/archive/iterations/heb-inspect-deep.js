const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to HEB.com and searching for "milk"...');
  await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Search for milk
  const searchInput = await page.$('input[type="search"], input[name="q"]');
  if (searchInput) {
    await searchInput.fill('milk');
    await searchInput.press('Enter');
    await page.waitForTimeout(5000);
  }
  
  console.log('\n=== FINDING PRODUCT CARDS ===');
  
  // Get all product card structures
  const cards = await page.$$eval('div', divs => {
    return divs.filter(div => {
      const text = div.textContent || '';
      return text.includes('Add to Cart') && (text.includes('HEB') || text.includes('$'));
    }).slice(0, 5).map(div => ({
      className: div.className,
      dataTestId: div.getAttribute('data-testid'),
      dataAutomationId: div.getAttribute('data-automation-id'),
      parentClass: div.parentElement?.className?.substring(0, 100),
      html: div.outerHTML.substring(0, 500)
    }));
  });
  
  console.log(`Found ${cards.length} potential product cards`);
  cards.forEach((card, i) => {
    console.log(`\n--- Card ${i + 1} ---`);
    console.log('className:', card.className);
    console.log('data-testid:', card.dataTestId);
    console.log('data-automation-id:', card.dataAutomationId);
    console.log('parentClass:', card.parentClass);
  });
  
  // Try to find specific selectors that work
  console.log('\n=== TESTING SELECTORS ===');
  
  const testSelectors = [
    '[data-testid*="product"]',
    '[data-automation-id*="product"]',
    '[class*="ProductTile"]',
    '[class*="product-tile"]',
    '[class*="ProductCard"]',
    '[class*="product-card"]',
    'article',
    'li[class*="product"]',
    'div[class*="product"]:has(button)'
  ];
  
  for (const sel of testSelectors) {
    try {
      const count = await page.$$eval(sel, els => els.length);
      console.log(`${sel}: ${count}`);
    } catch (e) {
      console.log(`${sel}: ERROR - ${e.message}`);
    }
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'heb-search-results.png' });
  console.log('\nScreenshot saved to heb-search-results.png');
  
  await browser.close();
  console.log('\nDone!');
})();
