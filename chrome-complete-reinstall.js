const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔧 CHROME COMPLETE REINSTALL FROM SCRATCH');
console.log('='.repeat(70));

// Step 1: Kill all Chrome processes
console.log('\n1. Killing all Chrome processes...');
try {
  execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  execSync('taskkill /F /IM chromedriver.exe 2> nul', { stdio: 'ignore' });
  execSync('taskkill /F /IM GoogleUpdate.exe 2> nul', { stdio: 'ignore' });
  console.log('   ✅ All Chrome processes killed');
} catch {
  console.log('   ℹ️  No Chrome processes running');
}

// Step 2: Uninstall Chrome via Windows
console.log('\n2. Uninstalling Chrome via Windows...');
try {
  // Try to find and run Chrome uninstaller
  const uninstallPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.133\\Installer\\setup.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.134\\Installer\\setup.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\144.0.7559.135\\Installer\\setup.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\144.0.7559.133\\Installer\\setup.exe'
  ];
  
  let uninstalled = false;
  for (const setupPath of uninstallPaths) {
    if (fs.existsSync(setupPath)) {
      console.log('   Found uninstaller: ' + setupPath);
      try {
        execSync(`"${setupPath}" --uninstall --multi-install --chrome --system-level --force-uninstall`, { 
          stdio: 'pipe',
          timeout: 120000
        });
        console.log('   ✅ Chrome uninstalled via setup.exe');
        uninstalled = true;
        break;
      } catch {}
    }
  }
  
  if (!uninstalled) {
    console.log('   ⚠️  Uninstaller not found, using manual removal');
  }
} catch {}

// Step 3: Delete ALL Chrome data
console.log('\n3. Deleting ALL Chrome data...');
const pathsToDelete = [
  'C:\\Program Files\\Google\\Chrome',
  'C:\\Program Files (x86)\\Google\\Chrome',
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome'),
  path.join(process.env.APPDATA, 'Google', 'Chrome'),
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile',
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-minimal',
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-backup-*'
];

pathsToDelete.forEach(p => {
  if (p.includes('*')) {
    // Handle glob pattern
    const basePath = p.replace('\\*', '');
    if (fs.existsSync(basePath)) {
      fs.readdirSync(basePath).forEach(f => {
        if (f.startsWith('chrome-')) {
          try {
            fs.rmSync(path.join(basePath, f), { recursive: true, force: true });
            console.log('   ✅ Deleted: ' + f);
          } catch {}
        }
      });
    }
  } else if (fs.existsSync(p)) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
      console.log('   ✅ Deleted: ' + path.basename(p));
    } catch (err) {
      console.log('   ⚠️  Could not delete: ' + path.basename(p));
    }
  }
});

// Step 4: Clear registry entries (safe ones)
console.log('\n4. Clearing Chrome registry entries...');
try {
  execSync('reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome" /f 2> nul', { stdio: 'ignore' });
  execSync('reg delete "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome" /f 2> nul', { stdio: 'ignore' });
  console.log('   ✅ Registry entries cleared');
} catch {
  console.log('   ℹ️  No registry entries to clear');
}

// Step 5: Download Chrome
console.log('\n5. Downloading Chrome...');
console.log('   This may take 1-2 minutes...');

const chromeUrl = 'https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi';
const downloadPath = path.join(process.env.TEMP, 'ChromeStandalone64.msi');

try {
  // Use curl via PowerShell
  execSync(`powershell -Command "Invoke-WebRequest -Uri '${chromeUrl}' -OutFile '${downloadPath}' -UseBasicParsing"`, {
    encoding: 'utf8',
    timeout: 300000
  });
  
  if (fs.existsSync(downloadPath)) {
    const size = fs.statSync(downloadPath).size / 1024 / 1024;
    console.log(`   ✅ Downloaded: ${size.toFixed(1)} MB`);
  } else {
    throw new Error('Download failed');
  }
} catch (err) {
  console.log('   ❌ Download failed: ' + err.message);
  console.log('\n   Please download manually from:');
  console.log('   https://www.google.com/chrome/');
  process.exit(1);
}

// Step 6: Install Chrome
console.log('\n6. Installing Chrome...');
console.log('   This may take 2-3 minutes...');

try {
  execSync(`msiexec /i "${downloadPath}" /qn /norestart`, {
    encoding: 'utf8',
    timeout: 300000
  });
  console.log('   ✅ Chrome installed successfully');
} catch (err) {
  console.log('   ⚠️  Installation had issues: ' + err.message);
  console.log('   Checking if Chrome installed anyway...');
}

// Step 7: Verify installation
console.log('\n7. Verifying installation...');
setTimeout(() => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  if (fs.existsSync(chromePath)) {
    console.log('   ✅ Chrome found at: ' + chromePath);
    
    // Test launch
    console.log('\n8. Testing Chrome...');
    const testProfile = path.join(process.env.TEMP, 'chrome-reinstall-test');
    if (fs.existsSync(testProfile)) {
      fs.rmSync(testProfile, { recursive: true, force: true });
    }
    fs.mkdirSync(testProfile, { recursive: true });
    
    const { spawn } = require('child_process');
    const chrome = spawn(chromePath, [
      `--user-data-dir=${testProfile}`,
      '--no-first-run',
      '--disable-gpu',
      '--no-sandbox',
      'about:blank'
    ], { detached: true });
    
    console.log('   Chrome PID: ' + chrome.pid);
    console.log('   Monitoring for 30 seconds...\n');
    
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 3;
      
      try {
        process.kill(chrome.pid, 0);
        process.stdout.write('✓' + seconds + 's ');
      } catch {
        clearInterval(interval);
        console.log('\n\n   ✗ Chrome crashed at ' + seconds + ' seconds');
        console.log('\n⚠️  Chrome is still unstable after complete reinstall');
        console.log('   This confirms system-level issues beyond installation.');
        return;
      }
      
      if (seconds >= 30) {
        clearInterval(interval);
        console.log('\n\n   ✅ Chrome stable for 30 seconds!');
        console.log('   Reinstall was successful!');
        try { process.kill(chrome.pid); } catch {}
      }
    }, 3000);
    
  } else {
    console.log('   ❌ Chrome not found after installation');
    console.log('   Manual installation required from: https://www.google.com/chrome/');
  }
}, 3000);
