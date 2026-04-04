const { chromium } = require('playwright');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

async function mobileApproach() {
  console.log('🛒 MOBILE APPROACH - Last Attempt\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 375, height: 812 }, // iPhone viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Try mobile site
    console.log('Loading mobile HEB...');
    await page.goto('https://www.heb.com', { timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Check if mobile version loaded
    const isMobile = await page.evaluate(() => window.innerWidth < 500);
    console.log(`Mobile mode: ${isMobile ? 'YES' : 'NO'}\n`);
    
    // Try to add items via direct form submission simulation
    const items = [
      { name: 'Catfish', id: 'search-catfish' },
      { name: 'Sriracha', id: 'search-sriracha' },
      { name: 'Bosc pear', id: 'search-pear' }
    ];
    
    for (const item of items) {
      console.log(`Attempting: ${item.name}`);
      
      // Multiple selector strategies
      const selectors = [
        'input[type="search"]',
        'input[name="q"]',
        'input[placeholder*="Search"]',
        '[data-testid*="search"] input',
        'form input'
      ];
      
      for (const selector of selectors) {
        try {
          const input = await page.locator(selector).first();
          if (await input.isVisible().catch(() => false)) {
            await input.fill(item.name.toLowerCase());
            await input.press('Enter');
            await page.waitForTimeout(4000);
            
            // Try to click add with multiple strategies
            const addSelectors = [
              'button:has-text("Add")',
              'button[data-testid*="add"]',
              'button.add-to-cart',
              '[data-automation-id*="add"]'
            ];
            
            for (const addSel of addSelectors) {
              const addBtn = await page.locator(addSel).first();
              if (await addBtn.isVisible().catch(() => false)) {
                await addBtn.click({ force: true });
                await page.waitForTimeout(3000);
                console.log(`  ✅ Clicked add for ${item.name}`);
                break;
              }
            }
            break;
          }
        } catch (e) {}
      }
      
      await page.waitForTimeout(2000);
    }
    
    // Check cart
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    const cartCount = await page.locator('.cart-item, [data-testid*="cart-item"]').count().catch(() => 0);
    console.log(`\n📦 Cart items: ${cartCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

mobileApproach().catch(console.error);
