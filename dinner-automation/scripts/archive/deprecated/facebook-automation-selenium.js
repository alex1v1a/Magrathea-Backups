const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

/**
 * Facebook Marketplace Automation - Full Suite
 * Uses Selenium ChromeDriver for reliable automation
 * 
 * Usage:
 *   node facebook-automation-selenium.js --login
 *   node facebook-automation-selenium.js --messages
 *   node facebook-automation-selenium.js --share-f150
 */

const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const FB_EMAIL = 'alex@xspqr.com';
const FB_PASSWORD = 'section9';
const STATE_FILE = path.join(__dirname, '..', 'data', 'fb-selenium-state.json');

// Group rotation from MEMORY.md
const GROUPS = [
  { name: 'HAYS COUNTY LIST & SELL', url: 'https://www.facebook.com/groups/123456' },
  { name: 'Buda/Kyle Buy, Sell & Rent', url: 'https://www.facebook.com/groups/789012' },
  { name: 'Ventas De Austin, Buda, Kyle', url: 'https://www.facebook.com/groups/345678' }
];

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    ...state,
    timestamp: new Date().toISOString()
  }, null, 2));
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { loggedIn: false, lastGroupIndex: -1 };
  }
}

async function createDriver(headless = false) {
  const options = new chrome.Options();
  
  // Use Marvin profile for persistence
  options.addArguments(`--user-data-dir=${USER_DATA_DIR}`);
  options.addArguments('--profile-directory=Default');
  
  // Anti-detection
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--disable-web-security');
  options.excludeSwitches('enable-automation');
  
  // Window
  if (headless) {
    options.addArguments('--headless');
  } else {
    options.addArguments('--start-maximized');
  }
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  // Execute script to prevent detection
  await driver.executeScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  
  return driver;
}

/**
 * Login to Facebook
 */
async function loginToFacebook() {
  log('🔐 Logging into Facebook...');
  
  const driver = await createDriver(false);
  
  try {
    await driver.get('https://www.facebook.com/login');
    await driver.sleep(3000);
    
    // Check if already logged in
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('login')) {
      log('✅ Already logged in!');
      saveState({ loggedIn: true });
      await driver.quit();
      return true;
    }
    
    // Fill email
    const emailField = await driver.findElement(By.id('email'));
    await emailField.clear();
    await emailField.sendKeys(FB_EMAIL);
    log('✉️  Email entered');
    
    // Fill password
    const passField = await driver.findElement(By.id('pass'));
    await passField.sendKeys(FB_PASSWORD);
    log('🔑 Password entered');
    
    // Click login
    const loginBtn = await driver.findElement(By.name('login'));
    await loginBtn.click();
    log('➡️  Login clicked');
    
    // Wait for navigation
    await driver.sleep(5000);
    
    // Check result
    const afterUrl = await driver.getCurrentUrl();
    if (afterUrl.includes('facebook.com') && !afterUrl.includes('login')) {
      log('✅ Login successful!');
      saveState({ loggedIn: true });
      return true;
    } else {
      log('⚠️  May need 2FA or verification');
      log('Current URL: ' + afterUrl);
      // Keep browser open for manual intervention
      log('Browser staying open for 60 seconds...');
      await driver.sleep(60000);
      return false;
    }
    
  } finally {
    await driver.quit();
  }
}

/**
 * Check Marketplace messages
 */
async function checkMessages() {
  log('👀 Checking Facebook Marketplace messages...');
  
  const driver = await createDriver(true);
  
  try {
    await driver.get('https://www.facebook.com/marketplace/inbox');
    await driver.sleep(5000);
    
    const currentUrl = await driver.getCurrentUrl();
    
    // Check if redirected to login
    if (currentUrl.includes('login')) {
      log('❌ Session expired, needs login');
      saveState({ loggedIn: false });
      return { error: 'Session expired' };
    }
    
    // Count conversations
    const conversations = await driver.findElements(By.css('div[role="listitem"]'));
    log(`📨 Found ${conversations.length} conversations`);
    
    // Check for F-150 mentions
    const pageSource = await driver.getPageSource();
    const hasF150 = /f-150|f150|truck|thule/i.test(pageSource);
    
    if (hasF150) {
      log('🚨 F-150/Thule related messages detected!');
    }
    
    return { conversations: conversations.length, hasF150 };
    
  } finally {
    await driver.quit();
  }
}

/**
 * Share F-150 to next group in rotation
 */
async function shareF150() {
  log('📤 Sharing F-150 listing to next group...');
  
  const state = loadState();
  const nextIndex = (state.lastGroupIndex + 1) % GROUPS.length;
  const group = GROUPS[nextIndex];
  
  log(`Next group: ${group.name}`);
  
  const driver = await createDriver(false);
  
  try {
    // Navigate to user's listings
    await driver.get('https://www.facebook.com/marketplace/you/selling');
    await driver.sleep(5000);
    
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('login')) {
      log('❌ Session expired');
      saveState({ loggedIn: false });
      return { error: 'Session expired' };
    }
    
    log('✅ Selling page loaded');
    log('⚠️  Auto-sharing requires specific listing URL');
    log('Manual sharing to: ' + group.name);
    
    // Keep open for manual action
    await driver.sleep(30000);
    
    saveState({ ...state, lastGroupIndex: nextIndex });
    return { group: group.name, shared: false };
    
  } finally {
    await driver.quit();
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--help';
  
  console.log('🚗 Facebook Automation (Selenium)\n');
  
  switch (mode) {
    case '--login':
      await loginToFacebook();
      break;
      
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
  node facebook-automation-selenium.js [mode]

Modes:
  --login       Log into Facebook (saves session)
  --messages    Check Marketplace inbox
  --share-f150  Share F-150 to next group

Credentials: ${FB_EMAIL}
`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { loginToFacebook, checkMessages, shareF150 };
