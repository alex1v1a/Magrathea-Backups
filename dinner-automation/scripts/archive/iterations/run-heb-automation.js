const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
const WEEKLY_PLAN = path.join(__dirname, '..', 'data', 'weekly-plan.json');

// Load weekly plan
const plan = JSON.parse(fs.readFileSync(WEEKLY_PLAN, 'utf8'));
const items = [];
plan.meals.forEach(meal => {
  meal.ingredients.forEach(ing => {
    items.push({
      name: ing.name,
      search: ing.hebSearch,
      amount: ing.amount
    });
  });
});

console.log(`🛒 HEB Auto-Cart: ${items.length} items to add\n`);

(async () => {
  const userDataDir = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  
  try {
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Wait for extension to be ready
    console.log('⏳ Waiting for extension...');
    await page.waitForTimeout(2000);
    
    // Open extension popup
    console.log('🖱️ Opening HEB Auto-Cart extension...');
    
    // Inject the weekly plan data
    await page.evaluate((planData) => {
      // Store in localStorage for extension to pick up
      localStorage.setItem('heb-weekly-plan', JSON.stringify(planData));
      console.log('Weekly plan loaded into localStorage');
    }, plan);
    
    console.log('\n📋 Instructions:');
    console.log('1. Click the 🛒 HEB Auto-Cart icon in the Chrome toolbar');
    console.log('2. The weekly plan should load automatically');
    console.log('3. Click "Start Adding Items"');
    console.log('4. Monitor progress in the extension popup\n');
    
    console.log(`📝 Items to add: ${items.length}`);
    console.log('   - Grilled Salmon with Asparagus (6 items)');
    console.log('   - Pork Tenderloin with Roasted Vegetables (6 items)');
    console.log('   - Fish Tacos with Mango Salsa (7 items)');
    console.log('   - Chicken Tikka Masala (6 items)');
    console.log('   - Beef Stir-Fry with Vegetables (6 items)');
    console.log('   - Shrimp Tacos with Cabbage Slaw (7 items)');
    console.log('   - Vegetable Curry with Chickpeas (5 items)\n');
    
    console.log('⏳ Browser will stay open for 3 minutes...');
    console.log('   (Close manually when done or wait for auto-close)\n');
    
    await page.waitForTimeout(180000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('✅ HEB Auto-Cart session complete');
  }
})();
