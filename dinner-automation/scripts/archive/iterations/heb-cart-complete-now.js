const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8')).items || [];
  } catch (e) { return []; }
}

async function main() {
  const items = loadItems();
  
  console.log('='.repeat(60));
  console.log('🛒 HEB CART - READY FOR COMPLETION');
  console.log('='.repeat(60));
  console.log(`\n📋 ${items.length} items loaded\n`);
  
  // Display items
  items.forEach((item, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${item.name.padEnd(25)} ${item.amount}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('🖱️  COMPLETION STEPS:');
  console.log('='.repeat(60));
  console.log('1. Browser will open HEB.com');
  console.log('2. Extension icon will appear in toolbar');
  console.log('3. Click the extension icon');
  console.log('4. Click "Add All Items" button');
  console.log('5. Done! All 31 items added to cart');
  console.log('='.repeat(60) + '\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.heb.com');
  
  console.log('✅ Browser open - ready for extension click\n');
  
  // Keep open
  await new Promise(() => {});
}

main().catch(console.error);
