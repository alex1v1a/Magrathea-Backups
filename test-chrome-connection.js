const { chromium } = require('playwright');

async function test() {
  try {
    console.log('Connecting to Chrome on port 9222...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome!');
    
    const page = browser.contexts()[0].pages()[0];
    await page.goto('https://www.heb.com');
    await new Promise(r => setTimeout(r, 3000));
    
    const loggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"]');
    });
    
    console.log('Login status:', loggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN');
    
    if (loggedIn) {
      console.log('\n🎉 SUCCESS! Ready to add items.');
    } else {
      console.log('\n⚠️  Please login in the Chrome window.');
    }
    
    await browser.disconnect();
  } catch(e) {
    console.log('❌ Error:', e.message);
  }
}

test();
