const { chromium } = require('playwright');

/**
 * Connect to existing Chrome via CDP (no extension needed)
 * Usage: node connect-to-chrome.js
 */

async function connectToChrome() {
  try {
    // Connect to Chrome running on debug port 9224
    const browser = await chromium.connectOverCDP('http://localhost:9224');
    console.log('✅ Connected to Chrome via CDP');
    
    // Get contexts/pages
    const contexts = browser.contexts();
    console.log(`📑 Found ${contexts.length} browser contexts`);
    
    for (let i = 0; i < contexts.length; i++) {
      const pages = contexts[i].pages();
      console.log(`  Context ${i}: ${pages.length} pages`);
      
      for (const page of pages) {
        const url = await page.url();
        const title = await page.title().catch(() => 'N/A');
        console.log(`    - ${title}: ${url.substring(0, 80)}...`);
      }
    }
    
    // Create new page if needed
    const context = contexts[0] || await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://facebook.com');
    console.log('🌐 Navigated to Facebook');
    
    // Keep browser connected
    return { browser, page };
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  connectToChrome().then(({ browser }) => {
    console.log('Browser automation ready. Press Ctrl+C to disconnect.');
    
    // Keep alive
    setInterval(() => {}, 1000);
    
    process.on('SIGINT', async () => {
      console.log('\nDisconnecting...');
      await browser.close();
      process.exit(0);
    });
  });
}

module.exports = { connectToChrome };
