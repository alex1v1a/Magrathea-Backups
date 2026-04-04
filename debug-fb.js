const { chromium } = require('playwright');

async function debugFacebook() {
  console.log('🔌 Connecting to Marvin Chrome on port 9224...');
  
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
    console.log('✅ Connected');
    
    const context = browser.contexts()[0];
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }
    
    // Navigate to Facebook
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'fb-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: fb-debug.png');
    
    // Check for login elements
    const content = await page.content();
    const hasLogin = content.includes('Log In') && content.includes('Password');
    const hasNewsFeed = content.includes('News Feed');
    const hasLogout = content.includes('Log Out');
    const hasMarketplace = content.includes('Marketplace');
    
    console.log('Login page detected:', hasLogin);
    console.log('News Feed detected:', hasNewsFeed);
    console.log('Log Out detected:', hasLogout);
    console.log('Marketplace link detected:', hasMarketplace);
    
    // Try to find the actual page title
    const title = await page.title();
    console.log('Page title:', title);
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFacebook();
