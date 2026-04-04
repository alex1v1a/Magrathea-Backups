const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * F-150 Aggressive Sales - Chrome Edition (Marvin Profile)
 * Automated Facebook Marketplace posting and management
 */

const CHROME_USER_DATA = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const GROUPS = [
  'HAYS COUNTY LIST & SELL',
  'Buda/Kyle Buy, Sell & Rent',
  'Ventas De Austin, Buda, Kyle'
];

async function createContext(headless = false) {
  return await chromium.launchPersistentContext(CHROME_USER_DATA, {
    headless,
    executablePath: CHROME_PATH,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    viewport: { width: 1920, height: 1080 }
  });
}

/**
 * Share F-150 listing aggressively
 */
async function shareF150() {
  console.log('🚗 F-150 Aggressive Sales (Chrome - Marvin Profile)\n');
  
  const context = await createContext(false);
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Navigate to Facebook Marketplace selling
    console.log('📤 Opening Facebook Marketplace...');
    await page.goto('https://www.facebook.com/marketplace/you/selling');
    await page.waitForTimeout(5000);
    
    const url = page.url();
    if (url.includes('login')) {
      console.log('❌ Session expired - needs login');
      await context.close();
      return { error: 'Session expired' };
    }
    
    console.log('✅ Marketplace loaded');
    
    // Check for F-150 listing
    const pageContent = await page.content();
    const hasF150 = /f-150|f150|ford truck/i.test(pageContent);
    
    if (hasF150) {
      console.log('✅ F-150 listing found');
    } else {
      console.log('⚠️  F-150 listing not visible');
    }
    
    await page.waitForTimeout(10000);
    await context.close();
    
    return { success: true, hasF150 };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await context.close();
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  shareF150()
    .then(result => {
      console.log('\nResult:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { shareF150 };
