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
  console.log('🛒 HEB Cart - Automated Extension Trigger\n');
  console.log(`📋 ${items.length} items\n`);
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Open HEB
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    console.log('✅ HEB loaded');
    
    // Try keyboard shortcut for extension (Alt+Shift+H is common)
    console.log('⌨️  Trying extension keyboard shortcuts...');
    
    // Try common extension shortcuts
    const shortcuts = [
      'Alt+Shift+H',
      'Alt+Shift+A',
      'Ctrl+Shift+H',
      'Ctrl+Shift+A',
      'Alt+H'
    ];
    
    for (const shortcut of shortcuts) {
      console.log(`   Trying ${shortcut}...`);
      await page.keyboard.press(shortcut);
      await page.waitForTimeout(2000);
      
      // Check if extension popup appeared
      const pages = context.pages();
      if (pages.length > 1) {
        console.log('✅ Extension popup detected!');
        break;
      }
    }
    
    // Alternative: Try to open extension background page
    console.log('\n🔍 Looking for extension pages...');
    
    // Common HEB extension IDs
    const possibleExtensions = [
      'chrome-extension://jfmocbgdjlbepjfgbpfdngjojobnhiff/popup.html',
      'chrome-extension://heb-cart-helper/popup.html',
      'edge://extensions/'
    ];
    
    for (const extUrl of possibleExtensions) {
      try {
        const extPage = await context.newPage();
        await extPage.goto(extUrl);
        await extPage.waitForTimeout(2000);
        
        const title = await extPage.title().catch(() => '');
        console.log(`   ${extUrl}: ${title}`);
        
        if (title.toLowerCase().includes('heb') || title.toLowerCase().includes('cart')) {
          console.log('✅ HEB extension found!');
          
          // Look for add button
          const addBtn = await extPage.locator('button:has-text("Add"), button:has-text("Add All"), #add-all-items').first();
          if (await addBtn.isVisible().catch(() => false)) {
            console.log('🖱️  Clicking "Add All Items"...');
            await addBtn.click();
            console.log('✅ Clicked!');
          }
          
          break;
        }
      } catch (e) {
        // Extension not found, close page
        const pages = context.pages();
        if (pages.length > 1) {
          await pages[pages.length - 1].close();
        }
      }
    }
    
    console.log('\n⏳ Process complete - checking cart...');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    // Check cart count
    const cartCount = await page.locator('.cart-count, [data-testid*="cart-count"]').textContent().catch(() => '0');
    console.log(`🛒 Cart items: ${cartCount}`);
    
    console.log('\n✅ Browser staying open');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
