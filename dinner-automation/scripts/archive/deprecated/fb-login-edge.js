const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Facebook Login via Edge
 * Uses Edge browser with persistent profile
 * 
 * Usage: node fb-login-edge.js
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const FB_EMAIL = 'alex@xspqr.com';
const FB_PASSWORD = 'section9';

async function loginToFacebook() {
  console.log('🔐 Launching Microsoft Edge...');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    console.log('🌐 Navigating to Facebook...');
    await page.goto('https://www.facebook.com/login');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    
    if (!url.includes('login')) {
      console.log('✅ Already logged in!');
      await context.close();
      return true;
    }
    
    console.log('📝 Entering credentials...');
    await page.fill('#email', FB_EMAIL);
    await page.fill('#pass', FB_PASSWORD);
    
    console.log('➡️  Clicking login...');
    await page.click('button[name="login"]');
    
    await page.waitForTimeout(5000);
    
    const afterUrl = page.url();
    
    if (afterUrl.includes('facebook.com') && !afterUrl.includes('login')) {
      console.log('✅ Login successful!');
      console.log('💾 Session saved to Edge profile');
      await context.close();
      return true;
    } else if (afterUrl.includes('checkpoint')) {
      console.log('⚠️  Security check required - waiting 60 seconds...');
      await page.waitForTimeout(60000);
      
      const finalUrl = page.url();
      const success = finalUrl.includes('facebook.com') && !finalUrl.includes('login');
      
      if (success) {
        console.log('✅ Login completed!');
      }
      
      await context.close();
      return success;
    } else {
      console.log('⚠️  Current URL:', afterUrl);
      await context.close();
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await context.close();
    throw error;
  }
}

loginToFacebook()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
