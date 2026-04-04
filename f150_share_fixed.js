const { chromium } = require('playwright-core');

// Get credentials from environment
const FB_EMAIL = process.env.FACEBOOK_EMAIL || 'alex@xspqr.com';
const FB_PASS = process.env.FACEBOOK_PASSWORD;
const LISTING_URL = 'https://www.facebook.com/marketplace/item/2269858303434147/';

if (!FB_PASS) {
  console.error('❌ FACEBOOK_PASSWORD environment variable not set');
  process.exit(1);
}

const GROUPS = [
  'HAYS COUNTY LIST & SELL',
  'Buda/Kyle Buy, Sell & Rent',
  'Ventas De Austin, Buda, Kyle'
];

const POST_TEXT = '2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!';

// Utility: Random delay
const randomDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

// Utility: Dismiss common popups
async function dismissPopups(page) {
  const popupSelectors = [
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    'button[aria-label*="cookie" i]',
    'button[aria-label*="accept" i]',
    'button:has-text("Allow")',
    'button:has-text("Not Now")',
    'button:has-text("Close")',
    'button:has-text("Dismiss")',
    '[role="dialog"] button:has-text("OK")',
    '[role="dialog"] button:has-text("Got it")',
    '[data-testid*="cookie" i]',
    '[data-testid*="consent" i]'
  ];
  
  for (const selector of popupSelectors) {
    try {
      const btn = await page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        console.log(`  Dismissed popup: ${selector}`);
        await randomDelay(1000, 2000);
      }
    } catch (e) {
      // Ignore
    }
  }
}

// Utility: Click with retry and popup dismissal
async function smartClick(page, selector, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await dismissPopups(page);
      const el = await page.locator(selector).first();
      await el.click({ timeout: 10000 });
      return true;
    } catch (e) {
      if (e.message.includes('intercept')) {
        console.log(`  Click intercepted, dismissing popups and retrying...`);
        await dismissPopups(page);
        await randomDelay(2000, 3000);
      } else {
        throw e;
      }
    }
  }
  return false;
}

(async () => {
  console.log('🚗 Facebook Marketplace — F-150 Group Sharing\n');
  console.log(`Target groups: ${GROUPS.join(', ')}\n`);
  
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:18800');
    console.log('✅ Connected to browser');
    
    let context = browser.contexts()[0];
    if (!context) context = await browser.newContext();
    
    let page = context.pages()[0];
    if (!page) page = await context.newPage();
    
    // Navigate to Facebook
    console.log('Navigating to Facebook...');
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle', timeout: 60000 });
    await dismissPopups(page);
    await randomDelay(3000, 5000);
    
    // Check login
    const isLoggedIn = await page.locator('[aria-label="Home"], [aria-label="Your profile"]').first().isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      console.log('🔑 Logging in...');
      await page.fill('input[name="email"], input#email', FB_EMAIL);
      await page.fill('input[name="pass"], input#pass', FB_PASS);
      await page.click('button[name="login"], button[data-testid="royal_login_button"]');
      await randomDelay(5000, 8000);
      await dismissPopups(page);
      console.log('✅ Logged in');
    } else {
      console.log('✅ Already logged in');
    }
    
    // Navigate to listing
    console.log('\nNavigating to F-150 listing...');
    await page.goto(LISTING_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await dismissPopups(page);
    await randomDelay(5000, 7000);
    
    await page.screenshot({ path: 'f150_listing_check.png' });
    console.log('📸 Screenshot saved: f150_listing_check.png');
    
    // Check if listing exists
    const listingExists = await page.locator('text=/F-150|F150|Ford/i').first().isVisible().catch(() => false);
    if (!listingExists) {
      console.log('⚠️ F-150 listing not detected — may be sold or URL changed');
      console.log('Continuing anyway...');
    } else {
      console.log('✅ F-150 listing found');
    }
    
    // Share to each group
    for (const groupName of GROUPS) {
      console.log(`\n📤 Sharing to: ${groupName}`);
      
      try {
        // Find and click share button
        const shareSelectors = [
          'text=/Share/i',
          'button[aria-label*="Share"]',
          '[role="button"]:has-text("Share")'
        ];
        
        let shareClicked = false;
        for (const selector of shareSelectors) {
          if (await smartClick(page, selector)) {
            shareClicked = true;
            break;
          }
        }
        
        if (!shareClicked) {
          console.log('  ❌ Share button not found');
          continue;
        }
        
        await randomDelay(3000, 5000);
        await dismissPopups(page);
        
        // Click "Share to a group"
        const groupShareSelectors = [
          'text=/Share to a group/i',
          'text=/Share in a group/i',
          '[role="menuitem"]:has-text("group")'
        ];
        
        let groupShareClicked = false;
        for (const selector of groupShareSelectors) {
          if (await smartClick(page, selector)) {
            groupShareClicked = true;
            break;
          }
        }
        
        if (!groupShareClicked) {
          console.log('  ❌ Share to group option not found');
          continue;
        }
        
        await randomDelay(3000, 5000);
        await dismissPopups(page);
        
        // Search for group
        const searchBox = await page.locator('input[placeholder*="Search"], input[aria-label*="Search"]').first();
        if (searchBox) {
          await searchBox.fill(groupName);
          await randomDelay(2000, 3000);
        }
        
        // Click group
        const groupSelectors = [
          `text="${groupName}"`,
          `[role="listitem"]:has-text("${groupName.split(' ')[0]}")`,
          '[role="option"]'
        ];
        
        let groupSelected = false;
        for (const selector of groupSelectors) {
          try {
            const group = await page.locator(selector).first();
            if (await group.isVisible({ timeout: 2000 }).catch(() => false)) {
              await group.click();
              groupSelected = true;
              console.log(`  ✅ Selected group`);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        if (!groupSelected) {
          console.log('  ❌ Group not found');
          continue;
        }
        
        await randomDelay(2000, 3000);
        
        // Add post text
        const textSelectors = [
          'textarea',
          'div[contenteditable="true"]',
          '[role="textbox"]'
        ];
        
        for (const selector of textSelectors) {
          const textArea = await page.locator(selector).first();
          if (await textArea.isVisible().catch(() => false)) {
            await textArea.fill(POST_TEXT);
            console.log('  📝 Post text added');
            break;
          }
        }
        
        await randomDelay(2000, 3000);
        
        // Click Post
        const postSelectors = [
          'button:has-text("Post")',
          'button:has-text("Share")',
          '[aria-label="Post"]'
        ];
        
        for (const selector of postSelectors) {
          const btn = await page.locator(selector).first();
          if (await btn.isVisible().catch(() => false)) {
            await btn.click();
            console.log(`  ✅ Posted to ${groupName}`);
            break;
          }
        }
        
        await randomDelay(5000, 7000);
        await dismissPopups(page);
        
      } catch (e) {
        console.log(`  ❌ Error sharing to ${groupName}: ${e.message}`);
      }
    }
    
    console.log('\n✅ Sharing complete');
    await browser.close();
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();
