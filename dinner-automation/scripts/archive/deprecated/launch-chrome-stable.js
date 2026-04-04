const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Chrome Launch - Stability Mode (Crash Fix)');
console.log('='.repeat(60));

// Kill existing Chrome
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  console.log('✅ Killed existing Chrome processes');
} catch {}

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

// Ensure autostart data
const autoStartPath = path.join(EXTENSION_PATH, 'autostart-data.json');
if (!fs.existsSync(autoStartPath)) {
  const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'weekly-plan.json'), 'utf8'));
  const items = [];
  plan.meals.forEach(meal => {
    meal.ingredients.forEach(ing => items.push({ name: ing.name, hebSearch: ing.hebSearch, amount: ing.amount }));
  });
  fs.writeFileSync(autoStartPath, JSON.stringify({ autoStart: true, items, timestamp: new Date().toISOString() }, null, 2));
}

// Clear lock files
try {
  fs.unlinkSync(path.join(MARVIN_PROFILE, 'Default', 'LOCK'));
} catch {}

console.log('\n🚀 Launching Chrome with stability flags...');
console.log('   Profile: Marvin');
console.log('   Flags: --no-sandbox --disable-gpu');
console.log('   Extension: HEB Auto-Cart v1.2.0\n');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--user-data-dir=${MARVIN_PROFILE}`,
  `--load-extension=${EXTENSION_PATH}`,
  '--no-sandbox',           // Prevents sandbox crashes
  '--disable-gpu',          // Prevents GPU crashes
  '--disable-software-rasterizer',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-breakpad',     // Disable crash reporting
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-features=IsolateOrigins,site-per-process',
  '--start-maximized',
  'https://www.heb.com'
];

const cmd = `"${chromePath}" ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;

try {
  // Launch and detach
  execSync(cmd, { 
    stdio: 'ignore',
    timeout: 5000,
    windowsHide: true  // Hide cmd window to prevent Chrome crash
  });
} catch {}

setTimeout(() => {
  try {
    const result = execSync('tasklist | find /C "chrome.exe"', { encoding: 'utf8' });
    const count = parseInt(result.trim());
    if (count > 0) {
      console.log(`✅ Chrome running with ${count} processes (STABILITY MODE)`);
      console.log('\n📋 Extension should auto-start on heb.com');
      console.log('   Look for blue notification banner\n');
      console.log('⚠️  Chrome is in stability mode (--no-sandbox --disable-gpu)');
      console.log('   This prevents crashes but is less secure.');
    } else {
      console.log('❌ Chrome not running');
    }
  } catch {
    console.log('⚠️  Could not verify Chrome status');
  }
}, 5000);
