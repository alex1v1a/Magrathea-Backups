const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8')).items || [];
  } catch (e) { return []; }
}

async function main() {
  console.log('🛒 VERIFYING HEB CART CONTENTS\n');
  
  const items = loadItems();
  console.log(`📋 Original list: ${items.length} items\n`);
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Go to cart
    console.log('🔍 Checking cart...\n');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    // Extract cart item names
    const cartItems = await page.evaluate(() => {
      const items = [];
      const selectors = [
        '.cart-item .product-name',
        '.cart-item h3',
        '.cart-item h4',
        '[data-testid*="cart"] h3',
        '[data-testid*="cart"] h4',
        '.cart-product-name'
      ];
      
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => {
          if (el.textContent.trim()) {
            items.push(el.textContent.trim().toLowerCase());
          }
        });
      }
      return items;
    });
    
    console.log('='.repeat(60));
    console.log('📊 CART VERIFICATION');
    console.log('='.repeat(60));
    console.log(`\n📦 Items in cart: ${cartItems.length}`);
    console.log('\n✅ CART ITEMS:');
    cartItems.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item}`);
    });
    
    // Find missing items
    console.log('\n❌ MISSING FROM CART:');
    let missingCount = 0;
    
    for (const item of items) {
      const isInCart = cartItems.some(cartItem => 
        cartItem.includes(item.searchTerm.toLowerCase()) ||
        cartItem.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(cartItem)
      );
      
      if (!isInCart) {
        console.log(`   • ${item.name} (searched: "${item.searchTerm}")`);
        missingCount++;
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY: ${cartItems.length}/${items.length} items`);
    console.log(`❌ Missing: ${missingCount} items`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      totalExpected: items.length,
      inCart: cartItems.length,
      missing: missingCount,
      cartItems: cartItems,
      missingItems: items.filter(item => 
        !cartItems.some(cartItem => 
          cartItem.includes(item.searchTerm.toLowerCase()) ||
          cartItem.includes(item.name.toLowerCase())
        )
      ).map(i => i.name)
    };
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'heb-cart-verification.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('💾 Verification saved to heb-cart-verification.json\n');
    
    // Offer to add missing items
    if (missingCount > 0) {
      console.log('🔄 To add missing items, run:');
      console.log('   node dinner-automation/scripts/heb-add-missing-4.js\n');
    }
    
    console.log('⏳ Browser staying open for review');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
