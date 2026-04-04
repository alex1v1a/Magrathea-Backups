const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

// Configuration
const CONFIG = {
  hebUrl: 'https://www.heb.com',
  cartUrl: 'https://www.heb.com/cart',
  timeout: 30000,
  retryAttempts: 3,
  delayBetweenItems: 2500
};

// Substitution database for common failures
const SUBSTITUTIONS = {
  'tilapia fillet': ['catfish fillet', 'swai fillet', 'mild white fish'],
  'cod fillet fresh': ['cod fillet', 'pollock fillet', 'haddock fillet'],
  'gochujang': ['sriracha', 'chili garlic sauce'],
  'asian pear': ['bosc pear', 'jicama'],
  'white wine cooking': ['chicken broth', 'apple cider vinegar'],
  'coleslaw mix': ['shredded cabbage', 'broccoli slaw'],
  'capers': ['green olives', 'pickle relish'],
  'chipotle mayo': ['spicy mayo', 'sriracha mayo'],
  'parsley fresh': ['cilantro', 'basil'],
  'thyme fresh': ['oregano', 'rosemary'],
  'sesame seeds': ['chopped peanuts', 'sunflower seeds'],
  'kimchi': ['sauerkraut', 'pickled vegetables']
};

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (e) { 
    console.log('❌ Could not load items');
    return []; 
  }
}

function loadRecipes() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'recipe-database.json'), 'utf8'));
    return data.recipes || [];
  } catch (e) { return []; }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function addItemToCart(page, item, attempt = 1) {
  console.log(`   [Attempt ${attempt}] Adding: ${item.name}`);
  
  try {
    // Navigate to HEB
    await page.goto(CONFIG.hebUrl, { timeout: CONFIG.timeout });
    await delay(2000);
    
    // Find search box with multiple selectors
    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[placeholder*="Search"]',
      'input[aria-label*="Search"]',
      '[data-testid*="search"] input'
    ];
    
    let searchBox = null;
    for (const selector of searchSelectors) {
      searchBox = await page.locator(selector).first();
      if (await searchBox.isVisible().catch(() => false)) break;
      searchBox = null;
    }
    
    if (!searchBox) {
      console.log('      ⚠️ Search box not found');
      return false;
    }
    
    // Clear and type search term
    await searchBox.fill('');
    await searchBox.fill(item.searchTerm);
    await searchBox.press('Enter');
    await delay(3000);
    
    // Look for add button with multiple strategies
    const addSelectors = [
      'button:has-text("Add")',
      'button[data-testid*="add"]',
      'button.add-to-cart',
      '[data-automation-id*="add"]'
    ];
    
    for (const selector of addSelectors) {
      const addBtn = await page.locator(selector).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await delay(2000);
        console.log('      ✅ Added successfully');
        return true;
      }
    }
    
    console.log('      ❌ Add button not found');
    return false;
    
  } catch (error) {
    console.log(`      ❌ Error: ${error.message.substring(0, 50)}`);
    if (attempt < CONFIG.retryAttempts) {
      console.log(`      🔄 Retrying...`);
      await delay(2000);
      return addItemToCart(page, item, attempt + 1);
    }
    return false;
  }
}

async function runHEBAutomation() {
  console.log('🛒 ============================================');
  console.log('🛒 HEB CART AUTOMATION - FULL WORKFLOW');
  console.log('🛒 ============================================\n');
  
  const items = loadItems();
  if (items.length === 0) {
    console.log('❌ No items to add. Exiting.');
    return { success: false, error: 'No items' };
  }
  
  console.log(`📋 Loading ${items.length} items from meal plan\n`);
  
  // Launch browser
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  const results = {
    success: true,
    itemsAdded: [],
    itemsFailed: [],
    itemsSubstituted: [],
    timestamp: new Date().toISOString()
  };
  
  try {
    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\n[${i + 1}/${items.length}] ${item.name} (${item.amount})`);
      
      const added = await addItemToCart(page, item);
      
      if (added) {
        results.itemsAdded.push(item);
      } else {
        // Try substitution
        const subKey = Object.keys(SUBSTITUTIONS).find(k => 
          item.searchTerm.toLowerCase().includes(k.toLowerCase())
        );
        
        if (subKey) {
          const subItem = SUBSTITUTIONS[subKey][0];
          console.log(`      🔄 Trying substitution: ${subItem}`);
          
          const subAdded = await addItemToCart(page, {
            ...item,
            name: subItem,
            searchTerm: subItem
          });
          
          if (subAdded) {
            results.itemsSubstituted.push({
              original: item.name,
              substitution: subItem
            });
          } else {
            results.itemsFailed.push(item);
          }
        } else {
          results.itemsFailed.push(item);
        }
      }
      
      await delay(CONFIG.delayBetweenItems);
    }
    
    // Check final cart
    console.log('\n🔍 Checking final cart...');
    await page.goto(CONFIG.cartUrl);
    await delay(5000);
    
    const cartItems = await page.locator('.cart-item, [data-testid*="cart-item"]').count().catch(() => 0);
    console.log(`\n📦 Items in cart: ${cartItems}`);
    
    // Save results
    results.cartCount = cartItems;
    results.finalCount = results.itemsAdded.length + results.itemsSubstituted.length;
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'heb-automation-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 AUTOMATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Added: ${results.itemsAdded.length}`);
    console.log(`🔄 Substituted: ${results.itemsSubstituted.length}`);
    console.log(`❌ Failed: ${results.itemsFailed.length}`);
    console.log(`📦 Cart total: ${cartItems} items`);
    
    if (results.itemsSubstituted.length > 0) {
      console.log('\n🔄 Substitutions:');
      results.itemsSubstituted.forEach(s => {
        console.log(`   ${s.original} → ${s.substitution}`);
      });
    }
    
    console.log('='.repeat(60));
    
    // Sync calendar
    console.log('\n📅 Syncing calendar...');
    exec('node marvin-dash/scripts/calendar-sync.js', () => {});
    
    // Update recipes
    console.log('📝 Updating recipes with substitutions...');
    updateRecipes(results.itemsSubstituted);
    
    console.log('\n✅ Workflow complete!');
    console.log('   Cart is ready for checkout.\n');
    
    // Keep browser open for review
    await delay(10000);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    results.success = false;
    results.error = error.message;
  }
  
  return results;
}

function updateRecipes(substitutions) {
  try {
    const recipes = loadRecipes();
    let updated = 0;
    
    for (const recipe of recipes) {
      if (!recipe.ingredients) continue;
      
      for (const sub of substitutions) {
        const idx = recipe.ingredients.findIndex(ing => 
          ing.toLowerCase().includes(sub.original.toLowerCase())
        );
        
        if (idx >= 0) {
          recipe.ingredients[idx] = recipe.ingredients[idx].replace(
            new RegExp(sub.original, 'gi'),
            `${sub.substitution} (sub for ${sub.original})`
          );
          updated++;
        }
      }
    }
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'recipe-database-updated.json'),
      JSON.stringify({ recipes }, null, 2)
    );
    
    console.log(`   ✅ Updated ${updated} recipe ingredients`);
  } catch (e) {
    console.log('   ⚠️ Could not update recipes:', e.message);
  }
}

// Run
runHEBAutomation()
  .then(results => {
    process.exit(results.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
