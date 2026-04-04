/**
 * Error Recovery & Self-Healing System
 * 
 * Automatically detects and recovers from common automation failures:
 * - Browser crashes
 * - Network timeouts
 * - Session expiration
 * - Stuck processes
 * - Memory leaks
 * 
 * @module lib/self-healing
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class SelfHealingSystem {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || 30000; // 30s
    this.maxRetries = options.maxRetries || 3;
    this.recoveryActions = new Map();
    this.failureHistory = [];
    this.isRunning = false;
    this.timer = null;
    
    // Register default recovery actions
    this.registerDefaults();
  }

  /**
   * Register default recovery actions
   */
  registerDefaults() {
    // Browser crash recovery
    this.register('browser_crash', async (context) => {
      console.log('🔄 Recovering from browser crash...');
      
      // Kill any orphaned Edge processes
      try {
        await execAsync('taskkill /F /IM msedge.exe /FI "STATUS eq NOT RESPONDING"', {
          timeout: 5000
        });
      } catch {
        // No unresponsive processes
      }
      
      // Restart browser
      const launchScript = path.join(__dirname, '..', '..', 'scripts', 'launch-shared-chrome.js');
      try {
        await execAsync(`node "${launchScript}"`, { timeout: 10000 });
        return { success: true, action: 'browser_restarted' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    // Session expiration recovery
    this.register('session_expired', async (context) => {
      console.log('🔄 Recovering from session expiration...');
      
      // Clear session cache
      const sessionCachePath = path.join(__dirname, '..', '..', 'data', 'session-cache.json');
      try {
        await fs.unlink(sessionCachePath);
      } catch {
        // File may not exist
      }
      
      // Notify about re-login needed
      return { 
        success: true, 
        action: 'session_cleared',
        requiresManual: true,
        message: 'Session cleared - manual re-login may be required'
      };
    });
    
    // Network timeout recovery
    this.register('network_timeout', async (context) => {
      console.log('🔄 Recovering from network timeout...');
      
      // Wait and retry
      await this.sleep(5000);
      
      // Check connectivity
      try {
        await execAsync('ping -n 1 -w 3000 www.google.com', { timeout: 5000 });
        return { success: true, action: 'network_restored' };
      } catch {
        return { 
          success: false, 
          action: 'network_still_down',
          message: 'Network connectivity issues persist'
        };
      }
    });
    
    // Stuck process recovery
    this.register('stuck_process', async (context) => {
      console.log('🔄 Recovering from stuck process...');
      
      const pid = context.pid;
      if (pid) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`, { timeout: 5000 });
          return { success: true, action: 'process_killed', pid };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      
      return { success: false, message: 'No PID provided' };
    });
    
    // Memory pressure recovery
    this.register('memory_pressure', async (context) => {
      console.log('🔄 Recovering from memory pressure...');
      
      // Clear caches
      if (global.gc) {
        global.gc();
      }
      
      // Close excess browser tabs
      try {
        const cleanupScript = path.join(__dirname, '..', '..', 'scripts', 'shared-chrome-connector.js');
        await execAsync(`node "${cleanupScript}"`, { timeout: 10000 });
        return { success: true, action: 'memory_freed' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Register a recovery action
   */
  register(failureType, actionFn) {
    this.recoveryActions.set(failureType, actionFn);
  }

  /**
   * Attempt to heal from a failure
   */
  async heal(failureType, context = {}) {
    const action = this.recoveryActions.get(failureType);
    
    if (!action) {
      return { 
        success: false, 
        message: `No recovery action for ${failureType}` 
      };
    }
    
    // Check failure history
    const recentFailures = this.failureHistory.filter(f => 
      f.type === failureType && 
      Date.now() - f.time < 300000 // 5 minutes
    );
    
    if (recentFailures.length >= this.maxRetries) {
      return {
        success: false,
        message: `Max retries exceeded for ${failureType}`,
        failures: recentFailures.length
      };
    }
    
    // Record failure
    this.failureHistory.push({ type: failureType, time: Date.now(), context });
    
    // Trim history
    if (this.failureHistory.length > 100) {
      this.failureHistory = this.failureHistory.slice(-50);
    }
    
    // Execute recovery
    try {
      const result = await action(context);
      
      return {
        success: result.success,
        failureType,
        recoveryAction: result.action,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        failureType,
        error: error.message
      };
    }
  }

  /**
   * Start automatic health monitoring
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🩺 Self-healing system started');
    
    this.timer = setInterval(async () => {
      await this.healthCheck();
    }, this.checkInterval);
  }

  /**
   * Stop automatic monitoring
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('🛑 Self-healing system stopped');
  }

  /**
   * Periodic health check
   */
  async healthCheck() {
    try {
      // Check browser responsiveness
      const http = require('http');
      const isBrowserResponsive = await new Promise((resolve) => {
        const req = http.get('http://localhost:9222/json/version', { timeout: 3000 },
          (res) => resolve(res.statusCode === 200)
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
      
      if (!isBrowserResponsive) {
        const result = await this.heal('browser_crash');
        console.log('Auto-recovery result:', result);
      }
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      
      if (heapUsedMB > 500) { // 500MB threshold
        const result = await this.heal('memory_pressure');
        console.log('Memory recovery result:', result);
      }
      
    } catch (error) {
      console.error('Health check error:', error.message);
    }
  }

  /**
   * Get healing statistics
   */
  getStats() {
    const stats = {
      totalFailures: this.failureHistory.length,
      byType: {},
      recentFailures: this.failureHistory.slice(-10),
      registeredActions: Array.from(this.recoveryActions.keys())
    };
    
    for (const failure of this.failureHistory) {
      stats.byType[failure.type] = (stats.byType[failure.type] || 0) + 1;
    }
    
    return stats;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Wrap functions with auto-heal
function withAutoHeal(fn, options = {}) {
  const healer = options.healer || new SelfHealingSystem();
  const failureType = options.failureType || 'general';
  
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error.message);
      
      // Attempt healing
      const result = await healer.heal(failureType, { error, args });
      
      if (result.success && !result.requiresManual) {
        // Retry after healing
        console.log('Retrying after healing...');
        return await fn.apply(this, args);
      }
      
      throw error;
    }
  };
}

module.exports = {
  SelfHealingSystem,
  withAutoHeal
};
