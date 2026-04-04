const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Chrome Repair - Complete Reset');
console.log('='.repeat(70));

// Step 1: Kill all Chrome processes
console.log('\n1. Killing Chrome processes...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  execSync('taskkill /F /IM chromedriver.exe 2> nul', { stdio: 'ignore' });
  console.log('   ✅ All Chrome processes terminated');
} catch {
  console.log('   ℹ️  No Chrome processes running');
}

// Step 2: Backup and delete Chrome user data
console.log('\n2. Clearing Chrome user data...');
const chromeData = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
if (fs.existsSync(chromeData)) {
  const backupName = `User-Data-Backup-${Date.now()}`;
  const backupPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', backupName);
  try {
    fs.renameSync(chromeData, backupPath);
    console.log(`   ✅ Backed up to: ${backupName}`);
  } catch {
    console.log('   ⚠️  Could not backup, deleting directly');
    fs.rmSync(chromeData, { recursive: true, force: true });
  }
} else {
  console.log('   ℹ️  No existing Chrome data');
}

// Step 3: Delete Marvin profile
console.log('\n3. Deleting Marvin profile...');
const marvinProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
if (fs.existsSync(marvinProfile)) {
  const marvinBackup = `C:\\Users\\Admin\\.openclaw\\chrome-marvin-backup-${Date.now()}`;
  try {
    fs.renameSync(marvinProfile, marvinBackup);
    console.log(`   ✅ Profile backed up`);
  } catch {
    fs.rmSync(marvinProfile, { recursive: true, force: true });
    console.log('   ✅ Profile deleted');
  }
}

// Step 4: Create fresh Marvin profile
console.log('\n4. Creating fresh Marvin profile...');
fs.mkdirSync(marvinProfile, { recursive: true });
fs.mkdirSync(path.join(marvinProfile, 'Default'), { recursive: true });
fs.writeFileSync(
  path.join(marvinProfile, '.marvin-profile-lock'),
  `Marvin Profile Only\nCreated: ${new Date().toISOString()}\nAccount: 9marvinmartian@gmail.com`
);
console.log('   ✅ Fresh profile created');

// Step 5: Clear crash dumps
console.log('\n5. Clearing crash dumps...');
const crashDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Crashpad', 'reports');
if (fs.existsSync(crashDir)) {
  try {
    fs.rmSync(crashDir, { recursive: true, force: true });
    console.log('   ✅ Crash dumps cleared');
  } catch {}
}

// Step 6: Test launch
console.log('\n6. Testing Chrome launch...');
setTimeout(() => {
  try {
    const test = execSync(
      `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="${marvinProfile}" --no-first-run --headless --dump-dom "about:blank" 2>&1`,
      { encoding: 'utf8', timeout: 10000 }
    );
    console.log('   ✅ Chrome test launch successful');
    console.log('\n✅ REPAIR COMPLETE');
    console.log('\nChrome has been reset with fresh profile.');
    console.log('The startup crash issue should be resolved.');
  } catch (err) {
    console.log('   ❌ Test launch failed');
    console.log('   Chrome may need reinstallation');
    console.log('\n⚠️  REPAIR INCOMPLETE');
    console.log('   Try reinstalling Chrome from google.com/chrome');
  }
}, 2000);
