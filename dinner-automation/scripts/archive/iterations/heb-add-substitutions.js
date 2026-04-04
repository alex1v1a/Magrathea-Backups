const { chromium } = require('playwright');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

// Substitution items that need to be ADDED to cart
const SUBSTITUTIONS_TO_ADD = [
  { name: 'Catfish fillet', search: 'catfish fillet', qty: '1.5 lbs', for: 'White fish fillets' },
  { name: 'Sriracha', search: 'sriracha', qty: '1 bottle', for: 'Gochujang' },
  { name: 'Bosc pear', search: 'bosc pear', qty: '1', for: 'Asian pear' }
];

async function main() {
  console.log('🛒 ADDING SUBSTITUTION ITEMS TO CART\n');
  console.log('These are the replacement items for what was out of stock:\n');
  
  SUBSTITUTIONS_TO_ADD.forEach((item, i) => {
    console.log(`${i + 1}. ${item.name} (${item.qty})`);
    console.log(`   (substitute for: ${item.for})\n`);
  });
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  const added = [];
  const failed = [];
  
  try {
    for (const item of SUBSTITUTIONS_TO_ADD) {
      console.log(`🔍 Searching: ${item.name}...`);
      
      // Navigate to HEB search
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`);
      await page.waitForTimeout(4000);
      
      // Try to find and click add button
      const addBtn = await page.locator('button:has-text("Add"), button[data-testid*="add"]').first();
      
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(3000);
        console.log(`   ✅ Added to cart\n`);
        added.push(item.name);
      } else {
        console.log(`   ❌ Could not find add button\n`);
        failed.push(item.name);
      }
    }
    
    // Verify final cart
    console.log('🛒 Checking final cart...');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully added: ${added.length}/${SUBSTITUTIONS_TO_ADD.length}`);
    added.forEach(item => console.log(`   • ${item}`));
    
    if (failed.length > 0) {
      console.log(`\n❌ Could not add: ${failed.length}`);
      failed.forEach(item => console.log(`   • ${item}`));
    }
    
    console.log(`\n📦 Expected cart total: ${27 + added.length} items`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
