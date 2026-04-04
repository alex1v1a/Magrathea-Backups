const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Chrome Crash Analysis - Debug Mode');
console.log('='.repeat(60));

// 1. Check crash dumps
console.log('\n1. Recent Crash Dumps:');
const crashPaths = [
  path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Crashpad', 'reports'),
  'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile\\Crashpad\\reports'
];

let totalDumps = 0;
crashPaths.forEach(crashPath => {
  if (fs.existsSync(crashPath)) {
    const dumps = fs.readdirSync(crashPath).filter(f => f.endsWith('.dmp'));
    const recentDumps = dumps.filter(f => {
      const stat = fs.statSync(path.join(crashPath, f));
      const age = (Date.now() - stat.mtime.getTime()) / 1000 / 60; // minutes
      return age < 30; // Last 30 minutes
    });
    if (recentDumps.length > 0) {
      console.log(`   ${crashPath}:`);
      recentDumps.slice(0, 3).forEach(d => console.log(`     - ${d}`));
      totalDumps += recentDumps.length;
    }
  }
});

if (totalDumps === 0) console.log('   No recent crashes found');

// 2. Check for debug mode errors
console.log('\n2. Testing Chrome in debug mode...');
const testProfile = path.join(process.env.TEMP, 'chrome-debug-test');

// Clean test profile
if (fs.existsSync(testProfile)) {
  fs.rmSync(testProfile, { recursive: true, force: true });
}
fs.mkdirSync(testProfile, { recursive: true });

try {
  const result = execSync(
    `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="${testProfile}" --enable-logging --v=1 --no-first-run --headless --dump-dom "about:blank" 2>&1`,
    { encoding: 'utf8', timeout: 10000 }
  );
  console.log('   ✅ Chrome started in debug mode successfully');
} catch (err) {
  console.log('   ❌ Chrome failed in debug mode');
  console.log('   Error:', err.message.substring(0, 200));
}

// 3. Check for conflicting software
console.log('\n3. Checking for known conflicting software...');
const conflictingProcesses = [
  'RivaTuner', 'MSI Afterburner', 'OBS', 'XSplit',
  'Discord', 'NVIDIA Overlay', 'AMD Overlay'
];

conflictingProcesses.forEach(proc => {
  try {
    execSync(`tasklist /FI "IMAGENAME eq ${proc}*" 2> nul | find "${proc}"`, { stdio: 'ignore' });
    console.log(`   ⚠️  ${proc} is running (may conflict)`);
  } catch {}
});

// 4. Test minimal launch
console.log('\n4. Testing minimal Chrome launch...');
try {
  const minimal = execSync(
    '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="' + testProfile + '" --no-sandbox --disable-gpu --no-first-run --headless --dump-dom "about:blank" 2>&1',
    { encoding: 'utf8', timeout: 10000 }
  );
  console.log('   ✅ Minimal launch successful (--no-sandbox --disable-gpu)');
  console.log('   💡 These flags may be needed for stability');
} catch (err) {
  console.log('   ❌ Even minimal launch failed');
  console.log('   Chrome may need reinstallation');
}

// 5. Check Chrome version
console.log('\n5. Chrome Version:');
try {
  const version = execSync('reg query "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome" /v DisplayVersion 2> nul', { encoding: 'utf8' });
  const match = version.match(/DisplayVersion\s+REG_SZ\s+([\d.]+)/);
  if (match) console.log('   Version:', match[1]);
} catch {
  console.log('   Could not determine version');
}

// Cleanup
try {
  fs.rmSync(testProfile, { recursive: true, force: true });
} catch {}

console.log('\n' + '='.repeat(60));
console.log('🔧 Recommendations:');
console.log('='.repeat(60));
console.log('1. Try launching with --no-sandbox --disable-gpu flags');
console.log('2. Close any overlay software (Discord, NVIDIA, etc.)');
console.log('3. If crashes persist, Chrome may need reinstallation');
console.log('4. Use Edge as fallback (already configured)');
