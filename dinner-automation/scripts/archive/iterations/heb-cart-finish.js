const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart - Extension Method
 * Opens HEB with extension ready to add all items
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  const items = loadItems();
  console.log('🛒 HEB Cart Extension Method');
  console.log(`📋 ${items.length} items ready\n`);
  
  console.log('Items to add:');
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name} (${item.amount})`);
  });
  console.log('\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    
    console.log('✅ HEB loaded');
    console.log('\n📦 Extension should detect:');
    console.log(`   ${path.join(DATA_DIR, 'heb-extension-items.json')}`);
    console.log('\n🖱️  Please click "Add All Items" in the extension');
    console.log('⏳ Keeping browser open for 10 minutes...\n');
    
    // Keep open for 10 minutes to complete cart
    await page.waitForTimeout(600000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await context.close();
  }
}

main().catch(console.error);
