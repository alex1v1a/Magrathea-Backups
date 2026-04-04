const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const WEEKLY_PLAN = path.join(__dirname, '..', 'data', 'weekly-plan.json');

// Ensure extension has autostart data
const plan = JSON.parse(fs.readFileSync(WEEKLY_PLAN, 'utf8'));
const items = [];
plan.meals.forEach(meal => {
  meal.ingredients.forEach(ing => {
    items.push({ name: ing.name, hebSearch: ing.hebSearch, amount: ing.amount });
  });
});

const autoStartPath = path.join(EXTENSION_PATH, 'autostart-data.json');
fs.writeFileSync(autoStartPath, JSON.stringify({ autoStart: true, items, timestamp: new Date().toISOString() }, null, 2));

console.log('🛒 Launching Chrome with HEB Auto-Cart v1.2.0');
console.log(`📦 ${items.length} items ready to add\n`);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--user-data-dir=${USER_DATA_DIR}`,
  `--load-extension=${EXTENSION_PATH}`,
  '--start-maximized',
  'https://www.heb.com'
];

console.log('🚀 Starting Chrome...');
console.log('⏳ Chrome will open in a new window');
console.log('📋 The extension will auto-start when you click its icon\n');

const chrome = spawn(chromePath, args, { detached: true, stdio: 'ignore' });

chrome.on('error', (err) => {
  console.error('❌ Failed to start Chrome:', err.message);
});

chrome.on('spawn', () => {
  console.log('✅ Chrome launched successfully!');
  console.log('   Look for the 🛒 icon in your Chrome toolbar');
  console.log('   Click it to start adding items to your HEB cart\n');
  console.log('⏳ This window will close in 5 seconds...');
  
  setTimeout(() => {
    console.log('👋 Done! Check your Chrome window.');
    process.exit(0);
  }, 5000);
});

// Unref so parent can exit
chrome.unref();
