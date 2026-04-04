const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const FB_EMAIL = 'alex@xspqr.com';
const FB_PASSWORD = 'section9';
const LISTING_URL = 'https://www.facebook.com/marketplace/item/2269858303434147/';

// Groups to rotate through
const GROUPS = [
  'HAYS COUNTY LIST & SELL',
  'Austin Buy Sell Trade',
  'Austin Cars & Trucks - For Sale',
  'Buda Buy & Sell',
  'Kyle Buy Sell Trade',
  'San Marcos Buy Sell Trade',
  'South Austin Buy Sell Trade'
];

const POST_TEXT = '2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!';

// State file to track which group was last used
const STATE_FILE = path.join(__dirname, 'fb-share-state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('No previous state found');
  }
  return { lastGroupIndex: -1 };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getNextGroup() {
  const state = loadState();
  const nextIndex = (state.lastGroupIndex + 1) % GROUPS.length;
  return { group: GROUPS[nextIndex], index: nextIndex };
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting Facebook Marketplace sharing automation...');
  
  // Create a temporary user data directory
  const userDataDir = path.join(os.tmpdir(), 'fb-automation-' + Date.now());
  fs.mkdirSync(userDataDir, { recursive: true });
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to Facebook login
    console.log('Navigating to Facebook login...');
    await page.goto('https://facebook.com/login', { waitUntil: 'networkidle' });
    await delay(2000);
    
    // Login
    console.log('Logging in...');
    await page.fill('input[name="email"]', FB_EMAIL);
    await page.fill('input[name="pass"]', FB_PASSWORD);
    await page.click('button[name="login"], [data-testid="royal_login_button"]');
    
    // Wait for navigation after login
    await page.waitForLoadState('networkidle');
    await delay(5000);
    
    console.log('Logged in successfully');
    await page.screenshot({ path: 'fb-logged-in.png' });
    
    // Navigate to the listing
    console.log('Navigating to F-150 listing...');
    await page.goto(LISTING_URL, { waitUntil: 'networkidle' });
    await delay(5000);
    
    await page.screenshot({ path: 'listing-page.png' });
    console.log('Screenshot saved: listing-page.png');
    
    // Get next group to share to
    const { group, index } = getNextGroup();
    console.log(`Will share to group: ${group}`);
    
    // Look for and click share button - try multiple selectors
    console.log('Looking for share button...');
    
    // Try different share button selectors
    const shareSelectors = [
      'text=Share',
      '[aria-label*="Share" i]',
      '[role="button"]:has-text("Share")',
      'div[role="button"]:has-text("Share")'
    ];
    
    let shareClicked = false;
    for (const selector of shareSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found share button with selector: ${selector}`);
          await element.click();
          shareClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} failed: ${e.message}`);
      }
    }
    
    if (!shareClicked) {
      throw new Error('Could not find share button');
    }
    
    await delay(3000);
    await page.screenshot({ path: 'share-menu.png' });
    
    // Look for "Share to a group" option
    console.log('Looking for "Share to a group" option...');
    
    const groupSelectors = [
      'text=Share to a group',
      'text=Group',
      '[role="menuitem"]:has-text("Group")',
      'div[role="button"]:has-text("Group")'
    ];
    
    let groupClicked = false;
    for (const selector of groupSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found group option with selector: ${selector}`);
          await element.click();
          groupClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} failed: ${e.message}`);
      }
    }
    
    if (!groupClicked) {
      throw new Error('Could not find group share option');
    }
    
    await delay(3000);
    await page.screenshot({ path: 'group-select.png' });
    
    // Search for the group
    console.log(`Searching for group: ${group}`);
    const searchBox = await page.$('[placeholder*="Search"], input[type="text"], [role="combobox"]');
    if (searchBox) {
      await searchBox.fill(group);
      await delay(3000);
    }
    
    // Select the group
    console.log('Selecting group...');
    await page.click(`text=${group}`);
    await delay(3000);
    
    // Add post text
    console.log('Adding post text...');
    const textArea = await page.$('[role="textbox"], textarea, [contenteditable="true"]');
    if (textArea) {
      await textArea.fill(POST_TEXT);
    }
    await delay(2000);
    
    // Click post button
    console.log('Clicking post button...');
    const postSelectors = [
      'text=Post',
      'button:has-text("Post")',
      '[aria-label*="Post" i]',
      '[role="button"]:has-text("Post")'
    ];
    
    let postClicked = false;
    for (const selector of postSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found post button with selector: ${selector}`);
          await element.click();
          postClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} failed: ${e.message}`);
      }
    }
    
    if (!postClicked) {
      throw new Error('Could not find post button');
    }
    
    console.log('Post submitted!');
    
    // Save state
    saveState({ lastGroupIndex: index });
    console.log(`State saved. Last used group index: ${index}`);
    
    // Wait for confirmation
    await delay(5000);
    await page.screenshot({ path: 'share-confirmation.png' });
    console.log('Confirmation screenshot saved: share-confirmation.png');
    console.log(`\n✅ Successfully shared to: ${group}`);
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
    throw error;
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
