const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking F-150 listing status on Facebook Marketplace...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    let page = context.pages().find(p => p.url().includes('facebook.com'));
    
    if (!page) {
      page = await context.newPage();
    }
    
    // Go to Facebook Marketplace
    console.log('🌐 Navigating to Facebook Marketplace...');
    await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if logged in
    const url = page.url();
    if (url.includes('login')) {
      console.log('❌ Not logged in to Facebook');
      await browser.close();
      return;
    }
    
    console.log('✅ Logged in to Facebook\n');
    
    // Look for "Your Listings" link or navigate to it
    console.log('🔍 Looking for Your Listings...');
    await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check page content for listings
    const content = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check for F-150 or truck mentions
    const hasF150 = /f-150|f150|ford truck/i.test(pageText);
    const hasThule = /thule/i.test(pageText);
    const noListings = /no listings|you don't have any listings/i.test(pageText.toLowerCase());
    
    console.log('📊 Results:');
    console.log('─────────────────────────────────────');
    console.log(`F-150 Mentioned: ${hasF150 ? '✅ YES' : '❌ No'}`);
    console.log(`Thule Mentioned: ${hasThule ? '✅ YES' : '❌ No'}`);
    console.log(`No Listings Msg: ${noListings ? '⚠️ YES' : '❌ No'}`);
    console.log('─────────────────────────────────────\n');
    
    // Get listing titles if any
    const listings = await page.evaluate(() => {
      const items = [];
      const selectors = [
        '[data-testid="marketplace_listing_title"]',
        '[class*="listingTitle"]',
        '[class*="title"]',
        'h3', 'h4', 'h5'
      ];
      
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 5 && text.length < 100) {
            items.push(text);
          }
        });
      }
      return [...new Set(items)].slice(0, 10); // Unique, first 10
    });
    
    if (listings.length > 0) {
      console.log('📦 Active Listings Found:');
      listings.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item}`);
      });
    } else {
      console.log('⚠️ No active listings detected');
    }
    
    // Screenshot for verification
    await page.screenshot({ 
      path: 'dinner-automation/data/fb-marketplace-check.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: dinner-automation/data/fb-marketplace-check.png');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
