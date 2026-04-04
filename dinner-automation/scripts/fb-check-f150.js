const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking F-150 listing status...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    let page = context.pages().find(p => p.url().includes('facebook.com'));
    
    if (!page) {
      page = await context.newPage();
    }
    
    // Go to Facebook main page first
    console.log('🌐 Checking Facebook...');
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const url = page.url();
    if (url.includes('login')) {
      console.log('❌ Not logged in to Facebook');
      await browser.close();
      return;
    }
    
    console.log('✅ Logged in\n');
    
    // Try to find Marketplace link and click it
    console.log('🔍 Opening Marketplace...');
    const marketplaceLink = await page.locator('a[href*="marketplace"]').first();
    if (await marketplaceLink.count() > 0) {
      await marketplaceLink.click();
      await page.waitForTimeout(3000);
    } else {
      await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }
    
    // Get page content
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check for F-150 or truck mentions
    const hasF150 = /f-150|f150|ford truck|ford f/i.test(pageText);
    const hasThule = /thule/i.test(pageText);
    
    console.log('📊 Results:');
    console.log('─────────────────────────────────────');
    console.log(`F-150 Detected: ${hasF150 ? '✅ YES' : '❌ No'}`);
    console.log(`Thule Detected: ${hasThule ? '✅ YES' : '❌ No'}`);
    console.log('─────────────────────────────────────\n');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'dinner-automation/data/fb-marketplace-status.png'
    });
    console.log('📸 Screenshot saved');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
