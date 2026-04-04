#!/usr/bin/env node
/**
 * Stock Manager - Manage Weekly Exclusions and Long-Term Stock
 * 
 * This script manages two separate lists:
 * 
 * 1. WEEKLY EXCLUSIONS (weekly-exclusions.json)
 *    - Items to exclude from THIS WEEK's shopping
 *    - Resets every Saturday at 9 AM with new meal plan
 *    - Use for: "I just bought olive oil, don't need more this week"
 * 
 * 2. LONG-TERM STOCK (long-term-stock.json)
 *    - Pantry staples always kept on hand
 *    - Persists across weekly meal plans
 *    - Use for: "We always keep garlic, onions, and olive oil stocked"
 * 
 * Usage:
 *   node stock-manager.js --list                    Show both lists
 *   node stock-manager.js --weekly-add "Olive oil"  Add to weekly exclusions
 *   node stock-manager.js --weekly-remove "Garlic"  Remove from weekly exclusions
 *   node stock-manager.js --stock-add "Soy sauce"   Add to long-term stock
 *   node stock-manager.js --stock-remove "Ketchup"  Remove from long-term stock
 *   node stock-manager.js --weekly-clear            Clear all weekly exclusions
 */

const fs = require('fs').promises;
const path = require('path');

const DINNER_DATA_DIR = path.join(__dirname, '..', 'data');
const WEEKLY_EXCLUSIONS_FILE = path.join(DINNER_DATA_DIR, 'weekly-exclusions.json');
const LONG_TERM_STOCK_FILE = path.join(DINNER_DATA_DIR, 'long-term-stock.json');

/**
 * Load weekly exclusions
 */
async function loadWeeklyExclusions() {
  try {
    const data = await fs.readFile(WEEKLY_EXCLUSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { description: "", items: [] };
  }
}

/**
 * Save weekly exclusions
 */
async function saveWeeklyExclusions(data) {
  data.lastUpdated = new Date().toISOString();
  await fs.writeFile(WEEKLY_EXCLUSIONS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Load long-term stock
 */
async function loadLongTermStock() {
  try {
    const data = await fs.readFile(LONG_TERM_STOCK_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { categories: {} };
  }
}

/**
 * Save long-term stock
 */
async function saveLongTermStock(data) {
  data.lastUpdated = new Date().toISOString();
  await fs.writeFile(LONG_TERM_STOCK_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add item to weekly exclusions
 */
async function addWeeklyExclusion(itemName, reason = "") {
  const data = await loadWeeklyExclusions();
  
  // Check if already exists
  const exists = data.items.some(item => 
    item.name.toLowerCase() === itemName.toLowerCase()
  );
  
  if (exists) {
    console.log(`⚠️  "${itemName}" is already in weekly exclusions`);
    return false;
  }
  
  // Calculate expiration (next Saturday)
  const now = new Date();
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
  const expiresDate = new Date(now);
  expiresDate.setDate(now.getDate() + daysUntilSaturday);
  
  data.items.push({
    name: itemName,
    reason: reason || "Excluded from this week's shopping",
    addedDate: now.toISOString().split('T')[0],
    expiresDate: expiresDate.toISOString().split('T')[0]
  });
  
  await saveWeeklyExclusions(data);
  console.log(`✅ Added "${itemName}" to weekly exclusions`);
  console.log(`   Expires: ${expiresDate.toDateString()} (resets with new meal plan)`);
  return true;
}

/**
 * Remove item from weekly exclusions
 */
async function removeWeeklyExclusion(itemName) {
  const data = await loadWeeklyExclusions();
  const initialCount = data.items.length;
  
  data.items = data.items.filter(item => 
    item.name.toLowerCase() !== itemName.toLowerCase()
  );
  
  if (data.items.length === initialCount) {
    console.log(`⚠️  "${itemName}" not found in weekly exclusions`);
    return false;
  }
  
  await saveWeeklyExclusions(data);
  console.log(`✅ Removed "${itemName}" from weekly exclusions`);
  return true;
}

/**
 * Clear all weekly exclusions
 */
async function clearWeeklyExclusions() {
  const data = await loadWeeklyExclusions();
  const count = data.items.length;
  
  data.items = [];
  await saveWeeklyExclusions(data);
  
  console.log(`✅ Cleared all ${count} weekly exclusions`);
  console.log(`   New exclusions will be created with next meal plan`);
  return true;
}

/**
 * Add item to long-term stock
 */
async function addLongTermStock(itemName, category = "pantry_staples", notes = "") {
  const data = await loadLongTermStock();
  
  // Find or create category
  if (!data.categories[category]) {
    data.categories[category] = [];
  }
  
  // Check if already exists in any category
  for (const [catName, items] of Object.entries(data.categories)) {
    const exists = items.some(item => 
      item.name.toLowerCase() === itemName.toLowerCase()
    );
    if (exists) {
      console.log(`⚠️  "${itemName}" is already in long-term stock (${catName})`);
      return false;
    }
  }
  
  data.categories[category].push({
    name: itemName,
    notes: notes || "Always keep stocked",
    stockLevel: "medium",
    addedDate: new Date().toISOString().split('T')[0]
  });
  
  await saveLongTermStock(data);
  console.log(`✅ Added "${itemName}" to long-term stock (${category})`);
  console.log(`   This item will be excluded from ALL future meal plans`);
  return true;
}

/**
 * Remove item from long-term stock
 */
async function removeLongTermStock(itemName) {
  const data = await loadLongTermStock();
  let removed = false;
  
  for (const [category, items] of Object.entries(data.categories)) {
    const initialCount = items.length;
    data.categories[category] = items.filter(item => 
      item.name.toLowerCase() !== itemName.toLowerCase()
    );
    
    if (data.categories[category].length < initialCount) {
      removed = true;
      console.log(`✅ Removed "${itemName}" from long-term stock (${category})`);
    }
  }
  
  if (!removed) {
    console.log(`⚠️  "${itemName}" not found in long-term stock`);
    return false;
  }
  
  await saveLongTermStock(data);
  console.log(`   This item will now appear in future meal plans`);
  return true;
}

/**
 * List all stock
 */
async function listStock() {
  const weekly = await loadWeeklyExclusions();
  const longTerm = await loadLongTermStock();
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('📋 WEEKLY EXCLUSIONS (Resets every Saturday 9 AM)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (weekly.items.length === 0) {
    console.log('   No items excluded this week\n');
  } else {
    console.log(`   ${weekly.items.length} items excluded:\n`);
    weekly.items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.name}`);
      console.log(`      Reason: ${item.reason}`);
      console.log(`      Expires: ${item.expiresDate}\n`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🏠 LONG-TERM STOCK (Always kept on hand)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let totalStock = 0;
  for (const [category, items] of Object.entries(longTerm.categories)) {
    if (items.length > 0) {
      console.log(`   📦 ${category.replace(/_/g, ' ').toUpperCase()}`);
      items.forEach(item => {
        console.log(`      • ${item.name} ${item.notes ? `(${item.notes})` : ''}`);
        totalStock++;
      });
      console.log('');
    }
  }
  
  console.log(`   Total: ${totalStock} items in long-term stock\n`);
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('DIFFERENCE BETWEEN LISTS:\n');
  console.log('WEEKLY EXCLUSIONS:');
  console.log('  • Temporary (resets weekly)');
  console.log('  • Use when you just bought something');
  console.log('  • Example: "Bought olive oil yesterday, skip this week"');
  console.log('');
  console.log('LONG-TERM STOCK:');
  console.log('  • Permanent pantry staples');
  console.log('  • Always excluded from meal plans');
  console.log('  • Example: "We always keep garlic on hand"');
  console.log('');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case '--list':
    case '-l':
      await listStock();
      break;
      
    case '--weekly-add':
    case '-wa':
      if (!args[1]) {
        console.log('Usage: --weekly-add "Item Name" ["Reason"]');
        process.exit(1);
      }
      await addWeeklyExclusion(args[1], args[2] || '');
      break;
      
    case '--weekly-remove':
    case '-wr':
      if (!args[1]) {
        console.log('Usage: --weekly-remove "Item Name"');
        process.exit(1);
      }
      await removeWeeklyExclusion(args[1]);
      break;
      
    case '--weekly-clear':
    case '-wc':
      await clearWeeklyExclusions();
      break;
      
    case '--stock-add':
    case '-sa':
      if (!args[1]) {
        console.log('Usage: --stock-add "Item Name" [category] ["Notes"]');
        console.log('Categories: oils_and_vinegars, condiments_and_sauces, spices_and_seasonings, pantry_staples, fresh_produce_always, dairy');
        process.exit(1);
      }
      await addLongTermStock(args[1], args[2] || 'pantry_staples', args[3] || '');
      break;
      
    case '--stock-remove':
    case '-sr':
      if (!args[1]) {
        console.log('Usage: --stock-remove "Item Name"');
        process.exit(1);
      }
      await removeLongTermStock(args[1]);
      break;
      
    default:
      console.log('Stock Manager - Manage Weekly Exclusions and Long-Term Stock\n');
      console.log('USAGE:\n');
      console.log('List all stock:');
      console.log('  node stock-manager.js --list\n');
      console.log('WEEKLY EXCLUSIONS (Temporary - resets Saturday 9 AM):');
      console.log('  Add:    node stock-manager.js --weekly-add "Olive oil" "Just bought"');
      console.log('  Remove: node stock-manager.js --weekly-remove "Garlic"');
      console.log('  Clear:  node stock-manager.js --weekly-clear\n');
      console.log('LONG-TERM STOCK (Permanent pantry staples):');
      console.log('  Add:    node stock-manager.js --stock-add "Soy sauce" condiments_and_sauces');
      console.log('  Remove: node stock-manager.js --stock-remove "Ketchup"\n');
      console.log('DIFFERENCE BETWEEN LISTS:\n');
      console.log('WEEKLY EXCLUSIONS:');
      console.log('  • Temporary - resets every Saturday with new meal plan');
      console.log('  • Use when you recently bought something');
      console.log('  • Example: "Bought olive oil yesterday, don\'t need this week"\n');
      console.log('LONG-TERM STOCK:');
      console.log('  • Permanent - always excluded from meal plans');
      console.log('  • Use for pantry staples you always keep');
      console.log('  • Example: "We always have garlic, onions, salt on hand"\n');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  addWeeklyExclusion,
  removeWeeklyExclusion,
  clearWeeklyExclusions,
  addLongTermStock,
  removeLongTermStock,
  listStock
};
