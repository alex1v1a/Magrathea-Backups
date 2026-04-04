const { chromium } = require('playwright');

const CDP_URL = 'http://localhost:9222';

async function checkF150Listing() {
  console.log('🔍 Checking F-150 listing status...\n');
  
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to Facebook first (warm up session)
    console.log('Warming up session...');
    await page.goto('https://www.facebook.com/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    
    // Then go to Marketplace
    console.log('Navigating to Marketplace...');
    await page.goto('https://www.facebook.com/marketplace/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Check if we're logged in
    const url = page.url();
    if (url.includes('login')) {
      console.log('❌ Not logged into Facebook');
      await browser.close();
      return { error: 'Not logged in' };
    }
    
    console.log('✅ Logged in as alex@xspqr.com');
    
    // Look for F-150 listing
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check for F-150 mentions
    const f150Patterns = [/f-?150/i, /f150/i, /ford truck/i, /ford f/i];
    const thulePatterns = [/thule/i, /cargo box/i, /roof box/i];
    
    const hasF150 = f150Patterns.some(p => p.test(pageText));
    const hasThule = thulePatterns.some(p => p.test(pageText));
    
    console.log('\n📋 Listings Found:');
    console.log(`  F-150 Truck: ${hasF150 ? '✅ Found' : '❌ Not found'}`);
    console.log(`  Thule Box: ${hasThule ? '✅ Found' : '❌ Not found'}`);
    
    // Look for active listings count
    const listingMatches = pageText.match(/(\d+)\s+(?:active\s+)?listings?/i);
    if (listingMatches) {
      console.log(`  Active Listings: ${listingMatches[1]}`);
    }
    
    // Extract listing titles if possible
    const titles = await page.locator('[role="article"] h3, [role="article"] span[dir="auto"]').allTextContents();
    const relevantTitles = titles.filter(t => 
      /f-?150|f150|ford|truck|thule|cargo|roof/i.test(t)
    );
    
    if (relevantTitles.length > 0) {
      console.log('\n🚗 Relevant Listings:');
      relevantTitles.slice(0, 5).forEach(t => console.log(`  • ${t.substring(0, 80)}`));
    }
    
    await browser.close();
    
    return {
      loggedIn: true,
      f150Found: hasF150,
      thuleFound: hasThule,
      relevantListings: relevantTitles.length
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { error: error.message };
  }
}

checkF150Listing().then(result => {
  console.log('\n✅ Check complete');
  process.exit(0);
});
