const { chromium } = require('playwright');

const CDP_URL = 'http://localhost:9222';
const TARGET_ITEMS = 42;

async function clearHEBCart() {
  console.log('🛒 HEB Cart Clear & Rebuild\n');
  
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to cart page
    console.log('Opening HEB cart...');
    await page.goto('https://www.heb.com/cart', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    
    // Check current cart count
    const cartLabel = await page.locator('a[data-testid="cart-link"]').getAttribute('aria-label').catch(() => '');
    const match = cartLabel.match(/(\d+)\s+items?/);
    const currentCount = match ? parseInt(match[1]) : 0;
    
    console.log(`Current cart: ${currentCount} items`);
    
    if (currentCount === 0) {
      console.log('Cart is already empty. No action needed.');
      await browser.close();
      return { cleared: 0, newCount: 0 };
    }
    
    // Clear cart
    console.log('\n🗑️  Clearing cart...');
    let removed = 0;
    
    while (true) {
      // Look for remove buttons
      const removeButtons = await page.locator('button[data-qe-id="removeFromCart"], button[aria-label*="Remove"], button:has-text("Remove")').all();
      
      if (removeButtons.length === 0) {
        // Try alternative selectors
        const altButtons = await page.locator('button:has-text("Remove"), [data-testid*="remove"]').all();
        if (altButtons.length === 0) break;
      }
      
      for (const btn of removeButtons.slice(0, 5)) { // Remove 5 at a time
        try {
          await btn.click({ timeout: 3000 });
          removed++;
          await page.waitForTimeout(500);
        } catch (e) {
          // Continue to next
        }
      }
      
      // Refresh page to see updated cart
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Check if cart is empty
      const newLabel = await page.locator('a[data-testid="cart-link"]').getAttribute('aria-label').catch(() => '');
      const newMatch = newLabel.match(/(\d+)\s+items?/);
      const newCount = newMatch ? parseInt(newMatch[1]) : 0;
      
      if (newCount === 0) break;
      
      console.log(`  Progress: ${removed} items removed, ${newCount} remaining...`);
    }
    
    console.log(`\n✅ Cart cleared! Removed ${removed} items.`);
    
    await browser.close();
    return { cleared: removed, newCount: 0 };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { error: error.message };
  }
}

clearHEBCart().then(result => {
  console.log('\n🎉 Cart clear complete');
  console.log('Run heb-add-cart.js to rebuild with correct items.');
  process.exit(0);
});
