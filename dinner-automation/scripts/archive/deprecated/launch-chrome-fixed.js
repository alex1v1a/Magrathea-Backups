const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

console.log('🔧 Chrome Launcher - Marvin Profile (Crash Fix)');
console.log('='.repeat(60));

// Step 1: Kill all Chrome processes
console.log('\n1. Killing all Chrome processes...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  execSync('taskkill /F /IM chromedriver.exe 2> nul', { stdio: 'ignore' });
  console.log('   ✅ Done');
} catch {}

// Step 2: Clear lock files
console.log('\n2. Clearing lock files...');
const lockFiles = [
  path.join(MARVIN_PROFILE, 'SingletonLock'),
  path.join(MARVIN_PROFILE, 'lockfile'),
  path.join(MARVIN_PROFILE, 'Default', 'LOCK')
];

lockFiles.forEach(lock => {
  try {
    if (fs.existsSync(lock)) {
      fs.unlinkSync(lock);
      console.log(`   ✅ Removed: ${path.basename(lock)}`);
    }
  } catch {}
});

// Step 3: Clear GPU cache (common crash cause)
console.log('\n3. Clearing GPU cache...');
const gpuCache = path.join(MARVIN_PROFILE, 'Default', 'GPUCache');
if (fs.existsSync(gpuCache)) {
  try {
    fs.rmSync(gpuCache, { recursive: true, force: true });
    console.log('   ✅ GPU cache cleared');
  } catch {}
}

// Step 4: Launch Chrome
console.log('\n4. Launching Chrome...');
console.log('   Profile: Marvin (9marvinmartian@gmail.com)');
console.log('   URL: https://www.heb.com');
console.log('   Window: Visible (NORMAL)');

setTimeout(() => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  // Use spawn with detached: false to keep window visible
  const chrome = spawn(chromePath, [
    `--user-data-dir=${MARVIN_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',  // Disable GPU to prevent crashes
    '--disable-software-rasterizer',
    'https://www.heb.com'
  ], {
    detached: false,
    stdio: 'ignore',
    windowsHide: true  // Hide cmd window to prevent Chrome crash
  });
  
  chrome.on('error', (err) => {
    console.error('\n❌ Launch failed:', err.message);
  });
  
  chrome.on('spawn', () => {
    console.log('\n✅ Chrome launched successfully!');
    console.log('   Process ID:', chrome.pid);
    console.log('\n📋 Next steps:');
    console.log('   1. Look for Chrome window (check taskbar/Alt+Tab)');
    console.log('   2. Go to chrome://extensions/');
    console.log('   3. Enable Developer mode');
    console.log('   4. Load unpacked: dinner-automation/heb-extension/');
    console.log('   5. Go to heb.com → click 🛒 icon');
  });
  
  // Monitor for crash
  chrome.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\n⚠️  Chrome exited with code ${code}`);
    }
  });
  
  setTimeout(() => {
    console.log('\n⏳ Check your screen now - Chrome should be visible');
  }, 5000);
  
}, 2000);
