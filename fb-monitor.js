const { chromium } = require('playwright');

(async () => {
  // Use a different user data dir to avoid conflicts
  const userDataDir = 'C:\\Users\\Admin\\.openclaw\\fb-monitor-data';
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // First check if logged in by going to main Facebook page
    console.log('Checking Facebook login status...');
    await page.goto('https://www.facebook.com/', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check for login form
    const emailField = await page.$('input[name="email"], input[id="email"]');
    
    if (emailField) {
      console.log('Not logged in. Attempting to log in...');
      
      // Fill in credentials
      await page.fill('input[name="email"], input[id="email"]', 'alex@xspqr.com');
      await page.fill('input[name="pass"], input[id="pass"]', 'section9');
      
      // Click login
      await page.click('button[name="login"], [data-testid="royal_login_button"]');
      
      // Wait for navigation
      await page.waitForTimeout(10000);
      
      // Check if login succeeded
      const stillOnLogin = await page.$('input[name="email"]');
      if (stillOnLogin) {
        console.log('Login may have failed or requires 2FA. Check browser.');
        await page.screenshot({ path: 'fb_login_status.png' });
        console.log('Screenshot saved: fb_login_status.png');
        return;
      }
    }
    
    console.log('Logged in successfully!');
    
    // Now go to Marketplace selling page
    console.log('Navigating to Marketplace selling...');
    await page.goto('https://www.facebook.com/marketplace/you/selling', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'fb_marketplace_selling.png', fullPage: true });
    console.log('Screenshot saved: fb_marketplace_selling.png');
    
    // Get listing information
    const listings = await page.$$eval('a[href*="/marketplace/item/"]', links => 
      links.map(link => ({
        title: link.textContent?.trim() || '',
        href: link.href
      })).filter(item => item.title)
    );
    console.log('Found listings:', listings);
    
    // Check inbox
    console.log('Navigating to Marketplace inbox...');
    await page.goto('https://www.facebook.com/marketplace/inbox/', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'fb_marketplace_inbox.png', fullPage: true });
    console.log('Screenshot saved: fb_marketplace_inbox.png');
    
    // Get conversation previews
    const conversations = await page.$$eval('[role="button"] div[dir="auto"]', elements =>
      elements.map(el => el.textContent?.trim()).filter(Boolean)
    );
    console.log('Conversations found:', conversations.slice(0, 10));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'fb_error.png' });
    console.log('Error screenshot saved: fb_error.png');
  } finally {
    console.log('Done. Browser will remain open for 30 seconds...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
})();
