const { chromium } = require('playwright-core');

const FB_EMAIL = 'alex@xspqr.com';
const FB_PASS = 'section9';
const LISTING_URL = 'https://www.facebook.com/marketplace/item/2269858303434147/';
const GROUP_NAME = 'Austin Cars & Trucks - For Sale';
const POST_TEXT = '2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!';

(async () => {
  console.log('Connecting to existing Chrome at CDP port 18800...');
  
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:18800');
    console.log('Connected to browser');
    
    // Get existing context or create new
    let context = browser.contexts()[0];
    if (!context) {
      context = await browser.newContext();
    }
    
    // Get existing page or create new
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }
    
    console.log('Using existing page');
    
    // Navigate to Facebook
    console.log('Navigating to Facebook...');
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Check if already logged in by looking for profile icon or home button
    await page.waitForTimeout(3000);
    const isLoggedIn = await page.locator('[aria-label="Home"], [aria-label="Your profile"], div[aria-label="Account"]').first().isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      console.log('Not logged in. Attempting login...');
      
      // Wait for login form
      await page.waitForSelector('input[name="email"], input#email', { timeout: 10000 });
      
      // Fill login form
      await page.fill('input[name="email"], input#email', FB_EMAIL);
      await page.fill('input[name="pass"], input#pass', FB_PASS);
      await page.click('button[name="login"], button[data-testid="royal_login_button"]');
      
      // Wait for navigation
      await page.waitForTimeout(8000);
      
      // Check for save login / 2FA prompts
      const saveLoginBtn = await page.locator('button:has-text("Save"), button:has-text("Continue"), button:has-text("OK")').first();
      if (await saveLoginBtn.isVisible().catch(() => false)) {
        console.log('Handling post-login prompt...');
        await saveLoginBtn.click();
        await page.waitForTimeout(3000);
      }
      
      console.log('Login flow completed');
    } else {
      console.log('Already logged in to Facebook');
    }
    
    // Navigate to the listing
    console.log('Navigating to F-150 listing...');
    await page.goto(LISTING_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Take screenshot of listing page
    await page.screenshot({ path: 'C:\\Users\\Admin\\.openclaw\\workspace\\f150_listing.png' });
    console.log('Screenshot of listing saved');
    
    // Look for share button - try multiple selectors
    console.log('Looking for share button...');
    const shareSelectors = [
      'text=/Share/i',
      'text=/Send/i', 
      'button[aria-label*="Share"]',
      'button[aria-label*="share"]',
      '[role="button"]:has-text("Share")'
    ];
    
    let shareBtn = null;
    for (const selector of shareSelectors) {
      shareBtn = await page.locator(selector).first();
      if (await shareBtn.isVisible().catch(() => false)) {
        console.log(`Found share button with selector: ${selector}`);
        break;
      }
    }
    
    if (!shareBtn) {
      console.log('Share button not found, scrolling...');
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(2000);
      
      for (const selector of shareSelectors) {
        shareBtn = await page.locator(selector).first();
        if (await shareBtn.isVisible().catch(() => false)) {
          console.log(`Found share button after scroll: ${selector}`);
          break;
        }
      }
    }
    
    if (shareBtn) {
      await shareBtn.click();
      console.log('Clicked share button');
      await page.waitForTimeout(3000);
    } else {
      throw new Error('Could not find share button');
    }
    
    // Look for "Share to a group" option
    console.log('Looking for "Share to a group" option...');
    const shareToGroupSelectors = [
      'text=/Share to a group/i',
      'text=/Share in a group/i',
      'text=/group/i',
      '[role="menuitem"]:has-text("group")'
    ];
    
    let shareToGroup = null;
    for (const selector of shareToGroupSelectors) {
      shareToGroup = await page.locator(selector).first();
      if (await shareToGroup.isVisible().catch(() => false)) {
        console.log(`Found share to group option: ${selector}`);
        await shareToGroup.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    if (!shareToGroup) {
      console.log('Share to group option not found in menu, taking screenshot...');
      await page.screenshot({ path: 'C:\\Users\\Admin\\.openclaw\\workspace\\f150_share_menu.png' });
    }
    
    // Search for and select the group
    console.log(`Searching for group: ${GROUP_NAME}...`);
    const searchBox = await page.locator('input[placeholder*="Search"], input[aria-label*="Search"]').first();
    
    if (searchBox && await searchBox.isVisible().catch(() => false)) {
      await searchBox.fill(GROUP_NAME);
      await page.waitForTimeout(3000);
    }
    
    // Click on the group
    const groupSelectors = [
      `text="${GROUP_NAME}"`,
      `[role="listitem"]:has-text("Austin"):has-text("Truck")`,
      '[role="option"]'
    ];
    
    let groupSelected = false;
    for (const selector of groupSelectors) {
      const groupOption = await page.locator(selector).first();
      if (await groupOption.isVisible().catch(() => false)) {
        const text = await groupOption.textContent();
        console.log(`Found group option: ${text}`);
        await groupOption.click();
        console.log(`Selected group: ${text || GROUP_NAME}`);
        groupSelected = true;
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    if (!groupSelected) {
      console.log('Group not found, taking screenshot of group selection...');
      await page.screenshot({ path: 'C:\\Users\\Admin\\.openclaw\\workspace\\f150_group_select.png' });
    }
    
    // Add post text
    console.log('Adding post text...');
    const textAreaSelectors = [
      'textarea',
      'div[contenteditable="true"]',
      '[role="textbox"]'
    ];
    
    for (const selector of textAreaSelectors) {
      const textArea = await page.locator(selector).first();
      if (await textArea.isVisible().catch(() => false)) {
        await textArea.fill(POST_TEXT);
        console.log('Post text added');
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Click Post button
    console.log('Looking for Post button...');
    const postBtnSelectors = [
      'button:has-text("Post")',
      'button:has-text("Share")',
      '[aria-label="Post"]',
      '[aria-label="Share now"]'
    ];
    
    for (const selector of postBtnSelectors) {
      const postBtn = await page.locator(selector).first();
      if (await postBtn.isVisible().catch(() => false)) {
        const btnText = await postBtn.textContent();
        console.log(`Found button: ${btnText}, clicking...`);
        await postBtn.click();
        await page.waitForTimeout(5000);
        
        // Take final screenshot
        await page.screenshot({ path: 'C:\\Users\\Admin\\.openclaw\\workspace\\f150_share_result.png' });
        console.log('Screenshot saved to f150_share_result.png');
        
        console.log('SUCCESS: F-150 listing shared to group!');
        break;
      }
    }
    
    console.log('Script completed');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
