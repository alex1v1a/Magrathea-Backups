const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

async function testPersistent() {
  try {
    console.log('Launching Chrome with Marvin profile...');
    console.log('Profile:', USER_DATA_DIR);
    
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      args: ['--remote-debugging-port=9222']
    });
    
    const page = context.pages()[0] || await context.newPage();
    
    console.log('Going to HEB...');
    await page.goto('https://www.heb.com');
    console.log('Loaded:', page.url());
    
    await new Promise(r => setTimeout(r, 3000));
    
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"]') && 
             !document.querySelector('a[href*="/login"]');
    });
    
    console.log('Logged in:', isLoggedIn);
    
    if (isLoggedIn) {
      console.log('✅ SUCCESS! Can start adding items.');
    } else {
      console.log('⚠️  Need to login in this browser window.');
    }
    
    // Keep open
    console.log('Browser stays open...');
    await new Promise(r => setTimeout(r, 60000));
    
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
}

testPersistent();
