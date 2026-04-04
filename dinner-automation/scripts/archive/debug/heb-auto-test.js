/**
 * HEB Cart Auto-Add - Non-interactive version
 * Uses existing Chrome with user already logged in
 */

const { chromium } = require('playwright');

async function autoAddItems(items) {
  console.log('🛒 HEB Auto-Add Starting...');
  console.log(`Items: ${items.length}`);
  
  const results = { added: [], failed: [] };
  
  try {
    // Connect to shared Chrome
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext();
    
    // Find or create HEB page
    let page = context.pages().find(p => p.url().includes('heb.com'));
    if (!page) {
      page = await context.newPage();
      await page.goto('https://www.heb.com');
      await page.waitForTimeout(3000);
    }
    
    console.log(`📍 Page: ${page.url()}`);
    
    // Process items
    for (const item of items) {
      const term = item.searchTerm || item.name;
      console.log(`\n📦 Adding: ${item.name} (${term})`);
      
      try {
        // Search
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Try to click first product's add button
        // Multiple strategies
        const strategies = [
          'button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])',
          'button[data-testid*="add-to-cart"]',
          'button:has-text("Add to cart")'
        ];
        
        let clicked = false;
        for (const selector of strategies) {
          try {
            const btn = page.locator(selector).first();
            if (await btn.count() > 0) {
              await btn.scrollIntoViewIfNeeded();
              await btn.click({ delay: 100, force: true });
              await btn.evaluate(el => el.style.outline = '4px solid lime');
              console.log('  ✅ Clicked!');
              clicked = true;
              results.added.push(item);
              break;
            }
          } catch (e) {}
        }
        
        if (!clicked) {
          throw new Error('No add button found');
        }
        
        await page.waitForTimeout(3000);
        
      } catch (err) {
        console.log(`  ❌ Failed: ${err.message}`);
        results.failed.push({ item: item.name, error: err.message });
      }
    }
    
    await browser.disconnect();
    
    console.log('\n✅ Complete!');
    console.log(`Added: ${results.added.length}/${items.length}`);
    console.log(`Failed: ${results.failed.length}/${items.length}`);
    
    return results;
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  }
}

// Run with test items
const items = [
  { name: 'Milk', searchTerm: 'whole milk' },
  { name: 'Eggs', searchTerm: 'large eggs' },
  { name: 'Bread', searchTerm: 'white bread' }
];

autoAddItems(items);
