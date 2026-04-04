const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 SIGKILL Source Investigation');
console.log('='.repeat(70));

// 1. Check for processes that might kill Chrome
console.log('\n1. Checking for security/antivirus software...');
const securityProcesses = [
  'MsMpEng', 'MsSense', 'Sense', 'Windows Defender',
  'McAfee', 'Norton', 'Symantec', 'Avast', 'AVG',
  'MalwareBytes', 'Kaspersky', 'Bitdefender',
  'RivaTuner', 'MSIAfterburner', 'ProcessHacker',
  'AutoHotkey', 'AHK'
];

securityProcesses.forEach(proc => {
  try {
    execSync(`tasklist /FI "IMAGENAME eq ${proc}.exe" 2> nul | find "${proc}"`, { stdio: 'ignore' });
    console.log(`   ⚠️  ${proc} is running (may interfere)`);
  } catch {}
});

// 2. Check Windows Event Log for process terminations
console.log('\n2. Checking Windows Event Log for process terminations...');
try {
  const events = execSync('powershell -Command "Get-WinEvent -FilterHashtable @{LogName=\"System\"; ID=4689} -MaxEvents 5 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Message | Format-Table -Wrap"', {
    encoding: 'utf8',
    timeout: 10000
  });
  if (events.includes('chrome')) {
    console.log('   ⚠️  Found process termination events for Chrome');
    console.log(events.substring(0, 500));
  } else {
    console.log('   ℹ️  No process termination events found');
  }
} catch {
  console.log('   Could not query Event Log');
}

// 3. Check for automation tools
console.log('\n3. Checking for automation/monitoring tools...');
const autoTools = [
  'AutoRecovery', 'Marvin Auto Recovery',
  'Taskmgr', 'ProcessExplorer', 'ProcExp'
];

autoTools.forEach(tool => {
  try {
    execSync(`tasklist /FI "IMAGENAME eq ${tool}.exe" 2> nul | find "${tool}"`, { stdio: 'ignore' });
    console.log(`   ℹ️  ${tool} is running`);
  } catch {}
});

// 4. Check scheduled tasks that might kill Chrome
console.log('\n4. Checking scheduled tasks...');
try {
  const tasks = execSync('schtasks /Query /FO CSV 2> nul | findstr /I "chrome"', { encoding: 'utf8' });
  if (tasks) {
    console.log('   ⚠️  Found scheduled tasks mentioning Chrome:');
    console.log(tasks.substring(0, 300));
  }
} catch {
  console.log('   ℹ️  No scheduled tasks found for Chrome');
}

// 5. Check Auto-Recovery service
console.log('\n5. Checking Marvin Auto Recovery service...');
try {
  const recovery = execSync('schtasks /Query /TN "Marvin Auto Recovery" 2> nul', { encoding: 'utf8' });
  if (recovery.includes('Running')) {
    console.log('   ⚠️  Auto Recovery is running - may be killing stale Chrome processes');
    console.log('   This could explain SIGKILL');
  } else {
    console.log('   ℹ️  Auto Recovery found but status unclear');
  }
} catch {
  console.log('   ℹ️  Auto Recovery task not found');
}

// 6. Test Chrome launch and monitor
console.log('\n6. Testing Chrome with process monitor...');
console.log('   Launching Chrome and monitoring for 30 seconds...');

const testProfile = path.join(process.env.TEMP, 'chrome-sigkill-test');
if (fs.existsSync(testProfile)) {
  fs.rmSync(testProfile, { recursive: true, force: true });
}
fs.mkdirSync(testProfile, { recursive: true });

const { spawn } = require('child_process');
const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    `--user-data-dir=${testProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ],
  { detached: true }
);

console.log(`   Chrome PID: ${chrome.pid}`);

let checkCount = 0;
const interval = setInterval(() => {
  checkCount++;
  try {
    process.kill(chrome.pid, 0); // Check if process exists
    console.log(`   ✓ Second ${checkCount * 5}: Chrome still running`);
  } catch {
    console.log(`   ✗ Second ${checkCount * 5}: Chrome terminated!`);
    clearInterval(interval);
    
    // Try to determine why
    console.log('\n   🔍 Investigating termination cause...');
    try {
      const recentEvents = execSync('powershell -Command "Get-WinEvent -FilterHashtable @{LogName=\"System\"} -MaxEvents 20 -ErrorAction SilentlyContinue | Where-Object { $_.TimeCreated -gt (Get-Date).AddMinutes(-1) } | Select-Object TimeCreated, Id, LevelDisplayName, Message | Format-Table -Wrap"', {
        encoding: 'utf8',
        timeout: 5000
      });
      console.log('   Recent system events (last 1 minute):');
      console.log(recentEvents.substring(0, 800));
    } catch {}
  }
  
  if (checkCount >= 6) { // 30 seconds
    clearInterval(interval);
    console.log('\n   ✅ Chrome survived 30 seconds without SIGKILL');
    try {
      process.kill(chrome.pid, 'SIGTERM');
    } catch {}
  }
}, 5000);
