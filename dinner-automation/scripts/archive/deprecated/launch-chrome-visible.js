const { spawn } = require('child_process');
const path = require('path');

console.log('🌐 Launching Chrome with Visible Window');
console.log('='.repeat(50));

// Kill existing Chrome first
try {
  require('child_process').execSync('taskkill /F /IM chrome.exe 2> nul', { stdio: 'ignore' });
  console.log('✅ Killed existing Chrome processes');
} catch {}

setTimeout(() => {
  const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
  const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
  
  console.log('🚀 Starting Chrome...');
  console.log('   Profile: Marvin (9marvinmartian@gmail.com)');
  console.log('   Extension: HEB Auto-Cart v1.2.0');
  
  // Launch with CREATE_NEW_CONSOLE to ensure visible window
  const chrome = spawn(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    [
      `--user-data-dir=${MARVIN_PROFILE}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      'https://www.heb.com'
    ],
    {
      detached: false,  // Keep attached to ensure window shows
      stdio: 'inherit', // Inherit stdio
      windowsHide: false // CRITICAL: Don't hide the window
    }
  );
  
  chrome.on('error', (err) => {
    console.error('❌ Launch failed:', err.message);
  });
  
  chrome.on('spawn', () => {
    console.log('\n✅ Chrome launched with visible window!');
    console.log('   Process ID:', chrome.pid);
    console.log('\n📋 If window is not visible:');
    console.log('   1. Check taskbar for Chrome icon');
    console.log('   2. Alt+Tab to find Chrome window');
    console.log('   3. Check if minimized to system tray');
  });
  
  // Keep process alive for 30 seconds to ensure window creation
  setTimeout(() => {
    console.log('\n⏳ Check your screen for Chrome window now');
  }, 5000);
  
}, 2000);
