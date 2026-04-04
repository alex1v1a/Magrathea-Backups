const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MARVIN_PROFILE = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data\\Marvin';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

console.log('🛒 Launching Chrome + HEB Extension (Marvin Profile)');
console.log('=' .repeat(50));

// Verify autostart data exists
const autoStartPath = path.join(EXTENSION_PATH, 'autostart-data.json');
if (fs.existsSync(autoStartPath)) {
  const data = JSON.parse(fs.readFileSync(autoStartPath, 'utf8'));
  console.log(`✅ Autostart ready: ${data.items?.length || 0} items`);
} else {
  console.log('⚠️  No autostart data');
}

const chromePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const args = [
  `--user-data-dir=${MARVIN_PROFILE}`,
  `--load-extension=${EXTENSION_PATH}`,
  '--start-maximized',
  '--no-first-run',
  'https://www.heb.com'
];

console.log('🚀 Starting Chrome...\n');

const chrome = spawn(chromePath, args, { 
  detached: true,
  stdio: 'ignore'
});

chrome.on('error', (err) => {
  console.error('❌ Failed:', err.message);
});

chrome.on('spawn', () => {
  console.log('✅ Chrome launched!');
  console.log('   Profile: Marvin (9marvinmartian@gmail.com)');
  console.log('   Extension: HEB Auto-Cart v1.2.0');
  console.log('   URL: heb.com');
  console.log('\n📋 The extension will auto-start in 5 seconds');
  console.log('   Look for blue notification banner\n');
  
  setTimeout(() => {
    console.log('👍 Chrome should be running with automation active');
    process.exit(0);
  }, 3000);
});

chrome.unref();
