const { chromium } = require('playwright');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

const MISSING_ITEMS = [
  { name: 'White fish fillets', search: 'tilapia', amount: '1.5 lbs' },
  { name: 'Gochujang', search: 'gochujang', amount: '1 container' },
  { name: 'Asian pear', search: 'asian pear', amount: '1' },
  { name: 'Sesame seeds', search: 'sesame seeds', amount: '1 container' }
];

async function main() {
  console.log('🛒 ADDING 4 MISSING ITEMS TO CART\n');
  console.log('Items to add:');
  MISSING_ITEMS.forEach((item, i) => console.log(`  ${i + 1}. ${item.name}`));
  console.log('\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Process each missing item
    for (const item of MISSING_ITEMS) {
      console.log(`\n🔍 Searching: ${item.name}`);
      
      await page.goto('https://www.heb.com/search?q=' + encodeURIComponent(item.search));
      await page.waitForTimeout(4000);
      
      // Look for add button
      const addBtn = await page.locator('button:has-text("Add"), button[data-testid*="add"]').first();
      
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        console.log('   ✅ Added to cart');
        await page.waitForTimeout(3000);
      } else {
        console.log('   ❌ Could not find add button');
      }
    }
    
    // Go to cart to verify
    console.log('\n🛒 Going to cart...');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    console.log('\n✅ Done! Check cart for all 31 items.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
