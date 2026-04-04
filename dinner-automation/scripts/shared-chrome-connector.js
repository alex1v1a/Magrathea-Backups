/**
 * Shared Browser Connector (Refactored)
 * All scripts use ONE browser instance via CDP
 * Configured for Microsoft Edge (dinner automation)
 * 
 * REFACTORED: Now uses shared library modules
 * - Uses lib/cdp-client for CDP connection management
 * - Uses lib/logger for structured logging
 * - Uses lib/config for configuration loading
 */

const { CDPClient, logger, getConfig } = require('../lib');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = getConfig();

const LOCAL_CONFIG = {
  debugPort: config.get('browser.debugPort', 9222),
  chromePath: config.get('browser.edgePath', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'),
  userDataDir: config.get('browser.userDataDir', process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\User Data'),
  profileDirectory: config.get('browser.profile', 'Marvin'),
  pidFile: path.join(__dirname, '..', 'data', 'edge-shared.pid'),
};

// Create component-specific logger
const log = logger.child('connector');

// Create CDP client instance
let cdpClient = null;

/**
 * Get browser name for logging
 */
function getBrowserName() {
  return LOCAL_CONFIG.chromePath.includes('edge') ? 'Edge' : 'Chrome';
}

/**
 * Check if browser is responding on debug port
 * REFACTORED: Delegates to CDPClient
 */
async function isBrowserRunning() {
  if (!cdpClient) {
    cdpClient = new CDPClient({ debugPort: LOCAL_CONFIG.debugPort });
  }
  return cdpClient.isBrowserRunning();
}

/**
 * Launch browser with debug port (truly detached)
 */
function resolveEdgePath() {
  // Try configured path first, then common Edge locations
  const candidates = [
    LOCAL_CONFIG.chromePath,
    'C\\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C\\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error('Microsoft Edge not found in expected locations.');
}

function launchBrowser() {
  const browserName = getBrowserName();
  const edgePath = resolveEdgePath();
  log.info(`Launching ${browserName} with shared debug port...`);
  
  const args = [
    `"${edgePath}"`,
    `--remote-debugging-port=${LOCAL_CONFIG.debugPort}`,
    `--user-data-dir="${LOCAL_CONFIG.userDataDir}"`,
    `--profile-directory=${LOCAL_CONFIG.profileDirectory}`,
    '--restore-last-session',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized'
  ].join(' ');
  
  // Use batch file to launch browser completely detached
  const batPath = path.join(__dirname, '..', 'data', 'launch-edge.bat');
  
  // Write batch file dynamically
  const batContent = `@echo off\r\nstart "" ${args}\r\n`;
  fs.writeFileSync(batPath, batContent);
  
  // Execute batch (completely detached)
  const cmd = spawn('cmd.exe', ['/c', batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  
  cmd.unref();
  
  // Store placeholder PID (actual PID will be discovered via netstat)
  fs.writeFileSync(LOCAL_CONFIG.pidFile, 'detached');
  
  log.success(`${browserName} launched (detached)`);
  return 'detached';
}

/**
 * Ensure browser is running and connect
 * REFACTORED: Uses CDPClient for connection management
 */
async function getBrowser() {
  const browserName = getBrowserName();
  
  if (!cdpClient) {
    cdpClient = new CDPClient({ debugPort: LOCAL_CONFIG.debugPort });
    
    // Set up event listeners
    cdpClient.on('connecting', () => log.debug('Connecting to browser...'));
    cdpClient.on('connected', () => log.success(`Connected to ${browserName}`));
    cdpClient.on('disconnected', () => log.warn(`Disconnected from ${browserName}`));
    cdpClient.on('reconnecting', ({ attempt }) => log.warn(`Reconnecting... (attempt ${attempt})`));
  }
  
  const isRunning = await cdpClient.isBrowserRunning();
  
  if (!isRunning) {
    log.info(`${browserName} not running, launching...`);
    launchBrowser();
    
    // Wait for browser to start
    log.info(`Waiting for ${browserName} to initialize...`);
    let attempts = 0;
    while (attempts < 20) {
      await sleep(1000);
      if (await cdpClient.isBrowserRunning()) {
        log.success(`${browserName} is responding!`);
        break;
      }
      attempts++;
    }
    
    if (attempts >= 20) {
      throw new Error(`${browserName} failed to start`);
    }
  } else {
    log.debug(`Connecting to existing ${browserName} instance`);
  }
  
  // Connect via CDP
  const { browser } = await cdpClient.connect();
  return browser;
}

/**
 * Get a page - creates new if needed
 * REFACTORED: Uses CDPClient connection
 */
async function getPage(browser, url = null) {
  const { context, page } = await cdpClient.getConnection();
  
  if (url && page) {
    await page.goto(url);
  }
  
  return { browser, context, page };
}

/**
 * Close excess pages, keep only main page
 * Note: Page closing can hang, so we use a short timeout and skip on failure
 */
async function cleanupPages(browser, keepPages = 1) {
  try {
    const { context } = cdpClient.getConnection();
    if (!context) {
      log.warn('No context available for page cleanup');
      return;
    }
    const pages = context.pages();
    
    if (pages.length > keepPages) {
      log.info(`Closing ${pages.length - keepPages} excess pages...`);
      // Close pages with timeout - don't block if it hangs
      const closePromises = pages.slice(keepPages).map(async (page) => {
        try {
          await Promise.race([
            page.close(),
            sleep(2000).then(() => { throw new Error('timeout'); })
          ]);
        } catch (e) {
          // Page may already be closed or timed out - ignore
        }
      });
      // Wait max 5 seconds total for all closures
      await Promise.race([
        Promise.all(closePromises),
        sleep(5000)
      ]);
      log.success('Page cleanup complete');
    }
  } catch (e) {
    log.warn('Page cleanup error: ' + e.message);
  }
}

/**
 * Disconnect (don't close browser, just disconnect)
 * REFACTORED: Uses CDPClient for clean disconnect
 */
async function releaseBrowser(browser, closePages = false) {
  const browserName = getBrowserName();
  try {
    // Close excess pages before disconnecting
    if (closePages) {
      await cleanupPages(browser, 1);
    }
    
    await cdpClient.disconnect();
    log.info(`Disconnected from ${browserName} (${browserName} keeps running)`);
  } catch (e) {
    // Suppress benign disconnect warnings (handled in CDPClient)
    const msg = e.message || '';
    const isBenign = msg.includes('disconnect is not a function') ||
                     msg.includes('Browser has been closed') ||
                     msg.includes('Target closed');
    
    if (!isBenign) {
      log.warn('Disconnect error: ' + e.message);
    }
    // Benign errors are silently ignored
  }
}

/**
 * Force cleanup all tabs except homepage
 * Call this periodically to prevent tab buildup
 */
async function forceTabCleanup() {
  log.section('FORCED TAB CLEANUP');
  
  try {
    if (!cdpClient) {
      cdpClient = new CDPClient({ debugPort: LOCAL_CONFIG.debugPort });
    }
    
    await cdpClient.connect();
    const { context } = cdpClient.getConnection();
    const pages = context.pages();
    let closedCount = 0;
    
    for (const page of pages) {
      try {
        const url = page.url();
        // Keep only blank/new tab pages or Facebook main page or HEB
        if (!url.includes('facebook.com') && !url.includes('heb.com') && url !== 'about:blank') {
          await page.close();
          closedCount++;
        }
      } catch (e) {
        // Page may already be closed
      }
    }
    
    await releaseBrowser(null, false);
    log.success(`Closed ${closedCount} orphaned tabs`);
    return closedCount;
  } catch (e) {
    log.error('Force cleanup error: ' + e.message);
    return 0;
  }
}

/**
 * Utility sleep function
 * REFACTORED: Imported from shared lib, kept for backward compatibility
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup resources
 */
async function cleanup() {
  if (cdpClient) {
    await cdpClient.cleanup();
    cdpClient = null;
  }
}

module.exports = {
  getBrowser,
  getPage,
  releaseBrowser,
  isBrowserRunning,
  launchBrowser,
  getBrowserName,
  cleanupPages,
  forceTabCleanup,
  cleanup,
  sleep,
  LOCAL_CONFIG,
  // Also export CDPClient for advanced usage
  CDPClient
};

// Run forced cleanup if called directly
if (require.main === module) {
  forceTabCleanup().then(count => {
    log.success(`Cleanup complete. Closed ${count} tabs.`);
    process.exit(0);
  }).catch(err => {
    log.error('Cleanup failed:', err);
    process.exit(1);
  });
}
