const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Chrome Complete Reset - Fresh Profile');
console.log('=' .repeat(50));

// Step 1: Kill Chrome
console.log('\n1. Killing Chrome...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  console.log('   ✅ Done');
} catch {}

// Step 2: Backup and remove old profile
const oldProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const backupProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-backup-' + Date.now();
const newProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

console.log('\n2. Backing up old profile...');
if (fs.existsSync(oldProfile)) {
  try {
    fs.renameSync(oldProfile, backupProfile);
    console.log(`   ✅ Backed up to: ${path.basename(backupProfile)}`);
  } catch (err) {
    console.log('   ⚠️  Could not backup, deleting instead');
    fs.rmSync(oldProfile, { recursive: true, force: true });
  }
}

// Step 3: Create fresh profile
console.log('\n3. Creating fresh profile...');
fs.mkdirSync(newProfile, { recursive: true });
console.log('   ✅ Created');

// Step 4: Create lock file
fs.writeFileSync(
  path.join(newProfile, '.marvin-profile-lock'),
  `Marvin Profile Only\nCreated: ${new Date().toISOString()}\nAccount: 9marvinmartian@gmail.com`
);

// Step 5: Update scripts to use new profile
console.log('\n4. Updating scripts...');
const scriptsDir = path.join(__dirname, '..', 'scripts');
const scripts = [
  'facebook-marketplace-chrome.js',
  'heb-cart-chrome.js',
  'heb-cart-stable.js'
];

let updated = 0;
for (const script of scripts) {
  const scriptPath = path.join(scriptsDir, script);
  if (fs.existsSync(scriptPath)) {
    let content = fs.readFileSync(scriptPath, 'utf8');
    // Ensure profile path is correct
    content = content.replace(
      /CHROME_USER_DATA\s*=\s*['"`][^'"`]+['"`]/,
      `CHROME_USER_DATA = '${newProfile.replace(/\\/g, '\\\\')}'`
    );
    fs.writeFileSync(scriptPath, content);
    updated++;
  }
}
console.log(`   ✅ Updated ${updated} scripts`);

// Step 6: Launch Chrome with fresh profile
console.log('\n5. Testing fresh profile launch...');
const { spawn } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(chromePath, [
  `--user-data-dir=${newProfile}`,
  '--start-maximized',
  '--no-first-run',
  '--no-default-browser-check',
  'https://www.heb.com'
], {
  detached: true,
  stdio: 'ignore'
});

chrome.on('error', (err) => {
  console.error('   ❌ Launch failed:', err.message);
});

chrome.on('spawn', () => {
  console.log('   ✅ Chrome launched with fresh profile!');
  console.log('\n' + '='.repeat(50));
  console.log('✅ RESET COMPLETE');
  console.log('='.repeat(50));
  console.log('\n📝 Next:');
  console.log('1. Check Chrome window - it should be open');
  console.log('2. Log into HEB if needed');
  console.log('3. Load extension: chrome://extensions/ → Load unpacked');
  console.log('4. Select: dinner-automation/heb-extension/');
  console.log('5. Go to heb.com and click 🛒 icon');
});

setTimeout(() => {
  console.log('\n⏳ Check if Chrome window is visible...');
  process.exit(0);
}, 8000);
