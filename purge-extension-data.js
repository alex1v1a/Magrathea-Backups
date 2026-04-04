const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Purge HEB Extension Data from Chrome Profile
 * Fixes "private key already exists" error
 */

const PROFILE_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

console.log('🔥 Purging HEB Extension Data from Chrome Profile');
console.log('=' .repeat(50));

// Kill Chrome first
console.log('\n1. Killing Chrome processes...');
exec('taskkill /F /IM chrome.exe 2>nul', () => {
  console.log('   ✅ Chrome killed');
  
  // Directories to purge
  const dirsToPurge = [
    path.join(PROFILE_DIR, 'Default', 'Extensions'),
    path.join(PROFILE_DIR, 'Default', 'Local Extension Settings'),
    path.join(PROFILE_DIR, 'Default', 'Sync Extension Settings'),
    path.join(PROFILE_DIR, 'Default', 'Extension Rules'),
    path.join(PROFILE_DIR, 'Default', 'Extension State'),
    path.join(PROFILE_DIR, 'Default', 'Managed Extension Settings'),
    path.join(PROFILE_DIR, 'Default', 'Secure Preferences'),
    path.join(PROFILE_DIR, 'Default', 'Preferences')
  ];
  
  console.log('\n2. Purging extension directories...');
  let purged = 0;
  
  for (const dir of dirsToPurge) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`   ✅ Purged: ${path.basename(dir)}`);
        purged++;
      } catch (err) {
        console.log(`   ⚠️  Could not purge: ${path.basename(dir)} - ${err.message}`);
      }
    }
  }
  
  // Also purge any extension-related files in the root
  const extFiles = [
    path.join(PROFILE_DIR, 'Default', 'Extension Cookies'),
    path.join(PROFILE_DIR, 'Default', 'Extension Cookies-journal')
  ];
  
  for (const file of extFiles) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`   ✅ Purged: ${path.basename(file)}`);
        purged++;
      } catch {}
    }
  }
  
  console.log(`\n   Total purged: ${purged} items`);
  
  // Reset the extension manifest key
  console.log('\n3. Resetting extension key...');
  const manifestPath = path.join(__dirname, '..', 'dinner-automation', 'heb-extension', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    // Remove key if exists
    delete manifest.key;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('   ✅ Extension key removed from manifest');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ PURGE COMPLETE');
  console.log('='.repeat(50));
  console.log('\n📝 Next steps:');
  console.log('   1. Open Chrome');
  console.log('   2. Go to chrome://extensions/');
  console.log('   3. Enable "Developer mode"');
  console.log('   4. Click "Load unpacked"');
  console.log('   5. Select: dinner-automation/heb-extension/');
  console.log('\n   The extension should now load without errors!');
});
