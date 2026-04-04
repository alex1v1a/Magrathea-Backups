const { chromium } = require('playwright');

const itemsToAdd = [
  { name: 'H-E-B Basmati Rice', search: 'H-E-B Basmati Rice' },
  { name: 'Stonefire Naan', search: 'Stonefire Naan' }
];

async function completeCart() {
  console.log('🛒 Completing HEB Cart - Adding Missing Items\n');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 60000 });
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Check initial cart
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const initialCount = await page.evaluate(() => {
      const cartLink = document.querySelector('a[data-testid="cart-link"]');
      if (cartLink) {
        const match = cartLink.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });
    
    console.log(`📊 Initial cart: ${initialCount} items\n`);
    
    // Add each missing item
    for (const item of itemsToAdd) {
      console.log(`🌾 Adding: ${item.name}`);
      
      // Search for item
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`, { timeout: 60000 });
      await page.waitForTimeout(4000);
      
      // Find and click add button
      const addButton = await page.$('button[data-qe-id="addToCart"]');
      if (addButton) {
        const isDisabled = await addButton.evaluate(el => el.disabled);
        if (!isDisabled) {
          await addButton.click();
          console.log('  ✅ Clicked ADD TO CART');
          await page.waitForTimeout(3000);
        } else {
          console.log('  ⚠️ Button disabled (out of stock?)');
        }
      } else {
        console.log('  ❌ No add button found');
      }
    }
    
    // Final verification
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const finalCount = await page.evaluate(() => {
      const cartLink = document.querySelector('a[data-testid="cart-link"]');
      if (cartLink) {
        const match = cartLink.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });
    
    console.log(`\n📊 Final cart: ${finalCount} items`);
    console.log(`📈 Added: ${finalCount - initialCount} items`);
    console.log(`🎯 Target: 42 items`);
    console.log(`📋 Missing: ${42 - finalCount} items`);
    
    // Take final screenshot
    await page.screenshot({ path: 'heb-cart-final.png', fullPage: true });
    console.log('\n📸 Final screenshot: heb-cart-final.png');
    
    await page.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
    console.log('\n✅ Done');
  }
}

completeCart();
