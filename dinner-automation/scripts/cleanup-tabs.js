/**
 * Tab Cleanup Utility
 * Closes all HEB and excess Facebook tabs
 */
const { chromium } = require('playwright');

async function cleanupTabs() {
  console.log('🧹 Tab Cleanup Utility\n');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (e) {
    console.log('❌ Edge not running on port 9222');
    return;
  }
  
  const context = browser.contexts()[0];
  const pages = context.pages();
  
  console.log(`Found ${pages.length} open tabs:\n`);
  
  let closed = 0;
  let kept = 0;
  
  for (const page of pages) {
    const url = page.url();
    
    // Close HEB tabs (keep one if it's the cart)
    if (url.includes('heb.com')) {
      if (url.includes('/cart') && kept === 0) {
        console.log(`  ✅ Keeping: ${url.substring(0, 60)}`);
        kept++;
      } else {
        console.log(`  🗑️  Closing: ${url.substring(0, 60)}`);
        await page.close();
        closed++;
      }
    }
    // Keep Facebook tabs (could be active session)
    else if (url.includes('facebook.com')) {
      console.log(`  ✅ Keeping: Facebook tab`);
    }
    // Close other tabs
    else if (url !== 'about:blank') {
      console.log(`  🗑️  Closing: ${url.substring(0, 60)}`);
      await page.close();
      closed++;
    }
  }
  
  console.log(`\n═══════════════════════════════════`);
  console.log(`Closed: ${closed} tabs`);
  console.log(`Kept: ${pages.length - closed} tabs`);
  console.log(`═══════════════════════════════════`);
  
  await browser.close();
}

cleanupTabs().catch(console.error);
