#!/usr/bin/env node
/**
 * HEB Cart Automation - Chrome Extension Mode
 * 
 * Uses Chrome extension exclusively to avoid HEB bot detection
 * - Generates shopping list and extension JSON
 * - Syncs dinner calendar events to Apple Calendar
 * - No browser automation (avoids Incapsula blocking)
 * 
 * Usage:
 *   node scripts/heb-cart-self-recovering.js
 *   node scripts/heb-cart-self-recovering.js --plan path/to/plan.json
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'heb-recovery-state.json');
const LOG_FILE = path.join(DATA_DIR, 'heb-recovery.log');

// Configuration
const CONFIG = {
  maxRetries: 3,
  stallTimeoutMs: 120000, // 2 minutes without progress = stall
  totalTimeoutMs: 30 * 60 * 1000, // 30 minutes max per attempt
  retryDelayMs: 10000, // 10 seconds between retries
  healthCheckIntervalMs: 30000, // Check every 30 seconds
};

// Use Chrome extension method only (avoids bot detection)
const USE_EXTENSION_MODE = true;

/**
 * Logger with timestamp
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    error: '❌',
    warn: '⚠️',
    success: '✅',
    info: 'ℹ️',
    recovery: '🔄'
  }[level] || 'ℹ️';
  
  const line = `[${timestamp}] ${prefix} ${message}`;
  console.log(line);
  
  // Append to log file
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {
    // Ignore log write errors
  }
}

/**
 * Load recovery state from file
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log(`Error loading state: ${e.message}`, 'warn');
  }
  return {
    attemptCount: 0,
    lastAttempt: null,
    lastStrategy: null,
    totalItemsAdded: 0,
    stalledCount: 0,
    success: false,
    history: []
  };
}

/**
 * Save recovery state to file
 */
function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log(`Error saving state: ${e.message}`, 'warn');
  }
}

/**
 * Clear recovery state on success
 */
function clearState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Run the HEB cart automation with monitoring
 */
async function runAutomation(options = {}) {
  return new Promise((resolve, reject) => {
    const args = [path.join(__dirname, 'auto-heb-cart.js')];
    
    if (options.planFile) args.push('--plan', options.planFile);
    if (options.headless === false) args.push('--no-headless');
    
    log(`Starting automation: node ${args.join(' ')}`);
    
    const child = spawn('node', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let lastProgress = null;
    let lastProgressTime = Date.now();
    let healthCheckTimer = null;
    
    // Parse stdout for progress updates
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // Check for progress indicators
      const progressMatch = chunk.match(/Progress:\s*(\d+)\/(\d+)/);
      if (progressMatch) {
        const completed = parseInt(progressMatch[1], 10);
        const total = parseInt(progressMatch[2], 10);
        const progress = { completed, total };
        
        if (JSON.stringify(progress) !== JSON.stringify(lastProgress)) {
          log(`Progress detected: ${completed}/${total}`, 'info');
          lastProgress = progress;
          lastProgressTime = Date.now();
        }
      }
      
      // Check for completion
      if (chunk.includes('AUTOMATION COMPLETED') || chunk.includes('completed successfully')) {
        log('Automation completed message detected', 'success');
      }
      
      // Check for errors
      if (chunk.includes('❌') || chunk.includes('error') || chunk.includes('failed')) {
        log(`Error output: ${chunk.trim()}`, 'warn');
      }
      
      process.stdout.write(chunk);
    });
    
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      process.stderr.write(chunk);
    });
    
    // Health check - monitor for stalls
    healthCheckTimer = setInterval(() => {
      const timeSinceProgress = Date.now() - lastProgressTime;
      
      if (timeSinceProgress > CONFIG.stallTimeoutMs) {
        log(`STALL DETECTED: No progress for ${(timeSinceProgress / 1000).toFixed(0)}s`, 'warn');
        
        // Kill the child process
        clearInterval(healthCheckTimer);
        child.kill('SIGTERM');
        
        reject(new Error('Stall detected - no progress for 2 minutes'));
      }
    }, CONFIG.healthCheckIntervalMs);
    
    // Total timeout
    const totalTimeout = setTimeout(() => {
      clearInterval(healthCheckTimer);
      child.kill('SIGTERM');
      reject(new Error(`Total timeout after ${CONFIG.totalTimeoutMs / 1000}s`));
    }, CONFIG.totalTimeoutMs);
    
    child.on('close', (code) => {
      clearInterval(healthCheckTimer);
      clearTimeout(totalTimeout);
      
      if (code === 0) {
        // Check if results file indicates success
        const resultsPath = path.join(DATA_DIR, 'heb-cart-results.json');
        if (fs.existsSync(resultsPath)) {
          try {
            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            if (results.success) {
              resolve({ success: true, results });
            } else {
              reject(new Error(results.errors?.[0] || 'Automation failed'));
            }
          } catch (e) {
            resolve({ success: true, code });
          }
        } else {
          resolve({ success: true, code });
        }
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      clearInterval(healthCheckTimer);
      clearTimeout(totalTimeout);
      reject(error);
    });
  });
}

/**
 * Apply recovery strategy
 */
async function applyRecovery(strategy, state) {
  log(`Applying recovery strategy: ${strategy}`, 'recovery');
  
  switch (strategy) {
    case 'refresh_page':
      // For refresh_page, we just restart the automation
      // The auto-heb-cart.js will start fresh
      log('Strategy: Restart automation (page refresh)', 'recovery');
      break;
      
    case 'restart_browser':
      // Kill any lingering Chrome processes
      log('Strategy: Kill lingering Chrome processes', 'recovery');
      try {
        const { exec } = require('child_process');
        exec('taskkill /F /IM chrome.exe 2>nul', () => {});
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        // Ignore errors
      }
      break;
      
    case 'clear_cookies':
      // Clear Playwright browser data
      log('Strategy: Clear browser data', 'recovery');
      try {
        const playwrightDir = path.join(require('os').homedir(), 'AppData', 'Local', 'ms-playwright');
        // Just log for now - clearing selectively is safer
        log(`Would clear: ${playwrightDir}`, 'info');
      } catch (e) {
        // Ignore
      }
      break;
      
    case 'fallback_extension':
      log('Strategy: Fallback to Chrome extension', 'recovery');
      break;
      
    default:
      log(`Unknown strategy: ${strategy}`, 'warn');
  }
  
  // Wait before retry
  log(`Waiting ${CONFIG.retryDelayMs / 1000}s before retry...`, 'info');
  await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelayMs));
}

/**
 * Run Chrome Extension mode directly (avoids bot detection)
 */
async function runChromeExtensionMode(options = {}) {
  log('========================================');
  log('HEB CART - CHROME EXTENSION MODE');
  log('========================================');
  log('Using Chrome extension to avoid bot detection', 'info');
  
  try {
    // Generate shopping list and extension files
    const fallbackArgs = [path.join(__dirname, 'auto-heb-cart.js'), '--fallback-only'];
    if (options.planFile) {
      fallbackArgs.push('--plan', options.planFile);
    }
    
    const child = spawn('node', fallbackArgs, { stdio: 'pipe' });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        // Check if files were created successfully (code 1 is expected for fallback mode)
        const resultsPath = path.join(DATA_DIR, 'heb-cart-results.json');
        const shoppingListPath = path.join(DATA_DIR, 'heb-shopping-list.txt');
        
        if (fs.existsSync(shoppingListPath) && fs.existsSync(resultsPath)) {
          // Files were created - this is success for extension mode
          resolve();
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Extension mode exited with code ${code}`));
        }
      });
    });
    
    log('');
    log('✅ Chrome extension files generated', 'success');
    log('   Shopping list saved', 'info');
    log('   Extension items JSON saved', 'info');
    log('');
    log('📋 NEXT STEPS:', 'info');
    log('   1. Open Chrome and navigate to heb.com', 'info');
    log('   2. Click the HEB Cart Helper extension icon', 'info');
    log('   3. The items will auto-load from the generated JSON', 'info');
    log('   4. Click "Add All Items" to populate your cart', 'info');
    log('');
    
    return {
      success: true,
      mode: 'chrome_extension',
      message: 'Chrome extension files generated. Manual cart completion required.',
      shoppingListPath: path.join(DATA_DIR, 'heb-shopping-list.txt'),
      extensionItemsPath: path.join(DATA_DIR, 'heb-extension-items.json')
    };
    
  } catch (error) {
    log(`Chrome extension mode failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Main self-recovering run
 */
async function runWithRecovery(options = {}) {
  const state = loadState();
  
  log('========================================');
  log('HEB CART SELF-RECOVERING AUTOMATION');
  log('========================================');
  
  // Use Chrome extension mode directly (avoids bot detection)
  if (USE_EXTENSION_MODE) {
    log('Mode: Chrome Extension (bot-detection-free)', 'info');
    
    try {
      const result = await runChromeExtensionMode(options);
      
      // Sync dinner events to Apple Calendar
      log('📅 Syncing dinner events to Apple Calendar...', 'info');
      try {
        const { syncDinnerToiCloud } = require('./sync-dinner-to-icloud.js');
        const syncResult = await syncDinnerToiCloud();
        if (syncResult.success) {
          log(`✅ Calendar sync complete: ${syncResult.total} events`, 'success');
        } else {
          log(`⚠️ Calendar sync: ${syncResult.reason || 'partial failure'}`, 'warn');
        }
      } catch (syncError) {
        log(`⚠️ Calendar sync failed: ${syncError.message}`, 'warn');
      }
      
      clearState();
      return result;
      
    } catch (error) {
      log(`Failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Legacy browser automation mode (not used)
  const maxRetries = options.maxRetries || CONFIG.maxRetries;
  log(`Max retries: ${maxRetries}`);
  log(`Previous attempts: ${state.attemptCount}`);
  
  while (state.attemptCount < maxRetries) {
    state.attemptCount++;
    state.lastAttempt = new Date().toISOString();
    
    // Determine recovery strategy
    const strategyIndex = Math.min(state.attemptCount - 1, RECOVERY_STRATEGIES.length - 1);
    const strategy = RECOVERY_STRATEGIES[strategyIndex];
    state.lastStrategy = strategy;
    
    log(`\n=== ATTEMPT ${state.attemptCount}/${maxRetries} ===`, 'info');
    log(`Strategy: ${strategy}`);
    
    // Apply recovery strategy before running (except on first attempt)
    if (state.attemptCount > 1) {
      await applyRecovery(strategy, state);
    }
    
    // Update state file
    saveState(state);
    
    try {
      // Run automation
      const result = await runAutomation(options);
      
      // Success!
      state.success = true;
      state.history.push({
        attempt: state.attemptCount,
        strategy,
        result: 'success',
        timestamp: new Date().toISOString()
      });
      
      log('========================================');
      log('AUTOMATION SUCCEEDED!', 'success');
      log(`Completed on attempt ${state.attemptCount}`, 'success');
      log('========================================');
      
      // Sync dinner events to Apple Calendar
      log('');
      log('📅 Syncing dinner events to Apple Calendar...', 'info');
      try {
        const { syncDinnerToiCloud } = require('./sync-dinner-to-icloud.js');
        const syncResult = await syncDinnerToiCloud();
        if (syncResult.success) {
          log(`✅ Calendar sync complete: ${syncResult.total} events`, 'success');
        } else {
          log(`⚠️ Calendar sync: ${syncResult.reason || 'partial failure'}`, 'warn');
        }
      } catch (syncError) {
        log(`⚠️ Calendar sync failed: ${syncError.message}`, 'warn');
      }
      
      clearState();
      return result;
      
    } catch (error) {
      // Failure - record it
      state.history.push({
        attempt: state.attemptCount,
        strategy,
        result: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      log(`Attempt ${state.attemptCount} failed: ${error.message}`, 'error');
      
      // Check if this is a bot detection error - don't retry, use fallback
      if (error.message.includes('bot detection') || 
          error.message.includes('Incapsula') ||
          error.message.includes('blocked')) {
        log('Bot detection detected - switching to fallback', 'warn');
        break;
      }
      
      // If we have more retries, continue
      if (state.attemptCount < maxRetries) {
        log(`Will retry with strategy: ${RECOVERY_STRATEGIES[Math.min(state.attemptCount, RECOVERY_STRATEGIES.length - 1)]}`, 'recovery');
      } else {
        log('Max retries reached', 'error');
      }
    }
  }
  
  // All retries exhausted - use fallback
  log('========================================');
  log('ALL RETRIES EXHAUSTED - USING FALLBACK', 'warn');
  log('========================================');
  
  state.history.push({
    attempt: 'fallback',
    strategy: 'fallback_extension',
    result: 'fallback_activated',
    timestamp: new Date().toISOString()
  });
  saveState(state);
  
  // Run the fallback extension generator
  try {
    log('Running Chrome extension fallback...', 'info');
    
    const fallbackArgs = [path.join(__dirname, 'auto-heb-cart.js'), '--fallback-only'];
    const child = spawn('node', fallbackArgs, { stdio: 'inherit' });
    
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Fallback exited with code ${code}`));
        }
      });
    });
    
    log('Fallback completed - shopping list generated', 'success');
    
    return {
      success: false,
      fallback: true,
      message: 'Automation failed after retries. Chrome extension fallback used.',
      state
    };
    
  } catch (fallbackError) {
    log(`Fallback also failed: ${fallbackError.message}`, 'error');
    
    return {
      success: false,
      fallback: false,
      error: fallbackError.message,
      state
    };
  }
}

/**
 * Check if automation is currently running
 */
function isRunning() {
  try {
    const state = loadState();
    if (!state.lastAttempt) return false;
    
    const lastAttempt = new Date(state.lastAttempt);
    const now = new Date();
    const elapsed = now - lastAttempt;
    
    // If last attempt was within 30 minutes and not marked complete, consider it running
    if (elapsed < 30 * 60 * 1000 && !state.success) {
      return true;
    }
  } catch (e) {
    // Ignore
  }
  return false;
}

/**
 * Get status of recovery system
 */
function getStatus() {
  const state = loadState();
  return {
    ...state,
    isRunning: isRunning(),
    config: CONFIG
  };
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    maxRetries: CONFIG.maxRetries,
    headless: true
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--max-retries':
        options.maxRetries = parseInt(args[++i], 10) || CONFIG.maxRetries;
        break;
      case '--plan':
        options.planFile = args[++i];
        break;
      case '--no-headless':
        options.headless = false;
        break;
      case '--status':
        console.log(JSON.stringify(getStatus(), null, 2));
        process.exit(0);
        break;
      case '--clear-state':
        clearState();
        log('Recovery state cleared', 'success');
        process.exit(0);
        break;
      case '--help':
        console.log(`
HEB Cart Self-Recovering Automation

Usage:
  node heb-cart-self-recovering.js [options]

Options:
  --max-retries N    Maximum retry attempts (default: 3)
  --plan FILE        Path to meal plan JSON file
  --no-headless      Show browser window
  --status           Show current recovery status
  --clear-state      Clear recovery state and exit
  --help             Show this help message

Recovery Strategies:
  1. refresh_page      - Restart automation fresh
  2. restart_browser   - Kill Chrome and restart
  3. clear_cookies     - Clear browser data
  4. fallback_extension - Use Chrome extension
        `);
        process.exit(0);
        break;
    }
  }
  
  // Run with recovery
  runWithRecovery(options)
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else if (result.fallback) {
        log('Fallback mode - manual intervention required', 'warn');
        process.exit(2);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      log(`Fatal error: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runWithRecovery,
  getStatus,
  isRunning,
  clearState
};
