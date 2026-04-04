/**
 * HEB Auto-Cart Launcher
 * Fully automatic Chrome launcher with extension
 * Usage: node heb-auto-launcher.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_DIR = path.join(__dirname, '..', 'heb-extension');
const WEEKLY_PLAN_PATH = path.join(__dirname, '..', 'data', 'weekly-plan.json');

// Chrome paths
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser'
];

function findChrome() {
  for (const chromePath of CHROME_PATHS) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  throw new Error('Chrome not found. Please install Google Chrome.');
}

function loadWeeklyPlan() {
  try {
    if (!fs.existsSync(WEEKLY_PLAN_PATH)) {
      console.error('❌ Weekly plan not found:', WEEKLY_PLAN_PATH);
      return null;
    }
    
    const data = fs.readFileSync(WEEKLY_PLAN_PATH, 'utf8');
    const plan = JSON.parse(data);
    
    // Extract items from meal plan
    const items = [];
    const seen = new Set();
    
    if (plan.meals && Array.isArray(plan.meals)) {
      for (const meal of plan.meals) {
        if (!meal.ingredients) continue;
        
        for (const ingredient of meal.ingredients) {
          const searchTerm = ingredient.hebSearch || ingredient.name || ingredient;
          const name = ingredient.name || searchTerm;
          const amount = ingredient.amount || '1';
          
          const key = searchTerm.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          
          items.push({
            name: name,
            searchTerm: searchTerm,
            amount: amount,
            status: 'pending'
          });
        }
      }
    }
    
    console.log(`✅ Loaded ${items.length} items from weekly plan`);
    return items;
  } catch (error) {
    console.error('❌ Error loading weekly plan:', error.message);
    return null;
  }
}

function saveItemsForExtension(items) {
  // Save to extension's storage location
  const extensionStorageDir = path.join(USER_DATA_DIR, 'Default', 'Local Extension Settings');
  
  // Create storage data that the extension will read
  const storageData = {
    items: items,
    isRunning: false,
    autoStart: true,
    timestamp: Date.now()
  };
  
  // Write to a file that content script can fetch
  const autoStartPath = path.join(EXTENSION_DIR, 'autostart-data.json');
  fs.writeFileSync(autoStartPath, JSON.stringify(storageData, null, 2));
  
  console.log('✅ Saved items for extension auto-start');
  return autoStartPath;
}

function launchChromeWithExtension() {
  const chromePath = findChrome();
  const extensionDir = path.resolve(EXTENSION_DIR);
  
  // Ensure user data dir exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
  
  // Build Chrome command
  const args = [
    `--user-data-dir="${USER_DATA_DIR}"`,
    `--load-extension="${extensionDir}"`,
    `--disable-extensions-except="${extensionDir}"`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    'https://www.heb.com'
  ];
  
  const cmd = `"${chromePath}" ${args.join(' ')}`;
  
  console.log('🚀 Launching Chrome with HEB Auto-Cart extension...');
  console.log('📂 User data:', USER_DATA_DIR);
  console.log('🔧 Extension:', extensionDir);
  
  const child = exec(cmd, (error) => {
    if (error) {
      console.error('❌ Chrome launch error:', error.message);
      process.exit(1);
    }
  });
  
  child.unref();
  
  console.log('\n✅ Chrome launched!');
  console.log('🛒 The extension will auto-start when HEB.com loads');
  console.log('⏳ Keep Chrome open until all items are added');
  console.log('\n💡 Tips:');
  console.log('   - Make sure you\'re logged into HEB.com');
  console.log('   - Don\'t close Chrome during the automation');
  console.log('   - A notification will show when complete');
}

// Main
console.log('═══════════════════════════════════════════');
console.log('   🛒 HEB Auto-Cart - Fully Automatic');
console.log('═══════════════════════════════════════════\n');

const items = loadWeeklyPlan();
if (!items || items.length === 0) {
  console.error('❌ No items to add. Please check weekly-plan.json');
  process.exit(1);
}

saveItemsForExtension(items);
launchChromeWithExtension();

console.log('\n🎉 Done! Chrome is launching...');
