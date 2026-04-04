const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Load data
function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8')).items || [];
  } catch (e) { return []; }
}

function loadCartResults() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-cart-results.json'), 'utf8'));
  } catch (e) { return { itemsAdded: [], itemsFailed: [] }; }
}

// Substitution database
const SUBSTITUTIONS = {
  'tilapia fillet': ['catfish fillet', 'cod fillet', 'swai fillet', 'mild white fish'],
  'gochujang': ['sriracha', 'chili garlic sauce', 'hot sauce', 'kimchi base'],
  'asian pear': ['bosc pear', 'jicama', 'apple', 'regular pear'],
  'white wine cooking': ['chicken broth', 'apple cider vinegar', 'rice vinegar'],
  'coleslaw mix': ['shredded cabbage', 'broccoli slaw', 'lettuce'],
  'capers': ['green olives', 'pickle relish', 'lemon juice'],
  'chipotle mayo': ['spicy mayo', 'mayonnaise + hot sauce', 'sriracha mayo'],
  'parsley fresh': ['cilantro', 'basil', 'green onion'],
  'thyme fresh': ['oregano', 'rosemary', 'italian seasoning'],
  'sesame seeds': ['chopped peanuts', 'sunflower seeds', 'omit'],
  'kimchi': ['sauerkraut', 'pickled vegetables', 'omit']
};

async function main() {
  console.log('🛒 HEB Cart - Auto Check & Substitution\n');
  
  const items = loadItems();
  const results = loadCartResults();
  
  console.log(`📋 Original list: ${items.length} items`);
  
  // Launch browser to check cart
  const context = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized']
  });
  
  const page = await context.newPage();
  
  try {
    // Check cart
    console.log('\n🔍 Checking cart...');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    // Extract cart items
    const cartItems = await page.evaluate(() => {
      const items = [];
      const rows = document.querySelectorAll('.cart-item, [data-testid*="cart-item"], .cart-product');
      rows.forEach(row => {
        const nameEl = row.querySelector('.product-name, [data-testid*="name"], h3, h4');
        if (nameEl) {
          items.push(nameEl.textContent.trim().toLowerCase());
        }
      });
      return items;
    });
    
    console.log(`✅ Found ${cartItems.length} items in cart\n`);
    
    // Identify missing items
    const missing = [];
    const found = [];
    
    for (const item of items) {
      const isInCart = cartItems.some(cartItem => 
        cartItem.includes(item.searchTerm.toLowerCase()) ||
        item.searchTerm.toLowerCase().includes(cartItem) ||
        cartItem.includes(item.name.toLowerCase())
      );
      
      if (isInCart) {
        found.push(item);
      } else {
        missing.push(item);
      }
    }
    
    console.log('='.repeat(60));
    console.log('📊 CART ANALYSIS');
    console.log('='.repeat(60));
    console.log(`✅ Found: ${found.length} items`);
    console.log(`❌ Missing: ${missing.length} items\n`);
    
    if (missing.length > 0) {
      console.log('❌ MISSING ITEMS:');
      missing.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.name} (searched: "${item.searchTerm}")`);
        
        // Suggest substitution
        const subs = SUBSTITUTIONS[item.searchTerm.toLowerCase()];
        if (subs) {
          console.log(`      💡 Substitution: ${subs.join(', ')}`);
        }
      });
      
      console.log('\n🔄 ADDING SUBSTITUTIONS...\n');
      
      // Add substitutions to cart
      for (const item of missing) {
        const subs = SUBSTITUTIONS[item.searchTerm.toLowerCase()];
        if (subs && subs[0] !== 'omit') {
          const subItem = subs[0];
          console.log(`   Adding substitution for "${item.name}": ${subItem}`);
          
          // Search and add substitution
          await page.goto('https://www.heb.com');
          await page.waitForTimeout(2000);
          
          const searchInput = await page.locator('input[type="search"], input[name="q"]').first();
          if (searchInput) {
            await searchInput.fill(subItem);
            await searchInput.press('Enter');
            await page.waitForTimeout(3000);
            
            // Try to add first result
            const addBtn = await page.locator('button:has-text("Add"), [data-testid*="add"]').first();
            if (await addBtn.isVisible().catch(() => false)) {
              await addBtn.click();
              console.log('      ✅ Added');
              await page.waitForTimeout(2000);
            } else {
              console.log('      ❌ Not found');
            }
          }
        } else {
          console.log(`   Excluding "${item.name}" - no suitable substitution`);
        }
      }
    }
    
    // Final cart check
    console.log('\n🔍 Final cart check...');
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    const finalCart = await page.evaluate(() => {
      return document.querySelectorAll('.cart-item, [data-testid*="cart-item"]').length;
    });
    
    console.log(`\n📦 Final cart: ${finalCart} items`);
    console.log('\n✅ Cart check complete!');
    
    // Save results
    const finalResults = {
      timestamp: new Date().toISOString(),
      originalCount: items.length,
      foundCount: found.length,
      missingCount: missing.length,
      finalCount: finalCart,
      missing: missing.map(m => m.name),
      substitutions: missing.filter(m => SUBSTITUTIONS[m.searchTerm.toLowerCase()]).map(m => ({
        original: m.name,
        substituted: SUBSTITUTIONS[m.searchTerm.toLowerCase()]?.[0] || 'excluded'
      }))
    };
    
    fs.writeFileSync(path.join(DATA_DIR, 'heb-cart-final.json'), JSON.stringify(finalResults, null, 2));
    console.log('💾 Results saved to heb-cart-final.json');
    
    console.log('\n⏳ Browser staying open for review');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
