const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Chrome Isolation Test - No Extension');
console.log('='.repeat(60));

// Create fresh temp profile
const testProfile = path.join(process.env.TEMP, 'chrome-isolate-test');
if (fs.existsSync(testProfile)) {
  fs.rmSync(testProfile, { recursive: true, force: true });
}
fs.mkdirSync(testProfile, { recursive: true });

console.log('🚀 Launching Chrome WITHOUT extension...');
console.log('   Profile:', testProfile);
console.log('   Flags: --no-sandbox --disable-gpu');

const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    `--user-data-dir=${testProfile}`,
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    'https://www.heb.com'
  ],
  { detached: true }
);

console.log('   PID:', chrome.pid);
console.log('\n⏳ Monitoring for 30 seconds...\n');

let alive = true;
let seconds = 0;

const interval = setInterval(() => {
  seconds += 5;
  
  try {
    process.kill(chrome.pid, 0);
    console.log(`✓ Second ${seconds}: Chrome running`);
  } catch {
    alive = false;
    clearInterval(interval);
    console.log(`\n✗ Chrome died at second ${seconds}`);
    
    if (seconds <= 20) {
      console.log('\n⚠️  Chrome died quickly - this is NOT an extension issue');
      console.log('   Possible causes:');
      console.log('   - Chrome installation corrupted');
      console.log('   - Windows Defender / security software');
      console.log('   - GPU/driver issues');
      console.log('   - Windows system corruption');
    }
  }
  
  if (seconds >= 30 && alive) {
    clearInterval(interval);
    console.log('\n✅ Chrome survived 30 seconds without extension!');
    console.log('   Extension may be the cause of crashes');
    try {
      process.kill(chrome.pid);
    } catch {}
  }
}, 5000);
