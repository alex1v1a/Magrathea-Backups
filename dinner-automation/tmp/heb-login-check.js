const { getBrowser, getPage, releaseBrowser } = require('../scripts/shared-chrome-connector');

(async () => {
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.heb.com');
  await page.waitForTimeout(7000);

  const url = page.url();
  const loggedOutButtons = await page.locator('button[data-testid*="logged-out-add-to-cart"]').count();
  const realButtons = await page.locator('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])').count();
  const hasAccountMenu = await page.locator('[data-testid="account-menu"], [data-automation-id*="account-menu"], a[href*="/account"]').count();

  console.log({ url, loggedOutButtons, realButtons, hasAccountMenu });
  await releaseBrowser(browser);
})();
