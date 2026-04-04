const { chromium } = require('playwright');

async function listCartItems() {
  console.log('🛒 Listing current HEB cart items...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    
    // Get cart items from localStorage
    const cartData = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    });
    
    if (cartData && cartData.ProductNames) {
      const items = cartData.ProductNames.split('<SEP>').filter(n => n.trim());
      console.log(`Found ${items.length} items in cart:\n`);
      
      items.forEach((item, i) => {
        // Extract product name from the long description
        const match = item.match(/Item,\s*([^,]+)/);
        const name = match ? match[1] : item;
        console.log(`${i + 1}. ${name.substring(0, 60)}...`);
      });
      
      // Check for rice or naan
      console.log('\n--- Checking for rice/naan ---');
      const hasRice = items.some(i => i.toLowerCase().includes('rice'));
      const hasNaan = items.some(i => i.toLowerCase().includes('naan'));
      console.log(`Has rice item: ${hasRice ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Has naan item: ${hasNaan ? 'YES ✅' : 'NO ❌'}`);
      
    } else {
      console.log('No cart data found');
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listCartItems();
