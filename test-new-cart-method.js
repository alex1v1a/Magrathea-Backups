const { chromium } = require('playwright');

const CDP_URL = 'http://localhost:9222';

// NEW: Get cart count from localStorage
async function getCartCountFromStorage(page) {
  try {
    const cartData = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    });
    
    if (!cartData) return 0;
    
    // Count items by splitting ProductNames
    if (cartData.ProductNames) {
      const items = cartData.ProductNames.split('<SEP>').filter(n => n.trim());
      return items.length;
    }
    
    // Alternative: check Products array
    if (cartData.Products) {
      return cartData.Products.length;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

async function addToCartWithNewVerification(itemName) {
  console.log(`\n🛒 Adding: ${itemName}`);
  
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Search for item
    await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(itemName)}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);
    
    // Get initial cart count from localStorage
    const initialCount = await getCartCountFromStorage(page);
    console.log(`  Initial cart count: ${initialCount}`);
    
    // Find and click Add to Cart button
    const buttons = await page.locator('button[data-qe-id="addToCart"]').all();
    if (buttons.length === 0) {
      console.log('  ❌ No Add to Cart button found');
      await browser.close();
      return false;
    }
    
    // Click first visible button
    for (const btn of buttons) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        console.log('  ✅ Clicked Add to Cart');
        break;
      }
    }
    
    // Wait for cart update
    await page.waitForTimeout(3000);
    
    // Get new cart count from localStorage
    const newCount = await getCartCountFromStorage(page);
    console.log(`  New cart count: ${newCount}`);
    
    const success = newCount > initialCount;
    console.log(`  ${success ? '✅ SUCCESS' : '❌ FAILED'} - Cart ${success ? 'increased' : 'did not increase'}`);
    
    await browser.close();
    return success;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Test with a few items
async function testNewMethod() {
  console.log('🧪 Testing NEW cart verification method\n');
  
  const items = [
    'cod fillets',
    'ribeye steak',
    'white fish for tacos'
  ];
  
  for (const item of items) {
    await addToCartWithNewVerification(item);
    await new Promise(r => setTimeout(r, 2000)); // Delay between items
  }
  
  console.log('\n✅ Test complete');
}

testNewMethod();
