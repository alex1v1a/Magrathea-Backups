const { chromium } = require('playwright');

async function addNaanOnly() {
  console.log('🫓 Adding naan bread to HEB cart...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Get initial cart count
    await page.goto('https://www.heb.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const initialCount = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return 0;
        const data = JSON.parse(raw);
        return data.ProductNames ? data.ProductNames.split('<SEP>').filter(n => n.trim()).length : 0;
      } catch (e) { return 0; }
    });
    
    console.log(`Initial cart count: ${initialCount}`);
    
    // Search for naan with different terms
    const searchTerms = ['naan bread', 'naan', 'organic naan', 'garlic naan'];
    
    for (const term of searchTerms) {
      console.log(`\nTrying search: "${term}"`);
      
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`, { 
        waitUntil: 'domcontentloaded' 
      });
      await page.waitForTimeout(4000);
      
      // Look for add to cart buttons
      const buttons = await page.locator('button[data-qe-id="addToCart"]').all();
      console.log(`Found ${buttons.length} Add to Cart buttons`);
      
      if (buttons.length > 0) {
        // Get product names
        const products = await page.locator('[data-testid="product-card"], .product-card').all();
        console.log(`Found ${products.length} product cards`);
        
        // Click the first button
        const firstButton = buttons[0];
        const isVisible = await firstButton.isVisible().catch(() => false);
        
        if (isVisible) {
          console.log('Clicking first Add to Cart button...');
          await firstButton.click();
          await page.waitForTimeout(5000);
          
          // Check if cart increased
          const newCount = await page.evaluate(() => {
            try {
              const raw = localStorage.getItem('PurchaseCart');
              if (!raw) return 0;
              const data = JSON.parse(raw);
              return data.ProductNames ? data.ProductNames.split('<SEP>').filter(n => n.trim()).length : 0;
            } catch (e) { return 0; }
          });
          
          console.log(`New cart count: ${newCount}`);
          
          if (newCount > initialCount) {
            console.log('✅ SUCCESS! Naan bread added to cart');
            await browser.close();
            return;
          } else {
            console.log('❌ Cart did not increase');
          }
        }
      }
    }
    
    console.log('\n⚠️ Could not add naan bread after trying multiple search terms');
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addNaanOnly();
