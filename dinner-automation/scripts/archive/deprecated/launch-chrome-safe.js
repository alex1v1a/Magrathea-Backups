const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

console.log('🛒 Chrome Safe Launch - Marvin Profile');
console.log('=' .repeat(50));

// Kill existing Chrome first
try {
  require('child_process').execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  console.log('✅ Killed existing Chrome');
} catch {}

setTimeout(() => {
  console.log('🚀 Launching Chrome...');
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    `--user-data-dir=${MARVIN_PROFILE}`,
    `--load-extension=${EXTENSION_PATH}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'https://www.heb.com'
  ];
  
  const chrome = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  });
  
  chrome.on('error', (err) => {
    console.error('❌ Launch failed:', err.message);
  });
  
  chrome.on('spawn', () => {
    console.log('✅ Chrome launched successfully!');
    console.log('   Profile: Marvin (9marvinmartian@gmail.com)');
    console.log('   Extension: HEB Auto-Cart v1.2.0');
    console.log('\n⏳ Wait for Chrome window, then click 🛒 icon');
  });
  
  setTimeout(() => process.exit(0), 5000);
}, 2000);
