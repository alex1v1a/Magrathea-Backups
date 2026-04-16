const fs = require('fs');
const path = require('path');
const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');

/**
 * Facebook Marketplace Automation - Shared Chrome Edition
 * Connects to shared Chrome instance via CDP
 * 
 * Usage:
 *   node facebook-marketplace-shared.js --messages
 *   node facebook-marketplace-shared.js --share-f150
 */

// Facebook Credentials - loaded from environment variables
const FB_EMAIL = process.env.FACEBOOK_EMAIL || process.env.FACEBOOK_USERNAME;
const FB_PASSWORD = process.env.FACEBOOK_PASSWORD;

// Validate credentials are configured
if (!FB_EMAIL || !FB_PASSWORD) {
  console.error('ERROR: Facebook credentials not configured');
  console.error('Set FACEBOOK_EMAIL and FACEBOOK_PASSWORD environment variables');
  console.error('Or use: source .env && node facebook-marketplace-shared.js');
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

/**
 * Check Marketplace messages
 */
async function checkMessages() {
  console.log('👀 Checking Facebook Marketplace messages...');
  
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.facebook.com/');
  
  try {
    await page.waitForTimeout(3000);
    
    const url = page.url();
    
    if (url.includes('login')) {
      console.log('❌ Session expired, needs re-login');
      await releaseBrowser(browser);
      return { error: 'Session expired', loggedIn: false };
    }
    
    console.log('✅ Facebook session active');
    
    // Check for notifications
    const pageContent = await page.content();
    const notificationCount = await page.locator('span[data-testid="notification_badge"]').count();
    console.log(`🔔 Notifications found: ${notificationCount}`);
    
    // Check for F-150 mentions
    const hasF150 = /f-150|f150|truck|thule/i.test(pageContent);
    if (hasF150) {
      console.log('🚨 F-150/Thule mentioned on page!');
    }
    
    console.log('✅ Check complete');
    
    await releaseBrowser(browser);
    return { 
      loggedIn: true, 
      notifications: notificationCount,
      hasF150,
      note: 'Connected to shared Chrome instance'
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await releaseBrowser(browser);
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
  
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.facebook.com/marketplace/you/selling');
  
  try {
    await page.waitForTimeout(5000);
    
    const url = page.url();
    
    if (url.includes('login')) {
      console.log('❌ Session expired');
      await releaseBrowser(browser);
      return { error: 'Session expired', group: groupName };
    }
    
    console.log('✅ Selling page loaded');
    console.log(`⚠️  Ready to share to: ${groupName}`);
    
    await page.waitForTimeout(10000);
    
    saveState({ ...state, lastGroupIndex: nextIndex });
    await releaseBrowser(browser);
    
    return { group: groupName, shared: false, note: 'Manual sharing required' };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await releaseBrowser(browser);
    throw error;
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--help';
  
  console.log('🚗 Facebook Marketplace (Shared Chrome)\n');
  
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
  node facebook-marketplace-shared.js [mode]

Modes:
  --messages    Check Marketplace inbox for F-150/Thule messages
  --share-f150  Share F-150 to next group in rotation

Uses shared Chrome instance (no new browser windows)
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
