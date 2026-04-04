const { launchBrowser, isBrowserRunning, getBrowserName, LOCAL_CONFIG } = require('./shared-chrome-connector');
const fs = require('fs');
const path = require('path');

/**
 * Shared Browser Launcher
 * Starts browser once for all automation tasks
 * 
 * Usage: node launch-shared-chrome.js
 *        node launch-shared-chrome.js --stop
 */

const PID_FILE = path.join(__dirname, '..', 'data', 'edge-shared.pid');

async function main() {
  const browserName = getBrowserName();
  const args = process.argv.slice(2);
  
  if (args.includes('--stop')) {
    console.log(`🛑 Stopping shared ${browserName}...`);
    stopBrowser();
    return;
  }
  
  if (args.includes('--status')) {
    const running = await isBrowserRunning();
    console.log(running ? `✅ ${browserName} is running` : `❌ ${browserName} is not running`);
    console.log(`Debug port: ${LOCAL_CONFIG.debugPort}`);
    return;
  }
  
  console.log(`🚀 Shared ${browserName} Launcher`);
  console.log('=' .repeat(50));
  
  const running = await isBrowserRunning();
  
  if (running) {
    console.log(`✅ ${browserName} is already running on port`, LOCAL_CONFIG.debugPort);
    console.log('   All automation scripts will connect to this instance.');
  } else {
    console.log(`🔄 ${browserName} not running, launching...`);
    const pid = launchBrowser();
    console.log(`✅ ${browserName} launched with PID:`, pid);
    console.log('   Debug port:', LOCAL_CONFIG.debugPort);
    
    // Wait a moment
    await new Promise(r => setTimeout(r, 3000));
    
    const nowRunning = await isBrowserRunning();
    if (nowRunning) {
      console.log(`✅ ${browserName} is responding!`);
    } else {
      console.log(`⚠️  ${browserName} may still be starting...`);
    }
  }
  
  console.log(`\n📋 All automation scripts now use this single ${browserName} instance.`);
  console.log('   No more multiple browser windows!');
}

function stopBrowser() {
  const browserName = getBrowserName();
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf8');
      process.kill(parseInt(pid), 'SIGTERM');
      console.log(`✅ ${browserName} stopped (PID:`, pid + ')');
      fs.unlinkSync(PID_FILE);
    } else {
      console.log('⚠️  No PID file found');
    }
  } catch (err) {
    console.log(`❌ Error stopping ${browserName}:`, err.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
