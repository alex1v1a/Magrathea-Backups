const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Chrome Reinstall - Clean Install');
console.log('='.repeat(70));

// Step 1: Kill Chrome
console.log('\n1. Killing Chrome processes...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
} catch {}

// Step 2: Run Chrome's own uninstaller
console.log('\n2. Running Chrome uninstaller...');
const setupPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.133\\Installer\\setup.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.132\\Installer\\setup.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.134\\Installer\\setup.exe'
];

let uninstalled = false;
for (const setupPath of setupPaths) {
  if (fs.existsSync(setupPath)) {
    console.log(`   Found: ${setupPath}`);
    try {
      execSync(`"${setupPath}" --uninstall --multi-install --chrome --system-level --force-uninstall 2> nul`, { 
        stdio: 'ignore',
        timeout: 120000 
      });
      console.log('   ✅ Uninstalled');
      uninstalled = true;
    } catch {}
    break;
  }
}

if (!uninstalled) {
  console.log('   ⚠️  Uninstaller not found, will delete manually');
}

// Step 3: Manual cleanup
console.log('\n3. Manual cleanup...');
const cleanupPaths = [
  'C:\\Program Files\\Google\\Chrome',
  'C:\\Program Files (x86)\\Google\\Chrome',
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome'),
  path.join(process.env.APPDATA, 'Google', 'Chrome'),
  'C:\\Users\\Admin\\.openclaw\\chrome-*'
];

cleanupPaths.forEach(p => {
  if (p.includes('*')) {
    // Handle glob pattern
    const basePath = p.replace('\\*', '');
    if (fs.existsSync(basePath)) {
      fs.readdirSync(basePath).forEach(f => {
        if (f.startsWith('chrome-')) {
          try {
            fs.rmSync(path.join(basePath, f), { recursive: true, force: true });
            console.log(`   ✅ Removed: ${f}`);
          } catch {}
        }
      });
    }
  } else if (fs.existsSync(p)) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`   ✅ Removed: ${path.basename(p)}`);
    } catch {}
  }
});

// Step 4: Download Chrome using curl (simpler than MSI)
console.log('\n4. Downloading Chrome...');
const downloadUrl = 'https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi';
const downloadPath = path.join(process.env.TEMP, 'ChromeStandalone64.msi');

console.log('   Starting download...');
console.log('   URL:', downloadUrl);

try {
  // Use curl for download
  execSync(`curl -L -o "${downloadPath}" "${downloadUrl}"`, {
    encoding: 'utf8',
    timeout: 300000,
    stdio: 'pipe'
  });
  
  if (fs.existsSync(downloadPath)) {
    const stats = fs.statSync(downloadPath);
    console.log(`   ✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  } else {
    throw new Error('File not created');
  }
} catch (err) {
  console.log('   ❌ Download failed:', err.message);
  console.log('\n   Please manually download from: https://www.google.com/chrome/');
  process.exit(1);
}

// Step 5: Install
console.log('\n5. Installing Chrome...');
console.log('   Please wait (this may take 2-3 minutes)...');

try {
  execSync(`msiexec /i "${downloadPath}" /qn /norestart`, {
    encoding: 'utf8',
    timeout: 300000,
    stdio: 'pipe'
  });
  console.log('   ✅ Installation complete');
} catch (err) {
  console.log('   ⚠️  Installation had issues:', err.message);
  console.log('   Checking if Chrome installed anyway...');
}

// Step 6: Verify
console.log('\n6. Verification...');
setTimeout(() => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  if (!fs.existsSync(chromePath)) {
    console.log('   ❌ Chrome not found after installation');
    console.log('   Manual installation may be required');
    return;
  }
  
  console.log('   ✅ Chrome found at:', chromePath);
  
  // Test launch
  console.log('\n7. Testing Chrome stability...');
  const testProfile = path.join(process.env.TEMP, 'chrome-reinstall-test');
  
  if (fs.existsSync(testProfile)) {
    fs.rmSync(testProfile, { recursive: true, force: true });
  }
  fs.mkdirSync(testProfile, { recursive: true });
  
  const chrome = spawn(chromePath, [
    `--user-data-dir=${testProfile}`,
    '--no-first-run',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ], { detached: true });
  
  console.log(`   Chrome PID: ${chrome.pid}`);
  console.log('   Testing for 20 seconds...\n');
  
  let seconds = 0;
  const interval = setInterval(() => {
    seconds += 4;
    
    try {
      process.kill(chrome.pid, 0);
      console.log(`   ✓ Second ${seconds}: Chrome running`);
    } catch {
      clearInterval(interval);
      console.log(`\n   ✗ Chrome crashed at second ${seconds}`);
      
      if (seconds < 20) {
        console.log('\n⚠️  CHROME STILL UNSTABLE AFTER REINSTALL');
        console.log('   This indicates:');
        console.log('   - Windows system corruption');
        console.log('   - Security software conflict');
        console.log('   - Hardware/driver issue');
        console.log('\n👉 RECOMMENDATION: Use Microsoft Edge');
        console.log('   Edge was working successfully at 7:01 PM');
      }
      return;
    }
    
    if (seconds >= 20) {
      clearInterval(interval);
      console.log('\n   ✅ Chrome stable after reinstall!');
      console.log('\n📋 Next: Setting up Marvin profile and HEB extension');
      try {
        process.kill(chrome.pid);
      } catch {}
      
      // Create Marvin profile
      console.log('\n8. Creating Marvin profile...');
      const marvinProfile = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
      fs.mkdirSync(marvinProfile, { recursive: true });
      fs.writeFileSync(
        path.join(marvinProfile, '.marvin-profile-lock'),
        `Marvin Profile Only\nCreated: ${new Date().toISOString()}\nAccount: 9marvinmartian@gmail.com`
      );
      console.log('   ✅ Marvin profile ready');
    }
  }, 4000);
  
}, 3000);
