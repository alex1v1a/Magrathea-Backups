const { chromium } = require('playwright');

async function test() {
  try {
    console.log('Launching Chrome via Playwright...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('Going to HEB...');
    await page.goto('https://www.heb.com');
    console.log('HEB loaded:', page.url());
    
    await new Promise(r => setTimeout(r, 3000));
    
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"]');
    });
    
    console.log('Logged in:', isLoggedIn);
    
    if (!isLoggedIn) {
      console.log('Not logged in - would need to login');
    } else {
      console.log('Already logged in - can add items');
    }
    
    // Keep browser open
    console.log('Browser stays open for 60 seconds...');
    await new Promise(r => setTimeout(r, 60000));
    
    await browser.close();
  } catch(e) {
    console.error('Error:', e.message);
  }
}

test();
