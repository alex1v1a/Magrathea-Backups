/**
 * Marvin Automation Core Library
 * Unified automation primitives for all scripts
 * 
 * Features:
 * - Connection pooling for Playwright
 * - Anti-bot evasion techniques
 * - Smart retry with exponential backoff
 * - Performance metrics collection
 * - Unified logging
 * 
 * @version 1.0.0
 * @author Marvin Maverick
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  browser: {
    headless: true,
    slowMo: 0,
    timeout: 30000,
    poolSize: 2, // Keep 2 warm connections
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  antiBot: {
    minDelay: 500,
    maxDelay: 3000,
    scrollChance: 0.3,
    mouseMoveChance: 0.2,
  },
  metrics: {
    enabled: true,
    logPath: path.join(__dirname, '..', 'logs', 'automation-metrics.jsonl'),
  }
};

// ============================================================================
// METRICS COLLECTION
// ============================================================================

class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = [];
    this.sessionStart = Date.now();
  }

  record(operation, duration, success, metadata = {}) {
    const metric = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      success,
      ...metadata,
    };
    
    this.metrics.push(metric);
    this.emit('metric', metric);
    
    // Async log to file
    if (CONFIG.metrics.enabled) {
      this._persistMetric(metric).catch(() => {});
    }
    
    return metric;
  }

  async _persistMetric(metric) {
    try {
      const line = JSON.stringify(metric) + '\n';
      await fs.appendFile(CONFIG.metrics.logPath, line);
    } catch (e) {
      // Silent fail - metrics shouldn't break operations
    }
  }

  getSummary() {
    const ops = this.metrics;
    const total = ops.length;
    const successful = ops.filter(m => m.success).length;
    const avgDuration = total > 0 
      ? ops.reduce((a, m) => a + m.duration, 0) / total 
      : 0;
    
    return {
      totalOperations: total,
      successfulOperations: successful,
      failedOperations: total - successful,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
      averageDuration: Math.round(avgDuration),
      sessionDuration: Date.now() - this.sessionStart,
    };
  }
}

// ============================================================================
// ANTI-BOT EVASION
// ============================================================================

class AntiBotEvasion {
  constructor(page) {
    this.page = page;
    this.lastAction = Date.now();
  }

  // Gaussian random for human-like timing
  static gaussianDelay(min, max) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6;
    return Math.max(min, Math.min(max, Math.round(mean + z * stdDev)));
  }

  async humanize() {
    const now = Date.now();
    const timeSinceLast = now - this.lastAction;
    
    // Ensure minimum gap between actions
    if (timeSinceLast < CONFIG.antiBot.minDelay) {
      await this.page.waitForTimeout(CONFIG.antiBot.minDelay - timeSinceLast);
    }
    
    // Random additional delay
    const delay = AntiBotEvasion.gaussianDelay(
      CONFIG.antiBot.minDelay,
      CONFIG.antiBot.maxDelay
    );
    await this.page.waitForTimeout(delay);
    
    // Occasional scroll
    if (Math.random() < CONFIG.antiBot.scrollChance) {
      await this._randomScroll();
    }
    
    // Occasional mouse movement
    if (Math.random() < CONFIG.antiBot.mouseMoveChance) {
      await this._randomMouseMove();
    }
    
    this.lastAction = Date.now();
  }

  async _randomScroll() {
    const scrollAmount = Math.floor(Math.random() * 400) - 100; // -100 to +300
    await this.page.evaluate((amount) => {
      window.scrollBy({ top: amount, behavior: 'smooth' });
    }, scrollAmount);
    await this.page.waitForTimeout(Math.random() * 1000 + 500);
  }

  async _randomMouseMove() {
    const x = Math.floor(Math.random() * 800) + 100;
    const y = Math.floor(Math.random() * 600) + 100;
    await this.page.mouse.move(x, y, { steps: 10 });
  }

  // Hide automation markers
  static async patchPage(page) {
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Hide chrome automation markers
      if (window.chrome) {
        const chrome = { ...window.chrome };
        delete chrome.runtime?.OnInstalledReason;
        delete chrome.runtime?.OnRestartRequiredReason;
        Object.defineProperty(window, 'chrome', { get: () => chrome });
      }
      
      // Patch permissions API
      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' 
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
        );
      }
      
      // Hide plugins length fingerprinting
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });
  }
}

// ============================================================================
// SMART RETRY SYSTEM
// ============================================================================

class SmartRetry {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || CONFIG.retry.maxAttempts;
    this.baseDelay = options.baseDelay || CONFIG.retry.baseDelay;
    this.maxDelay = options.maxDelay || CONFIG.retry.maxDelay;
    this.multiplier = options.backoffMultiplier || CONFIG.retry.backoffMultiplier;
  }

  async execute(operation, operationName = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const start = Date.now();
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          duration: Date.now() - start,
        };
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxAttempts) {
          break;
        }
        
        const delay = Math.min(
          this.baseDelay * Math.pow(this.multiplier, attempt - 1),
          this.maxDelay
        );
        
        console.log(`  🔄 ${operationName} failed (attempt ${attempt}/${this.maxAttempts}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    return {
      success: false,
      error: lastError,
      attempts: this.maxAttempts,
    };
  }
}

// ============================================================================
// BROWSER CONNECTION POOL
// ============================================================================

class BrowserPool {
  constructor() {
    this.browser = null;
    this.pages = [];
    this.inUse = new Set();
    this.metrics = new MetricsCollector();
  }

  async init(options = {}) {
    if (this.browser) return;
    
    const start = Date.now();
    
    this.browser = await chromium.launch({
      headless: options.headless ?? CONFIG.browser.headless,
      slowMo: options.slowMo ?? CONFIG.browser.slowMo,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
      ],
    });
    
    // Pre-warm pages
    const poolSize = options.poolSize ?? CONFIG.browser.poolSize;
    for (let i = 0; i < poolSize; i++) {
      const page = await this._createPage();
      this.pages.push(page);
    }
    
    this.metrics.record('browser_init', Date.now() - start, true, { poolSize });
  }

  async _createPage() {
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0',
    });
    
    const page = await context.newPage();
    await AntiBotEvasion.patchPage(page);
    
    // Set default timeout
    page.setDefaultTimeout(CONFIG.browser.timeout);
    
    return page;
  }

  async acquire() {
    // Find available page
    const available = this.pages.find(p => !this.inUse.has(p));
    if (available) {
      this.inUse.add(available);
      return available;
    }
    
    // Create new page if none available
    const page = await this._createPage();
    this.pages.push(page);
    this.inUse.add(page);
    return page;
  }

  release(page) {
    this.inUse.delete(page);
    
    // Cleanup if pool is too large
    if (this.pages.length > CONFIG.browser.poolSize * 2) {
      const index = this.pages.indexOf(page);
      if (index > -1) {
        this.pages.splice(index, 1);
        page.context().close().catch(() => {});
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pages = [];
      this.inUse.clear();
    }
  }

  getMetrics() {
    return {
      ...this.metrics.getSummary(),
      poolSize: this.pages.length,
      inUse: this.inUse.size,
      available: this.pages.length - this.inUse.size,
    };
  }
}

// ============================================================================
// LOCATOR UTILITIES
// ============================================================================

class LocatorUtils {
  // Priority: data-testid > data-qe-id > data-automation-id > aria-label > text
  static async findClickable(page, selectors, options = {}) {
    const strategies = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const strategy of strategies) {
      try {
        let locator;
        
        if (typeof strategy === 'string') {
          locator = page.locator(strategy);
        } else if (strategy.role) {
          locator = page.getByRole(strategy.role, { name: strategy.name, exact: strategy.exact });
        } else if (strategy.text) {
          locator = page.getByText(strategy.text, { exact: strategy.exact });
        } else if (strategy.testId) {
          locator = page.getByTestId(strategy.testId);
        }
        
        if (!locator) continue;
        
        // Check visibility
        const isVisible = await locator.isVisible().catch(() => false);
        if (!isVisible) continue;
        
        // Check enabled state
        const isEnabled = await locator.isEnabled().catch(() => false);
        if (!isEnabled && !options.allowDisabled) continue;
        
        // Check custom filter
        if (options.filter) {
          const passes = await locator.evaluate(options.filter).catch(() => false);
          if (!passes) continue;
        }
        
        return locator;
      } catch (e) {
        continue;
      }
    }
    
    return null;
  }

  // Wait for any of multiple conditions
  static async waitForAny(page, conditions, timeout = 10000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      for (const condition of conditions) {
        try {
          const result = await Promise.race([
            condition.check(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 1000)
            ),
          ]);
          
          if (result) {
            return condition.name;
          }
        } catch (e) {
          continue;
        }
      }
      
      await page.waitForTimeout(500);
    }
    
    throw new Error('None of the expected conditions were met');
  }
}

// ============================================================================
// UNIFIED LOGGER
// ============================================================================

class UnifiedLogger {
  constructor(context) {
    this.context = context;
    this.startTime = Date.now();
  }

  _log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      elapsed: Date.now() - this.startTime,
      ...data,
    };
    
    const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
    console.log(`${emoji} [${this.context}] ${message}`, data);
    
    return entry;
  }

  debug(msg, data) { return this._log('debug', msg, data); }
  info(msg, data) { return this._log('info', msg, data); }
  warn(msg, data) { return this._log('warn', msg, data); }
  error(msg, data) { return this._log('error', msg, data); }

  async logToFile(filepath) {
    // Implementation for file logging
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

module.exports = {
  // Core classes
  BrowserPool,
  AntiBotEvasion,
  SmartRetry,
  MetricsCollector,
  LocatorUtils,
  UnifiedLogger,
  
  // Configuration
  CONFIG,
  
  // Convenience functions
  async withBrowser(fn, options = {}) {
    const pool = new BrowserPool();
    try {
      await pool.init(options);
      const page = await pool.acquire();
      const evasion = new AntiBotEvasion(page);
      const result = await fn(page, evasion, pool);
      pool.release(page);
      return result;
    } finally {
      await pool.close();
    }
  },
  
  async withRetry(operation, name, options) {
    const retry = new SmartRetry(options);
    return retry.execute(operation, name);
  },
  
  // Utilities
  randomDelay: (min, max) => 
    new Promise(r => setTimeout(r, AntiBotEvasion.gaussianDelay(min, max))),
  
  createLogger: (context) => new UnifiedLogger(context),
};
