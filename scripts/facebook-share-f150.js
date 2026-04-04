const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Launching browser with openclaw profile...');
    
    const browser = await chromium.launchPersistentContext(
      'C:\\Users\\Admin\\.openclaw\\browser\\openclaw\\user-data',
      {
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        viewport: { width: 1280, height: 720 }
      }
    );
    
    const page = await browser.newPage();
    
    // Navigate to Facebook login
    console.log('Navigating to Facebook...');
    await page.goto('https://facebook.com/login', { waitUntil: 'networkidle' });
    
    // Check if already logged in by looking for the feed or profile element
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // If on login page, log in
    if (currentUrl.includes('login')) {
      console.log('Need to log in...');
      
      // Fill in login credentials
      await page.fill('input[name="email"]', 'alex@xspqr.com');
      await page.fill('input[name="pass"]', 'section9');
      
      // Click login button
      await page.click('button[name="login"]');
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      console.log('Logged in, current URL:', page.url());
    } else {
      console.log('Already logged in');
    }
    
    // Navigate to the F-150 listing
    console.log('Navigating to F-150 listing...');
    await page.goto('https://www.facebook.com/marketplace/item/2269858303434147/', { waitUntil: 'networkidle' });
    
    console.log('On listing page, URL:', page.url());
    
    // Wait for the page to load and take a screenshot to debug
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'f150_listing.png' });
    console.log('Screenshot saved to f150_listing.png');
    
    // Look for share button
    const shareButton = await page.$('text=Share');
    if (shareButton) {
      console.log('Found share button, clicking...');
      await shareButton.click();
      
      // Wait for share dialog
      await page.waitForTimeout(2000);
      
      // Look for "Share to a group" option
      const shareToGroup = await page.$('text=Share to a group');
      if (shareToGroup) {
        await shareToGroup.click();
        await page.waitForTimeout(2000);
        
        // List of groups to choose from
        const groups = [
          'HAYS COUNTY LIST & SELL',
          'Austin Buy Sell Trade',
          'Austin Cars & Trucks - For Sale',
          'Buda Buy & Sell',
          'Kyle Buy Sell Trade',
          'San Marcos Buy Sell Trade',
          'South Austin Buy Sell Trade'
        ];
        
        // For now, let's try to find the first available group
        let groupFound = false;
        for (const group of groups) {
          const groupElement = await page.$(`text=${group}`);
          if (groupElement) {
            console.log(`Found group: ${group}`);
            await groupElement.click();
            await page.waitForTimeout(2000);
            
            // Add the share text
            const textArea = await page.$('textarea[placeholder*="Say something"], textarea[placeholder*="Write"], [role="textbox"]');
            if (textArea) {
              await textArea.fill('2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!');
            }
            
            // Click post/share button
            const postButton = await page.$('button:has-text("Post"), button:has-text("Share")');
            if (postButton) {
              await postButton.click();
              console.log(`Posted to group: ${group}`);
              groupFound = true;
              break;
            }
          }
        }
        
        if (!groupFound) {
          console.log('Could not find any of the specified groups');
        }
      } else {
        console.log('Could not find "Share to a group" option');
      }
    } else {
      console.log('Could not find share button');
    }
    
    // Wait a bit before closing
    await page.waitForTimeout(5000);
    await browser.close();
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
