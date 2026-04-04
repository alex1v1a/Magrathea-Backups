// Trigger HEB Extension Sync
// Sends message to extension background script to start cart sync

const fs = require('fs');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

console.log('🛒 Triggering HEB Extension Sync...\n');

// Verify items.json exists and has data
try {
  const itemsPath = path.join(EXTENSION_PATH, 'items.json');
  const data = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  
  if (!data.items || data.items.length === 0) {
    console.log('❌ No items in items.json');
    process.exit(1);
  }
  
  console.log(`✅ items.json verified: ${data.items.length} items`);
  console.log('');
  
} catch (e) {
  console.log('❌ Error reading items.json:', e.message);
  process.exit(1);
}

// Create trigger file that extension monitors
const triggerData = {
  action: 'manualSync',
  timestamp: Date.now(),
  source: 'cli'
};

const triggerPath = path.join(EXTENSION_PATH, 'sync-trigger.json');
fs.writeFileSync(triggerPath, JSON.stringify(triggerData, null, 2));

console.log('📋 Extension sync triggered!');
console.log('');
console.log('Next steps:');
console.log('1. Open Microsoft Edge');
console.log('2. Navigate to https://www.heb.com (login if needed)');
console.log('3. Click the HEB Auto Shopper extension icon');
console.log('4. Click "Sync Now"');
console.log('');
console.log(`The extension will add all items to cart.`);
console.log('👋 Done!');
