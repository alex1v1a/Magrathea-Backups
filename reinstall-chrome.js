const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

console.log('🔧 Chrome Reinstallation');
console.log('='.repeat(70));

// Step 1: Uninstall Chrome
console.log('\n1. Uninstalling Chrome...');
try {
  // Try to uninstall via Windows
  execSync('wmic product where "name like \'Google Chrome%\'" call uninstall 2> nul', { 
    stdio: 'ignore',
    timeout: 60000 
  });
  console.log('   ✅ Chrome uninstalled via WMI');
} catch {
  console.log('   ℹ️  WMI uninstall failed, trying alternative...');
  try {
    // Alternative: Use setup.exe to uninstall
    const setupPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.133\\Installer\\setup.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\144.0.7559.133\\Installer\\setup.exe'
    ];
    let uninstalled = false;
    for (const setupPath of setupPaths) {
      if (fs.existsSync(setupPath)) {
        execSync(`"${setupPath}" --uninstall --multi-install --chrome --system-level 2> nul`, { 
          stdio: 'ignore',
          timeout: 60000 
        });
        console.log('   ✅ Chrome uninstalled via setup.exe');
        uninstalled = true;
        break;
      }
    }
    if (!uninstalled) {
      console.log('   ⚠️  Could not find Chrome installer, manual removal needed');
    }
  } catch {}
}

// Step 2: Clean up remaining files
console.log('\n2. Cleaning up Chrome files...');
const pathsToClean = [
  'C:\\Program Files\\Google\\Chrome',
  'C:\\Program Files (x86)\\Google\\Chrome',
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome'),
  path.join(process.env.APPDATA, 'Google', 'Chrome'),
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile',
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-minimal'
];

pathsToClean.forEach(p => {
  if (fs.existsSync(p)) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`   ✅ Removed: ${p}`);
    } catch {}
  }
});

// Step 3: Download Chrome
console.log('\n3. Downloading Chrome...');
const chromeUrl = 'https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi';
const downloadPath = path.join(process.env.TEMP, 'ChromeStandalone.msi');

console.log('   Downloading from Google...');
console.log('   This may take 1-2 minutes...');

try {
  // Use PowerShell to download
  execSync(`powershell -Command "Invoke-WebRequest -Uri '${chromeUrl}' -OutFile '${downloadPath}' -UseBasicParsing"`, {
    encoding: 'utf8',
    timeout: 300000 // 5 minutes
  });
  
  if (fs.existsSync(downloadPath)) {
    const size = fs.statSync(downloadPath).size / 1024 / 1024;
    console.log(`   ✅ Downloaded: ${size.toFixed(1)} MB`);
  } else {
    throw new Error('Download failed');
  }
} catch (err) {
  console.log('   ❌ Download failed:', err.message);
  console.log('\n   Fallback: Please download manually from:');
  console.log('   https://www.google.com/chrome/');
  process.exit(1);
}

// Step 4: Install Chrome
console.log('\n4. Installing Chrome...');
console.log('   This may take 2-3 minutes...');

try {
  execSync(`msiexec /i "${downloadPath}" /qn /norestart`, {
    encoding: 'utf8',
    timeout: 300000 // 5 minutes
  });
  console.log('   ✅ Chrome installed successfully');
} catch (err) {
  console.log('   ❌ Installation failed:', err.message);
  process.exit(1);
}

// Step 5: Verify installation
console.log('\n5. Verifying installation...');
setTimeout(() => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (fs.existsSync(chromePath)) {
    try {
      const version = execSync(`"${chromePath}" --version`, { encoding: 'utf8' });
      console.log('   ✅ Chrome installed:', version.trim());
      
      // Test launch
      console.log('\n6. Testing Chrome launch...');
      const testProfile = path.join(process.env.TEMP, 'chrome-test-reinstall');
      if (fs.existsSync(testProfile)) {
        fs.rmSync(testProfile, { recursive: true, force: true });
      }
      fs.mkdirSync(testProfile, { recursive: true });
      
      const { spawn } = require('child_process');
      const chrome = spawn(chromePath, [
        `--user-data-dir=${testProfile}`,
        '--no-first-run',
        'about:blank'
      ], { detached: true });
      
      console.log(`   Chrome PID: ${chrome.pid}`);
      console.log('   Monitoring for 15 seconds...\n');
      
      let seconds = 0;
      const interval = setInterval(() => {
        seconds += 3;
        try {
          process.kill(chrome.pid, 0);
          console.log(`   ✓ Second ${seconds}: Running`);
        } catch {
          clearInterval(interval);
          console.log(`\n   ✗ Chrome crashed at second ${seconds}`);
          console.log('\n⚠️  Chrome still unstable after reinstall');
          console.log('   Moving to Step 3: Alternative browser (Edge)');
          return;
        }
        
        if (seconds >= 15) {
          clearInterval(interval);
          console.log('\n   ✅ Chrome stable after reinstall!');
          console.log('\n📋 Next: Setting up Marvin profile and HEB extension');
          try {
            process.kill(chrome.pid);
          } catch {}
        }
      }, 3000);
      
    } catch (err) {
      console.log('   ❌ Verification failed:', err.message);
    }
  } else {
    console.log('   ❌ Chrome not found after installation');
  }
}, 2000);
