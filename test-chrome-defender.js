const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Chrome Test - After Defender Check');
console.log('='.repeat(60));

// Create fresh profile
const testProfile = path.join(process.env.TEMP, 'chrome-defender-test');
if (fs.existsSync(testProfile)) {
  fs.rmSync(testProfile, { recursive: true, force: true });
}
fs.mkdirSync(testProfile, { recursive: true });

console.log('🚀 Launching Chrome...');
console.log('   Profile:', testProfile);
console.log('   Defender exclusions: Already added');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  `--user-data-dir=${testProfile}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { detached: true });

console.log('   PID:', chrome.pid);
console.log('\n⏳ Monitoring for 60 seconds...\n');

let seconds = 0;
const interval = setInterval(() => {
  seconds += 5;
  
  try {
    process.kill(chrome.pid, 0);
    console.log(`✓ Second ${seconds}: Chrome running`);
  } catch {
    clearInterval(interval);
    console.log(`\n✗ Chrome crashed at second ${seconds}`);
    
    if (seconds <= 20) {
      console.log('\n⚠️  Chrome crashed quickly despite Defender exclusions');
      console.log('   Possible causes:');
      console.log('   - Real-time protection still active (requires admin to disable)');
      console.log('   - Other security software');
      console.log('   - Windows system corruption');
      console.log('   - Group Policy preventing Chrome execution');
    }
    return;
  }
  
  if (seconds >= 60) {
    clearInterval(interval);
    console.log('\n✅ Chrome stable for 60 seconds!');
    console.log('   Defender exclusions are working');
    try {
      process.kill(chrome.pid);
    } catch {}
  }
}, 5000);
