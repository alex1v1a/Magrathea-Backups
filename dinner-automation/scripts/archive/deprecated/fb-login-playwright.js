const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Facebook Login via Playwright
 * Restores Facebook session for automation
 * 
 * Usage: node fb-login-playwright.js
 */

const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const FB_EMAIL = 'alex@xspqr.com';
const FB_PASSWORD = 'section9';

async function loginToFacebook() {
  console.log('🔐 Launching Chrome with Marvin profile...');
  
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      '--profile-directory=Default',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to Facebook...');
    await page.goto('https://www.facebook.com/login');
    
    // Check if already logged in
    await page.waitForTimeout(3000);
    const url = page.url();
    
    if (!url.includes('login')) {
      console.log('✅ Already logged in!');
      await browser.close();
      return true;
    }
    
    console.log('📝 Entering credentials...');
    
    // Fill login form
    await page.fill('#email', FB_EMAIL);
    await page.fill('#pass', FB_PASSWORD);
    
    console.log('➡️  Clicking login...');
    await page.click('button[name="login"]');
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    const afterUrl = page.url();
    
    if (afterUrl.includes('facebook.com') && !afterUrl.includes('login')) {
      console.log('✅ Login successful!');
      console.log('💾 Session saved to Marvin profile');
      await browser.close();
      return true;
    } else if (afterUrl.includes('checkpoint') || afterUrl.includes('two_factor')) {
      console.log('⚠️  2FA or security check required');
      console.log('🕐 Waiting 60 seconds for manual completion...');
      await page.waitForTimeout(60000);
      
      // Check again
      const finalUrl = page.url();
      const success = finalUrl.includes('facebook.com') && !finalUrl.includes('login');
      
      if (success) {
        console.log('✅ Login completed!');
      }
      
      await browser.close();
      return success;
    } else {
      console.log('⚠️  Unexpected URL:', afterUrl);
      await browser.close();
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    throw error;
  }
}

// Run
loginToFacebook()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
