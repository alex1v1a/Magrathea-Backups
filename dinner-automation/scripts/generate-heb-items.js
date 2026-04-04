const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadWeeklyPlan() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'weekly-plan.json'), 'utf8'));
  } catch (e) {
    console.error('❌ Could not load weekly plan:', e.message);
    return null;
  }
}

function loadStockLists() {
  const longTermStock = { categories: {} };
  const weeklyExclusions = { items: [] };
  
  try {
    const stockData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'long-term-stock.json'), 'utf8'));
    Object.assign(longTermStock.categories, stockData.categories || {});
  } catch (e) {
    console.log('⚠️  Could not load long-term stock');
  }
  
  try {
    const exclusionData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'weekly-exclusions.json'), 'utf8'));
    weeklyExclusions.items = exclusionData.items || [];
  } catch (e) {
    console.log('⚠️  Could not load weekly exclusions');
  }
  
  return { longTermStock, weeklyExclusions };
}

function getAllStockItems(stockLists) {
  const items = new Set();
  
  // Add all long-term stock items
  for (const category of Object.values(stockLists.longTermStock.categories)) {
    if (Array.isArray(category)) {
      for (const item of category) {
        items.add(item.name.toLowerCase());
      }
    }
  }
  
  // Add weekly exclusions
  for (const item of stockLists.weeklyExclusions.items) {
    items.add(item.name.toLowerCase());
  }
  
  return items;
}

function isInStock(ingredientName, stockItems) {
  const name = ingredientName.toLowerCase();
  
  for (const stockItem of stockItems) {
    // Exact match
    if (name === stockItem) return true;
    // Contains match (e.g., "fresh asparagus" contains "asparagus")
    if (name.includes(stockItem) || stockItem.includes(name)) return true;
  }
  
  return false;
}

function generateHEBItems() {
  console.log('🔄 Generating HEB Shopping List with Stock Exclusions\n');
  
  const plan = loadWeeklyPlan();
  if (!plan) {
    console.error('❌ Cannot proceed without weekly plan');
    process.exit(1);
  }
  
  const stockLists = loadStockLists();
  const stockItems = getAllStockItems(stockLists);
  
  console.log(`📦 Loaded ${stockItems.size} stock/excluded items`);
  console.log(`🍽️  Current meal plan: ${plan.meals?.length || 0} meals\n`);
  
  const hebItems = [];
  const excludedItems = [];
  
  for (const meal of (plan.meals || [])) {
    console.log(`Processing: ${meal.name}`);
    
    for (const ingredient of (meal.ingredients || [])) {
      if (isInStock(ingredient.name, stockItems)) {
        console.log(`  ❌ Excluded: ${ingredient.name}`);
        excludedItems.push({
          name: ingredient.name,
          meal: meal.name,
          reason: 'In stock/excluded'
        });
      } else {
        console.log(`  ✅ Added: ${ingredient.name}`);
        hebItems.push({
          name: ingredient.name,
          searchTerm: ingredient.hebSearch || ingredient.name,
          amount: ingredient.amount,
          meal: meal.name,
          status: 'pending'
        });
      }
    }
    console.log('');
  }
  
  // Remove duplicates by name
  const uniqueItems = [];
  const seen = new Set();
  for (const item of hebItems) {
    if (!seen.has(item.name.toLowerCase())) {
      seen.add(item.name.toLowerCase());
      uniqueItems.push(item);
    }
  }
  
  // Save to file
  const output = {
    timestamp: new Date().toISOString(),
    itemCount: uniqueItems.length,
    excludedCount: excludedItems.length,
    items: uniqueItems,
    excluded: excludedItems
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'heb-extension-items.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log('📊 Summary:');
  console.log(`  ✅ Items to buy: ${uniqueItems.length}`);
  console.log(`  ❌ Excluded (in stock): ${excludedItems.length}`);
  console.log(`  💰 Total ingredients processed: ${hebItems.length + excludedItems.length}\n`);
  
  console.log('📁 Saved to: heb-extension-items.json\n');
  
  // Also update extension meal plan
  const extensionPlan = {
    timestamp: new Date().toISOString(),
    weekOf: plan.weekOf,
    meals: plan.meals?.map(m => ({
      day: m.day,
      name: m.name,
      category: m.category,
      ingredients: m.ingredients?.map(i => i.name) || []
    })) || []
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'heb-extension-meal-plan.json'),
    JSON.stringify(extensionPlan, null, 2)
  );
  
  console.log('📁 Meal plan saved to: heb-extension-meal-plan.json\n');
}

generateHEBItems();
