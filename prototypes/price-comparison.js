/**
 * Price Tracking Prototype
 * 
 * Manual price entry with trend tracking
 * Since no reliable grocery APIs exist, this provides:
 * - Price entry interface
 * - Historical price charts
 * - Sale alerts
 * - Store comparison
 * 
 * Usage:
 *   node prototypes/price-comparison.js --add "Olive Oil" 12.99 HEB
 *   node prototypes/price-comparison.js --check "Olive Oil"
 *   node prototypes/price-comparison.js --report
 *   node prototypes/price-comparison.js --alerts
 */

const fs = require('fs').promises;
const path = require('path');

const PRICE_DB_FILE = path.join(__dirname, '..', 'dinner-automation', 'data', 'price-database.json');
const ALERTS_FILE = path.join(__dirname, '..', 'dinner-automation', 'data', 'price-alerts.json');

// Known stores
const STORES = ['HEB', 'Walmart', 'Target', 'Costco', 'Whole Foods', 'Sprouts'];

// Staple items to track
const STAPLE_ITEMS = [
  'Olive Oil',
  'Chicken Breast',
  'Ground Beef',
  'Eggs',
  'Milk',
  'Butter',
  'Rice',
  'Pasta',
  'Bread',
  'Cheese',
  'Yogurt',
  'Bananas',
  'Apples',
  'Onions',
  'Garlic',
  'Tomatoes',
  'Potatoes',
  'Carrots',
  'Spinach',
  'Lettuce'
];

/**
 * Load price database
 */
async function loadPriceDatabase() {
  try {
    const data = await fs.readFile(PRICE_DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { items: {}, lastUpdated: null };
  }
}

/**
 * Save price database
 */
async function savePriceDatabase(db) {
  db.lastUpdated = new Date().toISOString();
  await fs.writeFile(PRICE_DB_FILE, JSON.stringify(db, null, 2));
}

/**
 * Load alerts
 */
async function loadAlerts() {
  try {
    const data = await fs.readFile(ALERTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save alerts
 */
async function saveAlerts(alerts) {
  await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

/**
 * Add price entry
 */
async function addPrice(item, price, store, unit = 'item') {
  const db = await loadPriceDatabase();
  
  const itemKey = item.toLowerCase().trim();
  
  if (!db.items[itemKey]) {
    db.items[itemKey] = {
      name: item,
      prices: {},
      history: []
    };
  }
  
  const entry = {
    price: parseFloat(price),
    unit,
    date: new Date().toISOString(),
    store: store.toUpperCase()
  };
  
  // Update current price for store
  db.items[itemKey].prices[store.toUpperCase()] = entry;
  
  // Add to history
  db.items[itemKey].history.push(entry);
  
  await savePriceDatabase(db);
  
  // Check for price drop alerts
  await checkPriceAlert(itemKey, entry);
  
  return entry;
}

/**
 * Check if price drop should trigger alert
 */
async function checkPriceAlert(itemKey, newEntry) {
  const db = await loadPriceDatabase();
  const item = db.items[itemKey];
  
  if (!item || item.history.length < 2) return;
  
  // Get previous price from same store
  const storeHistory = item.history
    .filter(h => h.store === newEntry.store)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (storeHistory.length >= 2) {
    const previous = storeHistory[1];
    const dropPercent = ((previous.price - newEntry.price) / previous.price) * 100;
    
    if (dropPercent >= 15) { // 15% or more drop
      const alerts = await loadAlerts();
      alerts.push({
        type: 'price_drop',
        item: item.name,
        store: newEntry.store,
        oldPrice: previous.price,
        newPrice: newEntry.price,
        dropPercent: Math.round(dropPercent),
        date: new Date().toISOString(),
        notified: false
      });
      await saveAlerts(alerts);
      
      console.log(`🚨 PRICE DROP ALERT: ${item.name} at ${newEntry.store}`);
      console.log(`   Was: $${previous.price} → Now: $${newEntry.price} (${Math.round(dropPercent)}% off!)`);
    }
  }
}

/**
 * Get best price for item
 */
async function getBestPrice(item) {
  const db = await loadPriceDatabase();
  const itemKey = item.toLowerCase().trim();
  
  const itemData = db.items[itemKey];
  if (!itemData) {
    return null;
  }
  
  const prices = Object.entries(itemData.prices)
    .map(([store, data]) => ({ store, ...data }))
    .sort((a, b) => a.price - b.price);
  
  if (prices.length === 0) return null;
  
  const best = prices[0];
  const savings = prices.length > 1 
    ? prices[prices.length - 1].price - best.price 
    : 0;
  
  return {
    item: itemData.name,
    bestStore: best.store,
    bestPrice: best.price,
    allPrices: prices,
    savingsVsWorst: savings,
    lastUpdated: best.date
  };
}

/**
 * Generate price trend for item
 */
async function getPriceTrend(item) {
  const db = await loadPriceDatabase();
  const itemKey = item.toLowerCase().trim();
  
  const itemData = db.items[itemKey];
  if (!itemData || itemData.history.length < 2) {
    return null;
  }
  
  const sorted = itemData.history.sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const change = last.price - first.price;
  const changePercent = (change / first.price) * 100;
  
  // Calculate average by store
  const byStore = {};
  for (const entry of sorted) {
    if (!byStore[entry.store]) byStore[entry.store] = [];
    byStore[entry.store].push(entry.price);
  }
  
  const averages = {};
  for (const [store, prices] of Object.entries(byStore)) {
    averages[store] = prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  
  return {
    item: itemData.name,
    dataPoints: sorted.length,
    firstPrice: first.price,
    lastPrice: last.price,
    change,
    changePercent,
    trend: change < 0 ? 'decreasing' : change > 0 ? 'increasing' : 'stable',
    byStore: averages,
    history: sorted.slice(-10) // Last 10 entries
  };
}

/**
 * Generate comparison report
 */
async function generateReport() {
  const db = await loadPriceDatabase();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              Price Comparison Report                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const items = Object.values(db.items);
  
  if (items.length === 0) {
    console.log('No price data yet. Add some with:');
    console.log('  node price-comparison.js --add "Item Name" 9.99 HEB\n');
    return;
  }
  
  console.log(`Tracking ${items.length} items\n`);
  
  // Find best deals (biggest savings)
  const deals = [];
  for (const item of items) {
    const stores = Object.entries(item.prices);
    if (stores.length >= 2) {
      const prices = stores.map(([_, data]) => data.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      deals.push({
        item: item.name,
        savings: max - min,
        bestStore: stores.find(([_, d]) => d.price === min)[0],
        bestPrice: min
      });
    }
  }
  
  deals.sort((a, b) => b.savings - a.savings);
  
  console.log('💰 Biggest Savings Opportunities:');
  console.log('─────────────────────────────────────────');
  for (const deal of deals.slice(0, 5)) {
    console.log(`${deal.item.padEnd(25)} Save $${deal.savings.toFixed(2)} at ${deal.bestStore} ($${deal.bestPrice})`);
  }
  
  console.log('\n📊 Price Tracking Summary:');
  console.log('─────────────────────────────────────────');
  
  for (const item of items.slice(0, 10)) {
    const stores = Object.keys(item.prices).length;
    const latest = Object.values(item.prices)[0];
    console.log(`${item.name.padEnd(25)} ${stores} stores | Latest: $${latest.price} at ${latest.store}`);
  }
  
  if (items.length > 10) {
    console.log(`...and ${items.length - 10} more items`);
  }
  
  console.log('');
}

/**
 * Display price history for item
 */
async function showHistory(item) {
  const trend = await getPriceTrend(item);
  
  if (!trend) {
    console.log(`No price history found for "${item}"`);
    return;
  }
  
  console.log(`\n📈 Price History: ${trend.item}\n`);
  console.log(`Trend: ${trend.trend.toUpperCase()}`);
  console.log(`Change: $${Math.abs(trend.change).toFixed(2)} (${trend.changePercent.toFixed(1)}%)`);
  console.log(`\nStore Averages:`);
  
  for (const [store, avg] of Object.entries(trend.byStore)) {
    console.log(`  ${store.padEnd(12)} $${avg.toFixed(2)}`);
  }
  
  console.log(`\nRecent History:`);
  console.log('─────────────────────────────────────────');
  for (const entry of trend.history) {
    const date = new Date(entry.date).toLocaleDateString();
    console.log(`${date}  ${entry.store.padEnd(10)}  $${entry.price.toFixed(2)}`);
  }
  
  console.log('');
}

/**
 * Generate shopping list with best prices
 */
async function generateShoppingList(items) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           Optimized Shopping List                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const storeMap = {};
  let totalSavings = 0;
  let totalCost = 0;
  
  for (const item of items) {
    const best = await getBestPrice(item);
    
    if (best) {
      const store = best.bestStore;
      if (!storeMap[store]) storeMap[store] = [];
      storeMap[store].push(best);
      totalSavings += best.savingsVsWorst;
      totalCost += best.bestPrice;
    } else {
      console.log(`⚠️ No price data for: ${item}`);
    }
  }
  
  // Print by store
  for (const [store, items] of Object.entries(storeMap)) {
    console.log(`\n🏪 ${store}:`);
    console.log('─────────────────────────────────────────');
    let storeTotal = 0;
    for (const item of items) {
      console.log(`  ${item.item.padEnd(25)} $${item.bestPrice.toFixed(2)}`);
      storeTotal += item.bestPrice;
    }
    console.log(`  ${'TOTAL'.padStart(25)} $${storeTotal.toFixed(2)}`);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`Total Cost: $${totalCost.toFixed(2)}`);
  console.log(`Potential Savings: $${totalSavings.toFixed(2)}`);
  console.log('');
}

/**
 * Show active alerts
 */
async function showAlerts() {
  const alerts = await loadAlerts();
  const unnotified = alerts.filter(a => !a.notified);
  
  if (unnotified.length === 0) {
    console.log('\n✅ No active price alerts\n');
    return;
  }
  
  console.log('\n🚨 Active Price Alerts:');
  console.log('─────────────────────────────────────────\n');
  
  for (const alert of unnotified) {
    console.log(`${alert.item}`);
    console.log(`  ${alert.store}: $${alert.oldPrice} → $${alert.newPrice} (${alert.dropPercent}% OFF!)`);
    console.log('');
    alert.notified = true;
  }
  
  await saveAlerts(alerts);
}

/**
 * CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--add' && args.length >= 4) {
    const item = args[1];
    const price = args[2];
    const store = args[3];
    const unit = args[4] || 'item';
    
    await addPrice(item, price, store, unit);
    console.log(`✓ Added: ${item} at $${price} from ${store}`);
    
  } else if (args[0] === '--check' && args[1]) {
    const best = await getBestPrice(args[1]);
    if (best) {
      console.log(`\nBest price for ${best.item}:`);
      console.log(`  $${best.bestPrice} at ${best.bestStore}`);
      if (best.savingsVsWorst > 0) {
        console.log(`  Save $${best.savingsVsWorst.toFixed(2)} vs most expensive`);
      }
      console.log('');
    } else {
      console.log(`No price data for "${args[1]}"`);
    }
    
  } else if (args[0] === '--history' && args[1]) {
    await showHistory(args[1]);
    
  } else if (args[0] === '--report') {
    await generateReport();
    
  } else if (args[0] === '--alerts') {
    await showAlerts();
    
  } else if (args[0] === '--shop' && args[1]) {
    const items = args[1].split(',').map(s => s.trim());
    await generateShoppingList(items);
    
  } else if (args[0] === '--staples') {
    console.log('\nSuggested staple items to track:\n');
    for (let i = 0; i < STAPLE_ITEMS.length; i++) {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${STAPLE_ITEMS[i]}`);
    }
    console.log('');
    
  } else {
    console.log('Price Comparison Tracker\n');
    console.log('Usage:');
    console.log('  --add "Item Name" 9.99 HEB [unit]   Add price entry');
    console.log('  --check "Item Name"                  Check best price');
    console.log('  --history "Item Name"                Show price history');
    console.log('  --report                             Full comparison report');
    console.log('  --alerts                             Show price drop alerts');
    console.log('  --shop "item1,item2,item3"           Generate optimized list');
    console.log('  --staples                            List suggested items');
    console.log('');
    console.log('Example:');
    console.log('  node price-comparison.js --add "Olive Oil" 12.99 HEB');
    console.log('  node price-comparison.js --check "Olive Oil"');
    console.log('  node price-comparison.js --shop "Chicken,Eggs,Milk"');
    console.log('');
    
    // Show current data summary
    const db = await loadPriceDatabase();
    const itemCount = Object.keys(db.items).length;
    if (itemCount > 0) {
      console.log(`Currently tracking ${itemCount} items`);
      console.log(`Last updated: ${db.lastUpdated ? new Date(db.lastUpdated).toLocaleString() : 'never'}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

// Export for use in other scripts
module.exports = {
  addPrice,
  getBestPrice,
  getPriceTrend,
  STAPLE_ITEMS
};
