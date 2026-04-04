#!/usr/bin/env node
/**
 * Optimized Shared Browser Connector v2
 * 
 * Improvements over v1:
 * - Connection pooling for multiple pages
 * - Lazy initialization with caching
 * - Retry logic with exponential backoff
 * - Better error recovery
 * - Reduced memory footprint
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

const CONFIG = {
  debugPort: 9222,
  chromePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  userDataDir: 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data',
  profileDirectory: 'Marvin',
  pidFile: path.join(__dirname, '..', 'data', 'edge-shared.pid'),
  logFile: path.join(__dirname, '..', 'data', 'edge-connector.log'),
  // Connection pool settings
  maxConnections: 3,
  connectionTimeout: 30000,
  idleTimeout: 300000, // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000
};

// Connection pool
const connectionPool = [];
let connectionCounter = 0;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️' }[level] || 'ℹ️';
  const line = `[${timestamp}] ${prefix} ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(CONFIG.logFile, line + '\n');
  } catch {}
}

/**
 * Check if browser is responding on debug port (optimized)
 * Uses faster HTTP check with shorter timeout
 */
async function isBrowserRunning(timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${CONFIG.debugPort}/json/version`, {
      timeout
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
 * Launch browser with optimized settings
 */
function launchBrowser() {
  log('Launching Edge with optimized settings...');
  
  const { spawn } = require('child_process');
  
  const args = [
    `--remote-debugging-port=${CONFIG.debugPort}`,
    `--user-data-dir=${CONFIG.userDataDir}`,
    `--profile-directory=${CONFIG.profileDirectory}`,
    '--restore-last-session',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    // Performance optimizations
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--memory-model=low',
    '--max_old_space_size=1024'
  ];

  const browser = spawn(CONFIG.chromePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  browser.unref();
  
  fs.writeFileSync(CONFIG.pidFile, String(browser.pid));
  log(`Edge launched with PID ${browser.pid}`);
  
  return browser.pid;
}

/**
 * Get browser with connection pooling
 */
async function getBrowser(options = {}) {
  const { forceNew = false, timeout = CONFIG.connectionTimeout } = options;
  
  // Check existing pooled connections
  if (!forceNew && connectionPool.length > 0) {
    // Find available connection
    const availableConnection = connectionPool.find(c => !c.inUse && c.isHealthy);
    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      log(`Reusing pooled connection #${availableConnection.id}`);
      return availableConnection.browser;
    }
  }

  // Check if we can create a new connection
  if (connectionPool.length >= CONFIG.maxConnections) {
    // Wait for a connection to become available
    log('Connection pool full, waiting...');
    await waitForAvailableConnection(timeout);
    return getBrowser(options);
  }

  // Ensure browser is running
  const isRunning = await isBrowserRunning();
  if (!isRunning) {
    log('Browser not running, launching...');
    launchBrowser();
    
    // Wait for browser with exponential backoff
    let attempts = 0;
    const maxAttempts = 15;
    while (attempts < maxAttempts) {
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
      await sleep(delay);
      
      if (await isBrowserRunning(1000)) {
        log('Browser is responding');
        break;
      }
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Browser failed to start after multiple attempts');
    }
  }

  // Connect with retry logic
  let lastError;
  for (let attempt = 0; attempt < CONFIG.retryAttempts; attempt++) {
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.debugPort}`, {
        timeout: 10000
      });
      
      connectionCounter++;
      const connection = {
        id: connectionCounter,
        browser,
        inUse: true,
        isHealthy: true,
        created: Date.now(),
        lastUsed: Date.now()
      };
      
      connectionPool.push(connection);
      log(`Created new connection #${connection.id} (pool: ${connectionPool.length})`);
      
      return browser;
    } catch (error) {
      lastError = error;
      log(`Connection attempt ${attempt + 1} failed: ${error.message}`, 'warn');
      if (attempt < CONFIG.retryAttempts - 1) {
        await sleep(CONFIG.retryDelay * Math.pow(2, attempt));
      }
    }
  }
  
  throw new Error(`Failed to connect after ${CONFIG.retryAttempts} attempts: ${lastError.message}`);
}

/**
 * Wait for an available connection from the pool
 */
async function waitForAvailableConnection(timeout) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Clean up dead connections
    cleanupDeadConnections();
    
    const available = connectionPool.find(c => !c.inUse && c.isHealthy);
    if (available) return;
    
    await sleep(100);
  }
  
  throw new Error('Timeout waiting for available connection');
}

/**
 * Clean up dead/unhealthy connections
 */
function cleanupDeadConnections() {
  const now = Date.now();
  
  for (let i = connectionPool.length - 1; i >= 0; i--) {
    const conn = connectionPool[i];
    
    // Mark connections idle for too long
    if (!conn.inUse && now - conn.lastUsed > CONFIG.idleTimeout) {
      log(`Cleaning up idle connection #${conn.id}`);
      try {
        conn.browser.disconnect();
      } catch (e) {}
      connectionPool.splice(i, 1);
    }
  }
}

/**
 * Get page with optimized context handling
 */
async function getPage(browser, url = null) {
  // Get existing context or create new
  const contexts = browser.contexts();
  let context = contexts[0];
  
  if (!context) {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
  }
  
  // Reuse existing page or create new
  let page = context.pages()[0];
  if (!page) {
    page = await context.newPage();
  }
  
  if (url) {
    // Use faster navigation with domcontentloaded
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
  }
  
  return { browser, context, page };
}

/**
 * Release browser back to pool
 */
async function releaseBrowser(browser) {
  const connection = connectionPool.find(c => c.browser === browser);
  
  if (connection) {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    log(`Released connection #${connection.id} back to pool`);
  } else {
    // Unknown browser, just disconnect
    try {
      await browser.disconnect();
    } catch (e) {}
  }
}

/**
 * Force close all connections (use with caution)
 */
async function closeAllConnections() {
  log('Closing all connections...');
  
  for (const conn of connectionPool) {
    try {
      await conn.browser.disconnect();
    } catch (e) {}
  }
  
  connectionPool.length = 0;
  log('All connections closed');
}

/**
 * Get pool statistics
 */
function getPoolStats() {
  return {
    total: connectionPool.length,
    inUse: connectionPool.filter(c => c.inUse).length,
    available: connectionPool.filter(c => !c.inUse && c.isHealthy).length,
    idle: connectionPool.filter(c => !c.inUse).length
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  getBrowser,
  getPage,
  releaseBrowser,
  isBrowserRunning,
  launchBrowser,
  closeAllConnections,
  getPoolStats,
  cleanupDeadConnections,
  CONFIG,
  connectionPool
};
