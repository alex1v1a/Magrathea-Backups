/**
 * HEB Auto-Launcher Module
 * Fully automatic Chrome extension launcher for HEB cart
 * Integrates with dinner automation
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_DIR = path.join(__dirname, '..', 'heb-extension');

// Chrome paths
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
];

function findChrome() {
  for (const chromePath of CHROME_PATHS) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  throw new Error('Chrome not found');
}

/**
 * Extract items from weekly plan
 */
function extractItems(weeklyPlan) {
  const items = [];
  const seen = new Set();
  
  if (weeklyPlan.meals && Array.isArray(weeklyPlan.meals)) {
    for (const meal of weeklyPlan.meals) {
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
  
  return items;
}

/**
 * Save items for extension auto-start
 */
function saveAutoStartData(items) {
  const data = {
    items: items,
    isRunning: false,
    autoStart: true,
    timestamp: Date.now()
  };
  
  const autoStartPath = path.join(EXTENSION_DIR, 'autostart-data.json');
  fs.writeFileSync(autoStartPath, JSON.stringify(data, null, 2));
  return autoStartPath;
}

/**
 * Launch Chrome with extension
 */
function launchChrome() {
  return new Promise((resolve, reject) => {
    try {
      const chromePath = findChrome();
      const extensionDir = path.resolve(EXTENSION_DIR);
      
      // Ensure user data dir exists
      if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
      }
      
      const args = [
        `--user-data-dir="${USER_DATA_DIR}"`,
        `--load-extension="${extensionDir}"`,
        `--disable-extensions-except="${extensionDir}"`,
        '--no-first-run',
        '--no-default-browser-check',
        '--start-maximized',
        'https://www.heb.com'
      ];
      
      console.log('🚀 Launching Chrome with HEB Auto-Cart...');
      
      const child = spawn(chromePath, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true  // Hide cmd window to prevent Chrome crash
      });
      
      child.unref();
      
      resolve({
        success: true,
        pid: child.pid,
        profileDir: USER_DATA_DIR
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main launch function
 */
async function launch(weeklyPlan) {
  try {
    const items = extractItems(weeklyPlan);
    
    if (items.length === 0) {
      return { success: false, error: 'No items to add' };
    }
    
    saveAutoStartData(items);
    const result = await launchChrome();
    
    return {
      success: true,
      itemCount: items.length,
      ...result
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Launch and wait for user to complete (for CLI use)
 */
async function launchAndWait(weeklyPlan) {
  const result = await launch(weeklyPlan);
  
  if (!result.success) {
    return result;
  }
  
  console.log(`\n✅ Launched Chrome with ${result.itemCount} items ready to auto-add`);
  console.log('⏳ Chrome will automatically start adding items when HEB.com loads');
  console.log('\n💡 Keep Chrome open until all items are added');
  console.log('   A notification will appear when complete\n');
  
  return result;
}

module.exports = {
  launch,
  launchAndWait,
  extractItems
};

// CLI usage
if (require.main === module) {
  const weeklyPlanPath = process.argv[2] || path.join(__dirname, '..', 'data', 'weekly-plan.json');
  
  if (!fs.existsSync(weeklyPlanPath)) {
    console.error('❌ Weekly plan not found:', weeklyPlanPath);
    process.exit(1);
  }
  
  const plan = JSON.parse(fs.readFileSync(weeklyPlanPath, 'utf8'));
  launchAndWait(plan).then(result => {
    if (result.success) {
      console.log('🎉 Auto-launcher ready!');
    } else {
      console.error('❌ Failed:', result.error);
      process.exit(1);
    }
  });
}
