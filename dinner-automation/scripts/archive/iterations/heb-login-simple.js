const { chromium } = require('playwright');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

async function loginHEB() {
  console.log('Logging into HEB...\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Go directly to HEB login URL
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(4000);
  
  // Look for and click login link/button
  console.log('Looking for login button...');
  
  // Try multiple selectors
  const loginSelectors = [
    'a[href*="/login"]',
    'button:has-text("My account")',
    '[data-testid="account-menu"]',
    'a:has-text("Log in")',
    'button:has-text("Log in")'
  ];
  
  for (const selector of loginSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        console.log(`Found login element: ${selector}`);
        await el.click();
        await sleep(5000);
        break;
      }
    } catch (e) {}
  }
  
  // Take screenshot to see what we're looking at
  await page.screenshot({ path: 'heb-before-login.png' });
  console.log('Screenshot saved: heb-before-login.png');
  
  // Try to find email input
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    'input[id*="email" i]',
    'input[inputmode="email"]'
  ];
  
  console.log('Looking for email field...');
  for (const selector of emailSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        console.log(`Found email field: ${selector}`);
        await el.fill(HEB_EMAIL);
        console.log('Email entered');
        break;
      }
    } catch (e) {}
  }
  
  await sleep(2000);
  
  // Look for continue/submit button
  const continueSelectors = [
    'button[type="submit"]',
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'input[type="submit"]'
  ];
  
  for (const selector of continueSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        console.log('Clicking continue...');
        await el.click();
        await sleep(5000);
        break;
      }
    } catch (e) {}
  }
  
  // Look for password field
  console.log('Looking for password field...');
  const passSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]'
  ];
  
  for (const selector of passSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        console.log(`Found password field: ${selector}`);
        await el.fill(HEB_PASS);
        console.log('Password entered');
        break;
      }
    } catch (e) {}
  }
  
  await sleep(2000);
  
  // Click login
  for (const selector of continueSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        console.log('Clicking login...');
        await el.click();
        await sleep(8000);
        break;
      }
    } catch (e) {}
  }
  
  // Check login status
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') ||
           document.body.innerText.includes('Welcome') ||
           document.body.innerText.includes('My account');
  });
  
  if (isLoggedIn) {
    console.log('\n✅ Successfully logged in!');
  } else {
    console.log('\n⚠️  Login status unclear - check browser window');
  }
  
  // Keep browser open
  console.log('\nBrowser stays open.');
}

loginHEB().catch(console.error);
