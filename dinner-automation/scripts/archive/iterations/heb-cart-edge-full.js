const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Auto-Cart via Microsoft Edge
 * Uses Edge with Chrome extension compatibility
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_PROFILE = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Load 44 items from weekly plan
const plan = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'weekly-plan.json'), 'utf8'));
const items = [];
plan.meals.forEach(meal => {
  meal.ingredients.forEach(ing => {
    items.push({ name: ing.name, hebSearch: ing.hebSearch, amount: ing.amount });
  });
});

// Ensure autostart data exists
const autoStartPath = path.join(EXTENSION_PATH, 'autostart-data.json');
fs.writeFileSync(autoStartPath, JSON.stringify({ 
  autoStart: true, 
  items, 
  timestamp: new Date().toISOString() 
}, null, 2));

console.log('🛒 HEB Auto-Cart via Microsoft Edge');
console.log('=' .repeat(60));
console.log(`📦 Items: ${items.length}`);
console.log(`🌐 Browser: Microsoft Edge`);
console.log(`📁 Extension: HEB Auto-Cart v1.2.0\n`);

(async () => {
  console.log('🚀 Launching Edge with Chrome extension...');
  
  try {
    const context = await chromium.launchPersistentContext(EDGE_PROFILE, {
      headless: false,
      executablePath: EDGE_PATH,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    console.log('✅ Edge launched with extension');
    console.log('🌐 Navigating to HEB.com...\n');
    
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    console.log('✅ HEB.com loaded');
    console.log('\n📋 Next steps:');
    console.log('   1. Log into HEB if needed');
    console.log('   2. Click 🛒 HEB Auto-Cart icon in toolbar');
    console.log('   3. Extension will auto-detect 44 items');
    console.log('   4. Click "Start Adding Items"');
    console.log('\n⏳ Browser will stay open for 15 minutes...\n');
    
    // Monitor for 15 minutes
    let minutes = 0;
    const interval = setInterval(async () => {
      minutes++;
      try {
        const url = page.url();
        console.log(`   ⏱️  ${minutes}m - ${url.substring(0, 50)}...`);
      } catch {
        clearInterval(interval);
      }
      
      if (minutes >= 15) {
        clearInterval(interval);
        console.log('\n✅ Session complete');
        await context.close();
      }
    }, 60000);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n⚠️  Edge automation failed');
    console.log('   Please add HEB items manually');
  }
})();
