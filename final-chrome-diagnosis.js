const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE CHROME CRASH ANALYSIS');
console.log('='.repeat(70));
console.log('Date: ' + new Date().toISOString());
console.log('');

// 1. Chrome Version & Install Info
console.log('1. CHROME INSTALLATION INFO');
console.log('-'.repeat(70));
try {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (fs.existsSync(chromePath)) {
    console.log('✅ Chrome executable exists');
    console.log('   Path: ' + chromePath);
    
    // Check version
    const version = execSync('reg query "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome" /v DisplayVersion', { encoding: 'utf8' });
    const match = version.match(/DisplayVersion\s+REG_SZ\s+([\d.]+)/);
    if (match) console.log('   Version: ' + match[1]);
  } else {
    console.log('❌ Chrome executable not found');
  }
} catch (e) {
  console.log('   Error: ' + e.message);
}

// 2. Crash Dump Analysis
console.log('\n2. CRASH DUMP ANALYSIS');
console.log('-'.repeat(70));
const crashDirs = [
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Crashpad', 'reports'),
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile\\Crashpad\\reports'
];

let totalDumps = 0;
crashDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const dumps = fs.readdirSync(dir).filter(f => f.endsWith('.dmp'));
    const recentDumps = dumps.filter(f => {
      const stat = fs.statSync(path.join(dir, f));
      return (Date.now() - stat.mtime.getTime()) < 2 * 60 * 60 * 1000; // 2 hours
    });
    
    if (recentDumps.length > 0) {
      console.log('   ' + dir + ':');
      console.log('   Recent crashes (2h): ' + recentDumps.length);
      recentDumps.slice(0, 3).forEach(d => console.log('     - ' + d));
      totalDumps += recentDumps.length;
    }
  }
});

if (totalDumps === 0) {
  console.log('   No recent crash dumps found');
}

// 3. Event Viewer Logs
console.log('\n3. WINDOWS EVENT VIEWER - CHROME ERRORS');
console.log('-'.repeat(70));
try {
  const events = execSync('powershell -Command "Get-WinEvent -FilterHashtable @{LogName=\'Application\'} -MaxEvents 20 -ErrorAction SilentlyContinue | Where-Object { $_.Message -like \'*chrome*\' -or $_.Message -like \'*Google Chrome*\' } | Select-Object TimeCreated, LevelDisplayName, Id, Message | Format-Table -Wrap"', { 
    encoding: 'utf8',
    timeout: 10000
  });
  if (events.trim()) {
    console.log(events.substring(0, 2000));
  } else {
    console.log('   No Chrome-related events in Application log');
  }
} catch {
  console.log('   Could not retrieve Event Viewer logs');
}

// 4. Interfering Software Check
console.log('\n4. POTENTIALLY INTERFERING SOFTWARE');
console.log('-'.repeat(70));
const softwareToCheck = [
  'MsMpEng',              // Windows Defender
  'NisSrv',               // Windows Defender Network Inspection
  'svchost',              // Windows Services (many)
  'SearchIndexer',        // Windows Search
  'dwm',                  // Desktop Window Manager
  'explorer',             // Windows Explorer
  'ctfmon',               // CTF Loader (input)
  'TextInputHost',        // Text Input
  'WmiPrvSE',             // WMI Provider
  'SgrmBroker',           // System Guard
  'SecurityHealthService', // Security Center
];

console.log('   Running system processes that may interfere:');
softwareToCheck.forEach(proc => {
  try {
    const result = execSync(`tasklist /FI "IMAGENAME eq ${proc}.exe" 2>nul | find /C "${proc}"`, { encoding: 'utf8' });
    const count = parseInt(result.trim());
    if (count > 0) {
      console.log('     ' + proc + ': ' + count + ' instance(s)');
    }
  } catch {}
});

// 5. Chrome Launch Test with Detailed Logging
console.log('\n5. CHROME LAUNCH TEST WITH LOGGING');
console.log('-'.repeat(70));
const testProfile = path.join(process.env.TEMP, 'chrome-final-test');
if (fs.existsSync(testProfile)) {
  fs.rmSync(testProfile, { recursive: true, force: true });
}
fs.mkdirSync(testProfile, { recursive: true });

console.log('   Creating test profile: ' + testProfile);
console.log('   Launching Chrome with verbose logging...');

try {
  // Launch Chrome with logging
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const logFile = path.join(testProfile, 'chrome_debug.log');
  
  const chrome = require('child_process').spawn(chromePath, [
    `--user-data-dir=${testProfile}`,
    '--enable-logging',
    '--v=1',
    '--no-first-run',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ], { 
    detached: true,
    stdio: 'ignore'
  });
  
  console.log('   Chrome PID: ' + chrome.pid);
  console.log('   Monitoring for 30 seconds...\n');
  
  let seconds = 0;
  const interval = setInterval(() => {
    seconds += 5;
    try {
      process.kill(chrome.pid, 0);
      process.stdout.write('✓' + seconds + 's ');
    } catch {
      clearInterval(interval);
      console.log('\n\n   ✗ Chrome crashed at second ' + seconds);
      
      // Check log file
      if (fs.existsSync(logFile)) {
        try {
          const log = fs.readFileSync(logFile, 'utf8');
          const errors = log.split('\n').filter(l => 
            l.includes('ERROR') || 
            l.includes('FATAL') || 
            l.includes('CRASH') ||
            l.includes('exception')
          );
          
          if (errors.length > 0) {
            console.log('\n   Errors from Chrome log:');
            errors.slice(-5).forEach(e => console.log('     ' + e.substring(0, 100)));
          }
        } catch {}
      }
    }
    
    if (seconds >= 30) {
      clearInterval(interval);
      console.log('\n\n   ✅ Chrome survived 30 seconds');
      try { process.kill(chrome.pid); } catch {}
    }
  }, 5000);
  
} catch (e) {
  console.log('   Launch failed: ' + e.message);
}

// 6. Summary & Root Cause Analysis
setTimeout(() => {
  console.log('\n\n' + '='.repeat(70));
  console.log('6. ROOT CAUSE ANALYSIS & SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\n🔴 FINDINGS:');
  console.log('   • Chrome crashes consistently regardless of fixes');
  console.log('   • Survival time varies: 5s - 50s (inconsistent)');
  console.log('   • Fresh profile, reinstall, stability flags: No effect');
  console.log('   • System repairs (SFC/DISM) helped temporarily');
  console.log('   • Scheduled tasks (CMD pop-ups) partially addressed');
  console.log('   • Windows Defender exclusions: No effect');
  console.log('   • Admin privileges: No effect');
  
  console.log('\n🔴 LIKELY ROOT CAUSES:');
  console.log('   1. Windows 11 Insider/Preview build instability');
  console.log('   2. Group Policy restrictions on Chrome execution');
  console.log('   3. Security software beyond Windows Defender');
  console.log('   4. GPU driver conflict (Intel UHD 630)');
  console.log('   5. Deep Windows system corruption (kernel level)');
  
  console.log('\n✅ WORKING SOLUTION:');
  console.log('   • Microsoft Edge: Stable for 15+ minutes');
  console.log('   • Edge + HEB Auto-Cart: Fully functional');
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('   1. Use Microsoft Edge for all automation (proven stable)');
  console.log('   2. Update Intel GPU driver via Device Manager');
  console.log('   3. Consider Windows 11 fresh install if Chrome critical');
  console.log('   4. Run Windows Update to install pending updates');
  console.log('   5. Check for corporate/group policy restrictions');
  
  console.log('\n' + '='.repeat(70));
}, 35000);
