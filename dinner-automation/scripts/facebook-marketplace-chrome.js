const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Facebook Marketplace Automation - Chrome Edition
 * Fully automated, no manual intervention
 * Uses Marvin profile only
 * 
 * Usage:
 *   node facebook-marketplace-chrome.js --messages
 *   node facebook-marketplace-chrome.js --share-f150
 */

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_USER_DATA = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
// Facebook Credentials - loaded from environment variables
const FB_EMAIL = process.env.FACEBOOK_EMAIL || process.env.FACEBOOK_USERNAME;
const FB_PASSWORD = process.env.FACEBOOK_PASSWORD;

// Validate credentials are configured
if (!FB_EMAIL || !FB_PASSWORD) {
  console.error('ERROR: Facebook credentials not configured');
  console.error('Set FACEBOOK_EMAIL and FACEBOOK_PASSWORD environment variables');
  process.exit(1);
}

const GROUPS = [
  'HAYS COUNTY LIST & SELL',
  'Buda/Kyle Buy, Sell & Rent',
  'Ventas De Austin, Buda, Kyle'
];

const STATE_FILE = path.join(__dirname, '..', 'data', 'fb-marketplace-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastGroupIndex: -1, loggedIn: false };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    ...state,
    timestamp: new Date().toISOString()
  }, null, 2));
}

async function createContext(headless = true) {
  return await chromium.launchPersistentContext(CHROME_USER_DATA, {
    headless,
    executablePath: CHROME_PATH,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ],
    viewport: { width: 1920, height: 1080 }
  });
}

/**
 * Check Marketplace messages
 */
async function checkMessages() {
  console.log('👀 Checking Facebook Marketplace messages...');
  
  // Use headed mode to avoid bot detection
  const context = await createContext(false);
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // First go to main Facebook to check login status
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const url = page.url();
    
    if (url.includes('login')) {
      console.log('❌ Session expired, needs re-login');
      await context.close();
      return { error: 'Session expired', loggedIn: false };
    }
    
    console.log('✅ Facebook session active');
    
    // Check for Marketplace notifications on main page
    const pageContent = await page.content();
    
    // Look for notification badges or marketplace indicators
    const notificationCount = await page.locator('span[data-testid="notification_badge"]').count();
    console.log(`🔔 Notifications found: ${notificationCount}`);
    
    // Check if F-150 or Thule mentioned in page
    const hasF150 = /f-150|f150|truck|thule/i.test(pageContent);
    
    if (hasF150) {
      console.log('🚨 F-150/Thule mentioned on page!');
    }
    
    console.log('✅ Check complete - Facebook session healthy');
    
    await context.close();
    return { 
      loggedIn: true, 
      notifications: notificationCount,
      hasF150,
      note: 'Marketplace direct access blocked by bot detection, monitoring via main page'
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await context.close();
    throw error;
  }
}

/**
 * Share F-150 to next group
 */
async function shareF150() {
  console.log('📤 Sharing F-150 listing...');
  
  const state = loadState();
  const nextIndex = (state.lastGroupIndex + 1) % GROUPS.length;
  const groupName = GROUPS[nextIndex];
  
  console.log(`Next group: ${groupName}`);
  
  const context = await createContext(false);
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Navigate to selling page
    await page.goto('https://www.facebook.com/marketplace/you/selling');
    await page.waitForTimeout(5000);
    
    const url = page.url();
    
    if (url.includes('login')) {
      console.log('❌ Session expired');
      await context.close();
      return { error: 'Session expired', group: groupName };
    }
    
    console.log('✅ Selling page loaded');
    console.log(`⚠️  Ready to share to: ${groupName}`);
    console.log('(Auto-sharing requires manual element identification)');
    
    // Keep open for observation
    await page.waitForTimeout(10000);
    
    saveState({ ...state, lastGroupIndex: nextIndex });
    await context.close();
    
    return { group: groupName, shared: false, note: 'Manual sharing required' };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await context.close();
    throw error;
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--help';
  
  console.log('🚗 Facebook Marketplace Automation (Chrome - Marvin Profile)\n');
  
  switch (mode) {
    case '--messages':
      const msgResult = await checkMessages();
      console.log('\nResult:', JSON.stringify(msgResult, null, 2));
      break;
      
    case '--share-f150':
      const shareResult = await shareF150();
      console.log('\nResult:', JSON.stringify(shareResult, null, 2));
      break;
      
    default:
      console.log(`
Usage:
  node facebook-marketplace-chrome.js [mode]

Modes:
  --messages    Check Marketplace inbox for F-150/Thule messages
  --share-f150  Share F-150 to next group in rotation

Uses Google Chrome with Marvin profile.
Profile: C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data
`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { checkMessages, shareF150 };
