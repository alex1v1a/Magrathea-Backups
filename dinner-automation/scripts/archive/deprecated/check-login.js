const { chromium } = require('playwright');

async function checkLogin() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    console.log('No HEB page found');
    return;
  }
  
  console.log('Current URL:', page.url());
  
  const info = await page.evaluate(() => {
    return {
      accountMenu: !!document.querySelector('[data-testid="account-menu"]'),
      accountLink: !!document.querySelector('a[href*="/account"]'),
      signInLink: !!document.querySelector('a[href*="/login"]'),
      signInButton: !!document.querySelector('button[data-testid*="signin"]'),
      bodyText: document.body.innerText.substring(0, 500)
    };
  });
  
  console.log('Login check:', info);
  
  await browser.disconnect();
}

checkLogin();
