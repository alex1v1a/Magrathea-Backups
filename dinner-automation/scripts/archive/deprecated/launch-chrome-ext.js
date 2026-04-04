const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Chrome Launcher - With Extension');
console.log('='.repeat(60));

// Kill existing Chrome
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
} catch {}

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

// Ensure extension autostart data exists
const autoStartPath = path.join(EXTENSION_PATH, 'autostart-data.json');
if (!fs.existsSync(autoStartPath)) {
  const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'weekly-plan.json'), 'utf8'));
  const items = [];
  plan.meals.forEach(meal => {
    meal.ingredients.forEach(ing => {
      items.push({ name: ing.name, hebSearch: ing.hebSearch, amount: ing.amount });
    });
  });
  fs.writeFileSync(autoStartPath, JSON.stringify({ autoStart: true, items, timestamp: new Date().toISOString() }, null, 2));
}

// Clear problematic files
const filesToClear = [
  path.join(MARVIN_PROFILE, 'Default', 'LOCK'),
  path.join(MARVIN_PROFILE, 'Default', 'GPUCache'),
  path.join(MARVIN_PROFILE, 'Default', 'Code Cache'),
  path.join(MARVIN_PROFILE, 'Crashpad', 'reports')
];

filesToClear.forEach(f => {
  try {
    if (fs.existsSync(f)) {
      fs.rmSync(f, { recursive: true, force: true });
    }
  } catch {}
});

console.log('🚀 Launching Chrome with extension...\n');

// Build command
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--user-data-dir=${MARVIN_PROFILE}`,
  `--load-extension=${EXTENSION_PATH}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-breakpad',  // Disable crash reporting
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-extensions-file-access-check',
  '--disable-hang-monitor',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--no-default-browser-check',
  '--password-store=basic',
  '--use-mock-keychain',
  '--start-maximized',
  'https://www.heb.com'
];

const cmd = `"${chromePath}" ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;

console.log('Command:', cmd.substring(0, 100) + '...\n');

try {
  // Use exec to launch in background
  execSync(cmd, { 
    stdio: 'ignore',
    timeout: 5000
  });
} catch {}

setTimeout(() => {
  try {
    const result = execSync('tasklist | find /C "chrome.exe"', { encoding: 'utf8' });
    const count = parseInt(result.trim());
    if (count > 0) {
      console.log(`✅ Chrome running with ${count} processes`);
      console.log('\n📋 The extension should auto-start when you visit heb.com');
      console.log('   Look for blue notification: "🚀 Starting: 44 items"');
    } else {
      console.log('❌ Chrome not running - may have crashed');
    }
  } catch {
    console.log('⚠️  Could not verify Chrome status');
  }
}, 3000);
