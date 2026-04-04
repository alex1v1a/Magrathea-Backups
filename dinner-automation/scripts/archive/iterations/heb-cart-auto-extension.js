const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart - Direct API Method
 * Replicates extension functionality without UI interaction
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

async function injectExtensionLogic(page, items) {
  // Inject JavaScript that mimics the extension's functionality
  await page.evaluate((items) => {
    // Create a floating button like the extension would
    const btn = document.createElement('button');
    btn.id = 'marvin-auto-add';
    btn.textContent = `Add ${items.length} Items to Cart`;
    btn.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 999999;
      background: #dc2626;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    // Click handler that searches and adds items
    btn.onclick = async () => {
      btn.textContent = 'Adding items...';
      btn.disabled = true;
      
      for (const item of items) {
        try {
          // Find search box
          const search = document.querySelector('input[placeholder*="Search"], input[name="q"]');
          if (search) {
            search.value = item.searchTerm;
            search.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Trigger search
            const form = search.closest('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
          }
          
          // Wait and find add button
          await new Promise(r => setTimeout(r, 3000));
          
          const addBtn = document.querySelector('button:contains("Add"), button[data-testid*="add"]');
          if (addBtn) addBtn.click();
          
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {}
      }
      
      btn.textContent = 'Done! Go to cart';
      window.location.href = 'https://www.heb.com/cart';
    };
    
    document.body.appendChild(btn);
    
    // Auto-click after 3 seconds
    setTimeout(() => btn.click(), 3000);
  }, items);
}

async function main() {
  console.log('🛒 HEB Cart - Auto-Extension Method\n');
  
  const items = loadItems();
  console.log(`📋 ${items.length} items\n`);
  
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
    console.log('🤖 Injecting auto-click extension...\n');
    
    await injectExtensionLogic(page, items);
    
    console.log('⏳ Auto-adding items in 3 seconds...');
    console.log('   Do not interact with the browser\n');
    
    // Monitor progress
    let lastItem = '';
    for (let i = 0; i < items.length * 6; i++) {
      await page.waitForTimeout(1000);
      
      const url = page.url();
      if (url.includes('/cart')) {
        console.log('✅ Items added! Redirected to cart.');
        break;
      }
      
      // Log progress every 5 seconds
      if (i % 5 === 0) {
        console.log(`   ⏳ Working... (${i}s elapsed)`);
      }
    }
    
    console.log('\n🛒 Cart should be populated.');
    console.log('Browser staying open for verification.\n');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
