const { getBrowser, getPage, releaseBrowser } = require('../scripts/shared-chrome-connector');

(async () => {
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.heb.com');
  await page.waitForTimeout(7000);
  await page.screenshot({ path: 'dinner-automation/tmp/heb-home.png', fullPage: true });
  console.log('saved screenshot');
  await releaseBrowser(browser);
})();
