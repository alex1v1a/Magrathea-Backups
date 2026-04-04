const { chromium } = require('playwright');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function debugLogin() {
  console.log('Debug: Checking HEB login page structure\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  
  const page = await browser.newPage();
  
  // Go to HEB and click login
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Click My account / Login
  await page.click('a[href*="/login"], button:has-text("My account"), [data-testid="account-menu"]');
  await sleep(5000);
  
  // Take screenshot
  await page.screenshot({ path: 'heb-login-debug.png', fullPage: true });
  console.log('Screenshot saved: heb-login-debug.png');
  
  // Get page HTML
  const html = await page.content();
  console.log('Page HTML (first 2000 chars):');
  console.log(html.substring(0, 2000));
  
  await browser.close();
}

debugLogin().catch(console.error);
