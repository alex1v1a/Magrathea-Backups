const fs = require('fs');
const path = require('path');

/**
 * HEB Extension Sync Trigger
 * Updates the HEB Auto Shopper extension with current meal plan
 * Extension handles the actual cart sync using Chrome APIs
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

/**
 * Load shopping list from nested format
 */
function loadShoppingList() {
  try {
    const data = JSON.parse(fs.readFileSync(
      path.join(DATA_DIR, 'heb-extension-items.json'),
      'utf8'
    ));
    
    if (data.shoppingList) {
      const items = [];
      const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
      
      for (const category of categories) {
        if (data.shoppingList[category]) {
          for (const item of data.shoppingList[category]) {
            items.push({
              name: item.item,
              searchTerm: item.searchTerms ? item.searchTerms[0] : item.item
            });
          }
        }
      }
      
      return items;
    }
    
    return data.items || [];
  } catch (e) {
    console.error('❌ Error loading shopping list:', e.message);
    return [];
  }
}

/**
 * Main function - creates trigger for extension
 */
function triggerExtensionSync() {
  console.log('═══════════════════════════════════════');
  console.log('🛒 HEB Extension Sync Trigger');
  console.log('═══════════════════════════════════════\n');
  
  const items = loadShoppingList();
  
  if (items.length === 0) {
    console.log('⚠️  No items in meal plan. Run dinner generator first.');
    process.exit(1);
  }
  
  console.log(`📋 Meal plan: ${items.length} items\n`);
  
  // Create trigger file for extension
  const triggerData = {
    timestamp: Date.now(),
    items: items,
    action: 'sync'
  };
  
  const triggerPath = path.join(EXTENSION_PATH, 'sync-trigger.json');
  
  try {
    fs.writeFileSync(triggerPath, JSON.stringify(triggerData, null, 2));
    console.log('✅ Created sync trigger:', triggerPath);
    console.log('');
    
    console.log('📋 Next Steps:');
    console.log('   1. Open Microsoft Edge');
    console.log('   2. Navigate to https://www.heb.com');
    console.log('   3. Login to HEB if needed');
    console.log('   4. Click the HEB Auto Shopper extension icon');
    console.log('   5. Click "Sync Now" button');
    console.log('');
    console.log('   The extension will:');
    console.log('   - Check current cart items');
    console.log('   - Remove items not in meal plan');
    console.log(`   - Add ${items.length} items from meal plan`);
    console.log('');
    console.log('👋 Trigger created! Use the extension to complete sync.');
    
  } catch (e) {
    console.error('❌ Error creating trigger:', e.message);
    process.exit(1);
  }
}

// Also create items.json for extension to read directly
function createExtensionItemsFile() {
  try {
    const items = loadShoppingList();
    const itemsPath = path.join(EXTENSION_PATH, 'items.json');
    
    fs.writeFileSync(itemsPath, JSON.stringify({ items }, null, 2));
    console.log(`\n📦 Also updated: ${itemsPath}`);
    
  } catch (e) {
    console.error('⚠️  Could not create items.json:', e.message);
  }
}

// Run
triggerExtensionSync();
createExtensionItemsFile();
