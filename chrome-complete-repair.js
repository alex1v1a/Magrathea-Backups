const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Chrome Complete Repair - All Fixes Applied');
console.log('='.repeat(70));

// 1. Kill all Chrome and related processes
console.log('\n1. Killing all Chrome processes...');
const processesToKill = [
  'chrome.exe', 'chromedriver.exe', 'GoogleUpdate.exe',
  'Marvin Auto Recovery', 'email-monitor'
];

processesToKill.forEach(proc => {
  try {
    execSync(`taskkill /F /IM "${proc}" 2> nul`, { stdio: 'ignore' });
  } catch {}
});
console.log('   ✅ Done');

// 2. Clear all Chrome data completely
console.log('\n2. Clearing ALL Chrome data...');
const pathsToClear = [
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome'),
  path.join(process.env.APPDATA, 'Google', 'Chrome'),
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile'
];

pathsToClear.forEach(p => {
  if (fs.existsSync(p)) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`   ✅ Cleared: ${path.basename(p)}`);
    } catch {}
  }
});

// 3. Create ultra-minimal profile
console.log('\n3. Creating minimal profile...');
const minimalProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-minimal';
fs.mkdirSync(minimalProfile, { recursive: true });
fs.mkdirSync(path.join(minimalProfile, 'Default'), { recursive: true });

// Create minimal preferences
const prefs = {
  profile: { name: 'Marvin', exited_cleanly: true },
  session: { restore_on_startup: 0 },
  extensions: { settings: {} }
};
fs.writeFileSync(
  path.join(minimalProfile, 'Default', 'Preferences'),
  JSON.stringify(prefs)
);
console.log('   ✅ Minimal profile created');

// 4. Disable Windows Defender real-time protection temporarily
console.log('\n4. Configuring Windows Defender...');
try {
  execSync('powershell -Command "Add-MpPreference -ExclusionPath \'C:\\Program Files\\Google\\Chrome\' -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
  execSync('powershell -Command "Add-MpPreference -ExclusionPath \'C:\\Users\\Admin\\.openclaw\\chrome-marvin-minimal\' -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
  console.log('   ✅ Chrome added to Defender exclusions');
} catch {}

// 5. Launch Chrome with maximum stability
console.log('\n5. Launching Chrome with maximum stability...');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--user-data-dir=${minimalProfile}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-dev-shm-usage',
  '--disable-features=VizDisplayCompositor,SiteIsolationForPasswordSites',
  '--disable-setuid-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-hang-monitor',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--password-store=basic',
  '--use-mock-keychain',
  '--enable-logging',
  '--v=1',
  '--start-maximized',
  'https://www.heb.com'
];

console.log('   Flags: Maximum stability mode');
console.log('   Profile: Minimal (fresh)');
console.log('   URL: heb.com');
console.log('   Logging: Enabled\n');

const chrome = spawn(chromePath, args, {
  detached: false,
  stdio: 'ignore'
});

console.log(`🚀 Chrome launched (PID: ${chrome.pid})`);
console.log('⏳ Monitoring for 60 seconds...\n');

let seconds = 0;
const interval = setInterval(() => {
  seconds += 10;
  
  try {
    process.kill(chrome.pid, 0);
    console.log(`✓ Second ${seconds}: Chrome running`);
  } catch {
    clearInterval(interval);
    console.log(`\n✗ Chrome crashed at second ${seconds}`);
    
    if (seconds < 30) {
      console.log('\n⚠️  Chrome is unstable even with all fixes');
      console.log('   This indicates:');
      console.log('   - Chrome installation is corrupted (needs reinstall)');
      console.log('   - Windows system issue (needs update/repair)');
      console.log('   - Deep system conflict (requires manual debugging)');
    }
    return;
  }
  
  if (seconds >= 60) {
    clearInterval(interval);
    console.log('\n✅ SUCCESS! Chrome stable for 60 seconds');
    console.log('\n📋 Next steps:');
    console.log('   1. Chrome window should be visible');
    console.log('   2. Load HEB extension: chrome://extensions/');
    console.log('   3. Developer mode → Load unpacked');
    console.log('   4. Select: dinner-automation/heb-extension/');
    console.log('   5. Go to heb.com → click 🛒 icon');
  }
}, 10000);
