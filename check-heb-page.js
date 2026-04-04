const { chromium } = require('playwright');

async function checkPage() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Take screenshot
  await page.screenshot({ path: 'heb-debug.png', fullPage: true });
  console.log('Screenshot saved: heb-debug.png');
  
  // Check for search box
  const searchBox = await page.locator('input[placeholder*="Search"], input[name="q"]').first();
  const searchBoxVisible = await searchBox.isVisible().catch(() => false);
  console.log('Search box visible:', searchBoxVisible);
  
  await browser.disconnect();
}

checkPage().catch(console.error);
