#!/usr/bin/env node
/**
 * Marvin Chrome Profile Monitor
 * 
 * Keeps Chrome with Marvin profile running 24/7
 * - Restarts Chrome if it crashes/closes
 * - Automatically restores last pages/tabs on restart
 * - Checks OpenClaw Browser Relay extension status
 * - Ensures debug port 9224 is accessible
 * 
 * Usage:
 *   node marvin-chrome-monitor.js
 *   node marvin-chrome-monitor.js --daemon
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CONFIG = {
  debugPort: 9224,
  profileName: 'Default', // Marvin profile (9marvinmartian@gmail.com)
  checkIntervalMs: 30000, // Check every 30 seconds
  chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile',
  logFile: path.join(__dirname, '..', 'data', 'chrome-monitor.log'),
  stateFile: path.join(__dirname, '..', 'data', 'chrome-monitor-state.json')
};

let chromeProcess = null;
let isShuttingDown = false;

/**
 * Logger
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️' }[level] || 'ℹ️';
  const line = `[${timestamp}] ${prefix} ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(CONFIG.logFile, line + '\n');
  } catch (e) {}
}

/**
 * Check if Chrome is running on debug port
 */
async function isChromeRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${CONFIG.debugPort}/json/version`, {
      timeout: 5000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if OpenClaw extension is active
 */
async function isOpenClawExtensionActive() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${CONFIG.debugPort}/json`, {
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const pages = JSON.parse(data);
          // Check if any page has OpenClaw extension URL
          const hasOpenClaw = pages.some(p => 
            p.url && (p.url.includes('openclaw') || p.url.includes('chrome-extension'))
          );
          resolve(hasOpenClaw);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Launch Chrome with Marvin profile - HIDDEN to prevent popup
 */
function launchChrome() {
  log('Launching Chrome with Marvin profile (9marvinmartian@gmail.com)...', 'info');
  
  const args = [
    `--remote-debugging-port=${CONFIG.debugPort}`,
    `--user-data-dir=${CONFIG.userDataDir}`,
    `--profile-directory=${CONFIG.profileName}`,
    '--restore-last-session',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized'
  ];
  
  // Use windowsHide to prevent CMD window popup
  chromeProcess = spawn(CONFIG.chromePath, args, {
    detached: false,
    windowsHide: true
  });
  
  chromeProcess.on('exit', (code) => {
    if (!isShuttingDown) {
      log(`Chrome exited with code ${code}, will restart...`, 'warn');
      chromeProcess = null;
    }
  });
  
  chromeProcess.on('error', (err) => {
    log(`Chrome process error: ${err.message}`, 'error');
    chromeProcess = null;
  });
  
  return chromeProcess;
}

/**
 * Kill existing Chrome processes - HIDDEN to prevent popup
 * Only kills Chrome using our specific debug port
 */
async function killExistingChrome() {
  return new Promise((resolve) => {
    // Use windowsHide: true to prevent CMD window popup
    const opts = { windowsHide: true };
    
    // Find and kill only Chrome processes using our specific port
    // This is gentler than killing all Chrome
    const findAndKillCmd = `for /f "tokens=2" %a in ('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV /NH ^| findstr "${CONFIG.debugPort}"') do taskkill /F /PID %a 2>nul`;
    
    exec(findAndKillCmd, opts, () => {
      setTimeout(() => {
        // As fallback, try to kill any Chrome with our user data dir
        exec(`wmic process where "commandline like '%${CONFIG.userDataDir}%' and name='chrome.exe'" delete 2>nul`, opts, () => {
          setTimeout(resolve, 2000);
        });
      }, 1000);
    });
  });
}

/**
 * Save monitor state
 */
function saveState(state) {
  try {
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify({
      ...state,
      lastUpdate: new Date().toISOString()
    }, null, 2));
  } catch (e) {}
}

/**
 * Verify Chrome debug port is actually working
 */
async function verifyDebugPort(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const isWorking = await isChromeRunning();
    if (isWorking) {
      return true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

/**
 * Main monitoring loop
 */
async function monitor() {
  log('Starting Marvin Chrome Monitor...', 'success');
  log(`Debug port: ${CONFIG.debugPort}`, 'info');
  log(`Check interval: ${CONFIG.checkIntervalMs}ms`, 'info');
  log(`Profile: ${CONFIG.profileName} (9marvinmartian@gmail.com)`, 'info');
  
  while (!isShuttingDown) {
    const state = {
      chromeRunning: false,
      extensionActive: false,
      restarts: 0
    };
    
    try {
      // Check if Chrome debug port is responding
      const chromeRunning = await isChromeRunning();
      state.chromeRunning = chromeRunning;
      
      if (!chromeRunning) {
        log('Chrome debug port not responding, restarting...', 'warn');
        
        // Kill Chrome processes (hidden)
        await killExistingChrome();
        
        // Launch fresh Chrome instance
        launchChrome();
        state.restarts++;
        
        // Wait longer for Chrome to fully start
        await new Promise(r => setTimeout(r, 8000));
        
        // Verify debug port is actually working
        const debugWorking = await verifyDebugPort(5);
        if (debugWorking) {
          log('✅ Chrome debug port verified working', 'success');
        } else {
          log('❌ Chrome debug port still not responding, will retry on next cycle', 'error');
        }
      } else {
        // Check OpenClaw extension
        const extensionActive = await isOpenClawExtensionActive();
        state.extensionActive = extensionActive;
        
        if (!extensionActive) {
          log('OpenClaw extension not active - user may need to click extension icon', 'warn');
        }
      }
      
      saveState(state);
      
    } catch (error) {
      log(`Monitor error: ${error.message}`, 'error');
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, CONFIG.checkIntervalMs));
  }
}

/**
 * Graceful shutdown
 */
function shutdown() {
  isShuttingDown = true;
  log('Shutting down monitor...', 'info');
  if (chromeProcess) {
    chromeProcess.kill();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  if (chromeProcess) chromeProcess.kill();
});

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Marvin Chrome Profile Monitor

Usage:
  node marvin-chrome-monitor.js [options]

Options:
  --daemon    Run as persistent daemon
  --help      Show this help

Features:
  - Keeps Chrome with Marvin profile running 24/7
  - Automatically restores last pages/tabs on restart
  - Monitors debug port ${CONFIG.debugPort}
  - Checks OpenClaw extension status
  - Auto-restarts Chrome if it crashes
`);
    process.exit(0);
  }
  
  monitor().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { monitor, isChromeRunning, launchChrome };
