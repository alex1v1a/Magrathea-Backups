const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Chrome Crash Log Analysis');
console.log('='.repeat(70));

// 1. Get recent crash dumps
const crashDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Crashpad', 'reports');
console.log('\n1. Recent Crash Dumps (Last 10 minutes):');

let recentDumps = [];
if (fs.existsSync(crashDir)) {
  const dumps = fs.readdirSync(crashDir)
    .filter(f => f.endsWith('.dmp'))
    .map(f => {
      const stat = fs.statSync(path.join(crashDir, f));
      return { name: f, time: stat.mtime, size: stat.size };
    })
    .sort((a, b) => b.time - a.time);
  
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  recentDumps = dumps.filter(d => d.time.getTime() > tenMinutesAgo);
  
  recentDumps.forEach(d => {
    console.log(`   ${d.name}`);
    console.log(`     Time: ${d.time.toLocaleTimeString()}`);
    console.log(`     Size: ${(d.size / 1024 / 1024).toFixed(2)} MB`);
  });
}

// 2. Check Chrome logs
console.log('\n2. Chrome Console Logs:');
const logPaths = [
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'chrome_debug.log'),
  path.join('C:', 'Users', 'Admin', '.openclaw', 'chrome-marvin-only-profile', 'chrome_debug.log')
];

logPaths.forEach(logPath => {
  if (fs.existsSync(logPath)) {
    console.log(`   Found: ${logPath}`);
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter(l => l.includes('ERROR') || l.includes('FATAL') || l.includes('CRASH'));
      if (lines.length > 0) {
        console.log('   Recent errors:');
        lines.slice(-5).forEach(l => console.log(`     ${l.substring(0, 100)}`));
      }
    } catch {}
  }
});

// 3. Check Event Viewer
console.log('\n3. Windows Event Viewer (Application Log):');
try {
  const events = execSync('powershell -Command "Get-EventLog -LogName Application -Source Chrome -Newest 5 | Select-Object TimeGenerated, EntryType, Message | Format-Table -Wrap"', {
    encoding: 'utf8',
    timeout: 10000
  });
  console.log(events);
} catch {
  console.log('   Could not retrieve Event Viewer logs');
}

// 4. Check for crash patterns
console.log('\n4. Crash Pattern Analysis:');
if (recentDumps.length > 0) {
  const crashTimes = recentDumps.map(d => d.time.getTime());
  const intervals = [];
  for (let i = 1; i < crashTimes.length; i++) {
    intervals.push((crashTimes[i-1] - crashTimes[i]) / 1000);
  }
  
  console.log(`   Total crashes in last 10 min: ${recentDumps.length}`);
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    console.log(`   Average time between crashes: ${avgInterval.toFixed(1)} seconds`);
    
    if (avgInterval < 60) {
      console.log('   ⚠️  Rapid crashes detected (less than 1 minute apart)');
      console.log('      This suggests a startup crash, not a runtime crash');
    }
  }
}

// 5. Check Chrome version and compatibility
console.log('\n5. Chrome Version Info:');
try {
  const version = execSync('reg query "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome" /v DisplayVersion', { encoding: 'utf8' });
  const match = version.match(/DisplayVersion\s+REG_SZ\s+([\d.]+)/);
  if (match) {
    console.log(`   Version: ${match[1]}`);
    const verParts = match[1].split('.');
    if (parseInt(verParts[0]) < 120) {
      console.log('   ⚠️  Chrome version is outdated - update recommended');
    }
  }
} catch {}

// 6. Repair recommendations
console.log('\n' + '='.repeat(70));
console.log('🔧 REPAIR RECOMMENDATIONS');
console.log('='.repeat(70));

console.log('\nBased on crash analysis:');

if (recentDumps.length > 3) {
  console.log('\n1. IMMEDIATE FIX - Clear all Chrome data:');
  console.log('   - Kill Chrome processes');
  console.log('   - Delete Chrome User Data folder');
  console.log('   - Delete Marvin profile folder');
  console.log('   - Reinstall Chrome if needed');
  
  console.log('\n2. PROFILE RESET - Create completely new profile:');
  console.log('   - Use fresh --user-data-dir path');
  console.log('   - Test if crashes persist with fresh profile');
  
  console.log('\n3. SAFE MODE - Launch without extensions:');
  console.log('   - chrome --disable-extensions');
  console.log('   - Test if extension is causing crashes');
  
  console.log('\n4. SYSTEM CHECK:');
  console.log('   - Run Windows Update');
  console.log('   - Update GPU drivers');
  console.log('   - Check for malware');
}

console.log('\n⚠️  ALTERNATIVE: Use Microsoft Edge');
console.log('   Edge was working before Chrome migration.');
console.log('   Consider reverting HEB automation to Edge.');

console.log('\n' + '='.repeat(70));
