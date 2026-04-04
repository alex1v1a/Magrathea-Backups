const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');

console.log('🔧 Chrome Crash Recovery - Marvin Profile');
console.log('=' .repeat(50));

// Step 1: Kill any existing Chrome processes
console.log('\n1. Killing existing Chrome processes...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  console.log('   ✅ Chrome processes terminated');
} catch {
  console.log('   ℹ️  No Chrome processes running');
}

// Step 2: Clear problematic profile files
console.log('\n2. Clearing profile cache/cookies (keeping login)...');
const dirsToClear = [
  'Default/Cache',
  'Default/Code Cache',
  'Default/GPUCache',
  'Default/Service Worker',
  'ShaderCache',
  'GrShaderCache'
];

let cleared = 0;
for (const dir of dirsToClear) {
  const fullPath = path.join(MARVIN_PROFILE, dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      cleared++;
    } catch {}
  }
}
console.log(`   ✅ Cleared ${cleared} cache directories`);

// Step 3: Check extension
console.log('\n3. Verifying extension...');
const extFiles = ['manifest.json', 'content.js', 'background.js'];
let extOk = true;
for (const file of extFiles) {
  if (!fs.existsSync(path.join(EXTENSION_PATH, file))) {
    console.log(`   ❌ Missing: ${file}`);
    extOk = false;
  }
}
if (extOk) console.log('   ✅ Extension files present');

// Step 4: Create fresh launch script
console.log('\n4. Creating safe launch configuration...');
const launcherContent = `@echo off
echo ==========================================
echo    Chrome - Marvin Profile (Safe Mode)
echo ==========================================
echo.

:: Kill any existing Chrome
taskkill /F /IM chrome.exe 2> nul

timeout /t 2 /nobreak > nul

:: Launch with minimal flags
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --user-data-dir="C:\Users\Admin\.openclaw\chrome-marvin-only-profile" ^
  --load-extension="C:\Users\Admin\.openclaw\workspace\dinner-automation\heb-extension" ^
  --start-maximized ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-gpu ^
  --disable-software-rasterizer ^
  https://www.heb.com

echo.
echo Chrome launching in safe mode...
echo Look for the window and click the HEB extension icon.
pause
`;

fs.writeFileSync('launch-chrome-safe.bat', launcherContent);
console.log('   ✅ Created: launch-chrome-safe.bat');

console.log('\n' + '='.repeat(50));
console.log('🔧 Recovery complete!');
console.log('='.repeat(50));
console.log('\nNext steps:');
console.log('1. Run: .\\launch-chrome-safe.bat');
console.log('2. Or manually open Chrome and load extension');
console.log('3. Navigate to heb.com');
console.log('4. Click the 🛒 HEB Auto-Cart icon');
console.log('\nIf still crashing, the profile may need full reset.');
