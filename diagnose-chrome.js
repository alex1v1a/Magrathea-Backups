const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Chrome Crash Diagnostics');
console.log('='.repeat(60));

// 1. Check Chrome installation
console.log('\n1. Checking Chrome installation...');
try {
  const version = execSync('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --version', { encoding: 'utf8' });
  console.log('   ✅ Chrome:', version.trim());
} catch {
  console.log('   ❌ Chrome not found at expected location');
}

// 2. Check for crash dumps
console.log('\n2. Checking for crash dumps...');
const crashPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Crashpad', 'reports');
if (fs.existsSync(crashPath)) {
  const dumps = fs.readdirSync(crashPath).filter(f => f.endsWith('.dmp'));
  console.log(`   📁 Crash dumps found: ${dumps.length}`);
  if (dumps.length > 0) {
    console.log(`   Latest: ${dumps.sort().pop()}`);
  }
} else {
  console.log('   ℹ️  No crash dump directory');
}

// 3. Test with temp profile
console.log('\n3. Testing with temporary profile...');
const tempProfile = path.join(process.env.TEMP, 'chrome-test-' + Date.now());
fs.mkdirSync(tempProfile, { recursive: true });

console.log('   🧪 Launching Chrome with temp profile...');
try {
  execSync(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="${tempProfile}" --no-first-run --headless --dump-dom "about:blank"`, {
    encoding: 'utf8',
    timeout: 10000
  });
  console.log('   ✅ Chrome launched successfully with temp profile');
} catch (err) {
  console.log('   ❌ Chrome failed with temp profile:', err.message);
}

// 4. Check Marvin profile for corruption
console.log('\n4. Checking Marvin profile...');
const marvinProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
if (fs.existsSync(marvinProfile)) {
  const lockFile = path.join(marvinProfile, 'SingletonLock');
  if (fs.existsSync(lockFile)) {
    console.log('   ⚠️  Lock file exists (Chrome may think it\'s already running)');
    try {
      fs.unlinkSync(lockFile);
      console.log('   ✅ Lock file removed');
    } catch {}
  }
  
  // Check Default folder
  const defaultFolder = path.join(marvinProfile, 'Default');
  if (fs.existsSync(defaultFolder)) {
    const prefsPath = path.join(defaultFolder, 'Preferences');
    if (fs.existsSync(prefsPath)) {
      try {
        const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
        console.log('   ✅ Preferences file valid');
      } catch {
        console.log('   ❌ Preferences file corrupted!');
      }
    }
  }
} else {
  console.log('   ℹ️  Marvin profile does not exist');
}

// 5. Kill all Chrome processes
console.log('\n5. Cleaning up Chrome processes...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  execSync('taskkill /F /IM chromedriver.exe 2> nul', { stdio: 'ignore' });
  console.log('   ✅ All Chrome processes killed');
} catch {}

console.log('\n' + '='.repeat(60));
console.log('Diagnostics complete.');

// Cleanup
setTimeout(() => {
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch {}
}, 1000);
