const { chromium } = require('playwright');

async function checkFacebook() {
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9224');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    console.log('Navigating to Facebook...');
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const url = page.url();
    console.log('Current URL:', url);
    
    // Check if we're on login page
    const isLoginPage = await page.locator('input[name="email"]').count() > 0 ||
                        await page.locator('input[type="email"]').count() > 0 ||
                        url.includes('login');
    
    if (isLoginPage) {
      console.log('⚠️ NOT LOGGED IN - Facebook login page detected');
    } else {
      console.log('✅ Logged in to Facebook');
      
      // Try to navigate to Marketplace inbox
      console.log('Checking Marketplace...');
      await page.goto('https://www.facebook.com/marketplace/inbox', { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const inboxUrl = page.url();
      console.log('Marketplace URL:', inboxUrl);
      
      if (inboxUrl.includes('inbox')) {
        // Count conversations
        const conversations = await page.locator('div[role="listitem"]').count();
        console.log(`📨 Found ${conversations} conversations`);
        
        // Check for F-150 messages
        const content = await page.content();
        const hasTruck = content.toLowerCase().includes('f-150') || content.toLowerCase().includes('truck') || content.toLowerCase().includes('thule');
        console.log(hasTruck ? '🚨 F-150/Thule related messages found!' : '✅ No F-150/Thule messages detected');
      }
    }
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkFacebook();
