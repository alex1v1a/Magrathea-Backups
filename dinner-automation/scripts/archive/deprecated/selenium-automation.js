const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

/**
 * Selenium Chrome Automation
 * Uses ChromeDriver for reliable browser automation
 * 
 * Usage:
 *   node selenium-automation.js --facebook-messages
 *   node selenium-automation.js --heb-cart
 */

const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const FB_EMAIL = 'alex@xspqr.com';
const FB_PASSWORD = 'section9';

async function createDriver() {
  const options = new chrome.Options();
  
  // Use existing Marvin profile
  options.addArguments(`--user-data-dir=${USER_DATA_DIR}`);
  options.addArguments('--profile-directory=Default');
  
  // Window settings
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  
  // Prevent detection
  options.addArguments('--disable-web-security');
  options.addArguments('--allow-running-insecure-content');
  options.excludeSwitches('enable-automation');
  
  // Create driver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  return driver;
}

/**
 * Check Facebook Marketplace messages
 */
async function checkFacebookMessages() {
  console.log('🔐 Connecting to Facebook via Selenium...');
  
  const driver = await createDriver();
  
  try {
    // Navigate to Facebook
    await driver.get('https://www.facebook.com/marketplace/inbox');
    
    // Wait for page to load
    await driver.sleep(5000);
    
    console.log('✅ Facebook loaded');
    
    // Check if we're on the inbox page
    const currentUrl = await driver.getCurrentUrl();
    console.log(`Current URL: ${currentUrl}`);
    
    // Look for conversations
    const conversations = await driver.findElements(By.css('div[role="listitem"]'));
    console.log(`📨 Found ${conversations.length} conversations`);
    
    // Get page source to check for F-150 mentions
    const pageSource = await driver.getPageSource();
    const hasF150 = pageSource.toLowerCase().includes('f-150') || 
                   pageSource.toLowerCase().includes('f150') ||
                   pageSource.toLowerCase().includes('truck');
    
    if (hasF150) {
      console.log('🚨 F-150 related messages detected!');
    } else {
      console.log('✅ No F-150 messages');
    }
    
    return { conversations: conversations.length, hasF150 };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await driver.quit();
  }
}

/**
 * Navigate to HEB (for extension use)
 */
async function openHEB() {
  console.log('🛒 Opening HEB via Selenium...');
  
  const driver = await createDriver();
  
  try {
    await driver.get('https://www.heb.com');
    await driver.sleep(5000);
    
    console.log('✅ HEB loaded');
    console.log('Extension should auto-load shopping list');
    
    // Keep browser open for manual extension use
    console.log('Browser will stay open for 60 seconds...');
    await driver.sleep(60000);
    
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
  
  console.log('🚗 Selenium Chrome Automation\n');
  
  if (mode === '--facebook-messages') {
    await checkFacebookMessages();
  } else if (mode === '--heb-cart') {
    await openHEB();
  } else {
    console.log(`
Usage:
  node selenium-automation.js [mode]

Modes:
  --facebook-messages   Check Facebook Marketplace inbox
  --heb-cart            Open HEB for extension automation

Uses Marvin Chrome profile with existing logins.
`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { createDriver, checkFacebookMessages, openHEB };
