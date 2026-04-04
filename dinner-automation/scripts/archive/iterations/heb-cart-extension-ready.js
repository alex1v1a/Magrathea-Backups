const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart - Extension Ready
 * Opens HEB in Edge with extension prepared
 * 
 * Usage: node heb-cart-extension-ready.js
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

async function createContext() {
  return await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ],
    viewport: { width: 1920, height: 1080 }
  });
}

function loadShoppingList() {
  try {
    const itemsFile = path.join(DATA_DIR, 'heb-extension-items.json');
    const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    return data;
  } catch (error) {
    console.error('❌ Could not load shopping list:', error.message);
    return { items: [] };
  }
}

async function main() {
  console.log('🛒 HEB Cart - Extension Ready\n');
  
  const data = loadShoppingList();
  const items = data.items || [];
  
  console.log(`📋 ${items.length} items ready for extension\n`);
  console.log('Shopping List Preview:');
  items.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name} (${item.amount})`);
  });
  if (items.length > 10) {
    console.log(`  ... and ${items.length - 10} more items`);
  }
  
  console.log('\n🌐 Opening HEB.com in Edge...');
  console.log('   The extension should auto-load the shopping list.\n');
  
  const context = await createContext();
  const page = context.pages()[0] || await context.newPage();
  
  try {
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    
    console.log('✅ HEB.com loaded');
    console.log('\n📦 Extension File Location:');
    console.log(`   ${path.join(DATA_DIR, 'heb-extension-items.json')}`);
    console.log('\n⏳ Browser staying open for manual cart completion...');
    console.log('   Press Ctrl+C when done.\n');
    
    // Keep browser open indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await context.close();
  }
}

main().catch(console.error);
