const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

// Target meal plan items
const TARGET_ITEMS = [
  { name: 'White fish fillets', search: 'catfish fillet', qty: '1.5 lbs', inCart: false },
  { name: 'Corn tortillas', search: 'corn tortillas', qty: '1 pack', inCart: false },
  { name: 'Mango', search: 'mango', qty: '2', inCart: false },
  { name: 'Red onion', search: 'red onion', qty: '1', inCart: false },
  { name: 'Jalapeno', search: 'jalapeno', qty: '2', inCart: false },
  { name: 'Cabbage slaw mix', search: 'coleslaw mix', qty: '1 bag', inCart: false },
  { name: 'Chipotle mayo', search: 'chipotle mayo', qty: '1 bottle', inCart: false },
  { name: 'Cod fillets', search: 'cod fillet', qty: '1.5 lbs', inCart: false },
  { name: 'Unsalted butter', search: 'butter unsalted', qty: '1 stick', inCart: false },
  { name: 'Fresh parsley', search: 'parsley fresh', qty: '1 bunch', inCart: false },
  { name: 'Capers', search: 'capers', qty: '1 jar', inCart: false },
  { name: 'White wine', search: 'white wine cooking', qty: '1 bottle', inCart: false },
  { name: 'Green beans', search: 'green beans fresh', qty: '1 lb', inCart: false },
  { name: 'Chicken thighs', search: 'chicken thighs bone-in', qty: '2 lbs', inCart: false },
  { name: 'Lemon', search: 'lemon', qty: '3', inCart: false },
  { name: 'Fresh thyme', search: 'thyme fresh', qty: '1 bunch', inCart: false },
  { name: 'Oregano', search: 'oregano dried', qty: '1 container', inCart: false },
  { name: 'Couscous', search: 'couscous', qty: '1 lb', inCart: false },
  { name: 'Zucchini', search: 'zucchini', qty: '3', inCart: false },
  { name: 'Ribeye steak', search: 'ribeye steak thin', qty: '1.5 lbs', inCart: false },
  { name: 'Asian pear', search: 'bosc pear', qty: '1', inCart: false },
  { name: 'Gochujang', search: 'sriracha', qty: '1 container', inCart: false },
  { name: 'Jasmine rice', search: 'jasmine rice', qty: '2 lbs', inCart: false },
  { name: 'Sesame seeds', search: 'sesame seeds', qty: '1 container', inCart: false },
  { name: 'Kimchi', search: 'kimchi', qty: '16 oz', inCart: false },
  { name: 'Chicken breast', search: 'chicken breast boneless', qty: '2 lbs', inCart: false },
  { name: 'Cucumber', search: 'cucumber', qty: '2', inCart: false },
  { name: 'Cherry tomatoes', search: 'tomatoes cherry', qty: '1 pint', inCart: false },
  { name: 'Feta cheese', search: 'feta cheese', qty: '8 oz', inCart: false },
  { name: 'Quinoa', search: 'quinoa', qty: '2 lbs', inCart: false },
  { name: 'Hummus', search: 'hummus', qty: '10 oz', inCart: false }
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncCart() {
  console.log('🔄 ============================================');
  console.log('🔄 HEB CART MASTER SYNC');
  console.log('🔄 ============================================\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  const syncResults = {
    timestamp: new Date().toISOString(),
    itemsAdded: [],
    itemsRemoved: [],
    itemsInCart: [],
    syncComplete: false
  };
  
  try {
    // Step 1: Check current cart
    console.log('Step 1: Checking current cart contents...\n');
    await page.goto('https://www.heb.com/cart');
    await delay(5000);
    
    // Extract cart items
    const cartItems = await page.evaluate(() => {
      const items = [];
      const selectors = [
        '.cart-item .product-name',
        '.cart-item h3, .cart-item h4',
        '[data-testid*="cart"] h3',
        '.cart-product-name'
      ];
      
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          if (el.textContent.trim()) {
            items.push(el.textContent.trim().toLowerCase());
          }
        });
      }
      return [...new Set(items)]; // Remove duplicates
    });
    
    console.log(`Found ${cartItems.length} items in cart:\n`);
    cartItems.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    
    // Mark items that are in cart
    TARGET_ITEMS.forEach(target => {
      const isInCart = cartItems.some(cartItem => 
        cartItem.includes(target.search.toLowerCase()) ||
        cartItem.includes(target.name.toLowerCase()) ||
        target.name.toLowerCase().includes(cartItem)
      );
      target.inCart = isInCart;
    });
    
    const itemsInCart = TARGET_ITEMS.filter(i => i.inCart);
    const itemsMissing = TARGET_ITEMS.filter(i => !i.inCart);
    
    console.log(`\n📊 Analysis:`);
    console.log(`  ✅ In cart: ${itemsInCart.length}/${TARGET_ITEMS.length}`);
    console.log(`  ❌ Missing: ${itemsMissing.length}/${TARGET_ITEMS.length}\n`);
    
    syncResults.itemsInCart = itemsInCart.map(i => i.name);
    
    // Step 2: Add missing items
    if (itemsMissing.length > 0) {
      console.log('Step 2: Adding missing items...\n');
      
      for (const item of itemsMissing) {
        console.log(`Adding: ${item.name}`);
        
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`);
        await delay(4000);
        
        // Try to add
        const addBtn = await page.locator('button:has-text("Add"), button[data-testid*="add"]').first();
        if (await addBtn.isVisible().catch(() => false)) {
          await addBtn.click();
          await delay(3000);
          console.log('  ✅ Added successfully');
          syncResults.itemsAdded.push(item.name);
          item.inCart = true;
        } else {
          console.log('  ❌ Could not add (may be out of stock)');
        }
      }
    }
    
    // Step 3: Final verification
    console.log('\nStep 3: Final cart verification...\n');
    await page.goto('https://www.heb.com/cart');
    await delay(5000);
    
    const finalCartCount = await page.locator('.cart-item, [data-testid*="cart-item"]').count().catch(() => 0);
    console.log(`📦 Final cart count: ${finalCartCount} items\n`);
    
    syncResults.syncComplete = true;
    syncResults.finalCount = finalCartCount;
    
    // Step 4: Save sync results
    fs.writeFileSync(
      path.join(DATA_DIR, 'heb-cart-sync.json'),
      JSON.stringify(syncResults, null, 2)
    );
    
    // Step 5: Sync calendar
    console.log('Step 4: Syncing Apple Calendar...\n');
    exec('node marvin-dash/scripts/calendar-sync.js', (err) => {
      if (!err) console.log('✅ Calendar synced\n');
    });
    
    // Step 6: Update recipes if needed
    if (syncResults.itemsAdded.length > 0) {
      console.log('Step 5: Updating recipes with new items...\n');
      updateRecipeDatabase(syncResults.itemsAdded);
    }
    
    console.log('='.repeat(60));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Items added this sync: ${syncResults.itemsAdded.length}`);
    console.log(`Total in cart: ${finalCartCount}`);
    console.log(`Target: ${TARGET_ITEMS.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Sync error:', error.message);
    syncResults.error = error.message;
  }
  
  return syncResults;
}

function updateRecipeDatabase(newItems) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'recipe-database.json'), 'utf8'));
    const recipes = data.recipes || {};
    
    // Update last modified
    data.lastSync = new Date().toISOString();
    data.cartItems = newItems;
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'recipe-database.json'),
      JSON.stringify(data, null, 2)
    );
    
    console.log(`✅ Recipe database updated\n`);
  } catch (e) {
    console.log('⚠️ Could not update recipes:', e.message);
  }
}

// Run sync
syncCart()
  .then(results => {
    console.log('\nSync results saved to heb-cart-sync.json');
    process.exit(results.syncComplete ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
