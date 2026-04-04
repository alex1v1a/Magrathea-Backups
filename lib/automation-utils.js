/**
 * @fileoverview Automation Utilities - Centralized helpers for browser automation
 * Consolidates retry logic, CDP connection management, human-like delays,
 * common selectors, and structured logging.
 * 
 * @module lib/automation-utils
 * 
 * @example
 * const {
 *   withRetry,
 *   CDPManager,
 *   delay,
 *   humanDelay,
 *   SELECTORS,
 *   createLogger
 * } = require('./lib/automation-utils');
 */

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// DELAY UTILITIES - Human-like timing
// ═══════════════════════════════════════════════════════════════

/**
 * Simple delay promise
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 * 
 * @example
 * await delay(1000); // Wait 1 second
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay within a range
 * 
 * @param {number} minMs - Minimum milliseconds
 * @param {number} maxMs - Maximum milliseconds
 * @returns {Promise<void>}
 * 
 * @example
 * await randomDelay(1000, 3000); // Wait 1-3 seconds
 */
function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(ms);
}

/**
 * Human-like delay with natural variation
 * Simulates realistic human interaction timing patterns
 * 
 * @param {string} action - Type of action ('type', 'click', 'navigate', 'think')
 * @returns {Promise<void>}
 * 
 * @example
 * await humanDelay('type'); // Typing delay between keystrokes
 * await humanDelay('navigate'); // Page navigation delay
 * await humanDelay('think'); // "Thinking" delay between actions
 */
async function humanDelay(action = 'default') {
  const delays = {
    type: { min: 30, max: 120 },      // Between keystrokes
    click: { min: 200, max: 800 },     // Before/after clicking
    navigate: { min: 2000, max: 5000 }, // Page loads
    think: { min: 800, max: 2500 },    // Between actions
    default: { min: 500, max: 1500 }
  };

  const { min, max } = delays[action] || delays.default;
  
  // Add occasional longer pauses (10% chance of "distraction")
  if (Math.random() < 0.1) {
    await randomDelay(max, max * 3);
  } else {
    await randomDelay(min, max);
  }
}

/**
 * Type text with human-like delays between keystrokes
 * 
 * @param {import('playwright-core').Locator} locator - Input locator
 * @param {string} text - Text to type
 * @param {Object} options - Options
 * @param {number} options.baseDelay - Base delay between keystrokes
 * @returns {Promise<void>}
 */
async function humanType(locator, text, options = {}) {
  const { baseDelay = 50 } = options;
  
  for (const char of text) {
    await locator.type(char, { delay: baseDelay + Math.random() * 50 });
    await delay(baseDelay + Math.random() * 30);
  }
}

// ═══════════════════════════════════════════════════════════════
// RETRY LOGIC - Exponential backoff
// ═══════════════════════════════════════════════════════════════

/**
 * Default retry configuration
 * @constant {Object}
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true,
  retryableErrors: [
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /EAI_AGAIN/i,
    /socket hang up/i,
    /network error/i,
    /timeout/i,
    /Navigation timeout/i,
    /Target closed/i
  ]
};

/**
 * Check if error is retryable based on patterns
 * 
 * @param {Error} error - Error to check
 * @param {Array<RegExp>} patterns - Regex patterns to match
 * @returns {boolean}
 */
function isRetryableError(error, patterns = DEFAULT_RETRY_CONFIG.retryableErrors) {
  const message = error?.message || String(error);
  return patterns.some(pattern => pattern.test(message));
}

/**
 * Execute function with exponential backoff retry
 * 
 * @template T
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts
 * @param {number} options.baseDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {number} options.factor - Exponential factor
 * @param {boolean} options.jitter - Add random jitter
 * @param {Function} options.onRetry - Called on each retry
 * @param {Array<RegExp>} options.retryableErrors - Error patterns to retry
 * @returns {Promise<T>} Function result
 * @throws {Error} Last error after all retries exhausted
 * 
 * @example
 * const result = await withRetry(async () => {
 *   return await fetchData();
 * }, { maxAttempts: 5, baseDelay: 2000 });
 */
async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const { maxAttempts, baseDelay, maxDelay, factor, jitter, onRetry, retryableErrors } = config;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      let delayMs = Math.min(baseDelay * Math.pow(factor, attempt - 1), maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delayMs += Math.random() * 1000;
      }
      
      if (onRetry) {
        onRetry(attempt, maxAttempts, error, delayMs);
      }
      
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Retry wrapper with circuit breaker pattern
 * Prevents cascading failures by opening circuit after consecutive failures
 */
class CircuitBreaker {
  /**
   * @param {Object} options - Circuit breaker options
   * @param {number} options.failureThreshold - Failures before opening circuit
   * @param {number} options.resetTimeout - Time before attempting reset
   * @param {number} options.halfOpenMaxCalls - Calls allowed in half-open state
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    this.logger = options.logger || console;
  }
  
  /**
   * Execute function with circuit breaker protection
   * 
   * @template T
   * @param {Function} fn - Function to execute
   * @param {...*} args - Arguments to pass to function
   * @returns {Promise<T>}
   * @throws {Error} Circuit breaker open error or function error
   */
  async execute(fn, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker OPEN. Retry after ${new Date(this.nextAttempt).toISOString()}`
        );
      }
      this.state = 'HALF_OPEN';
      this.halfOpenCalls = 0;
      this.logger.log('🔓 Circuit breaker entering HALF_OPEN state');
    }
    
    try {
      const result = await fn(...args);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }
  
  _onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.logger.log('🔓 Circuit breaker CLOSED - service recovered');
      }
    }
  }
  
  _onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.logger.log(`🔒 Circuit breaker OPENED until ${new Date(this.nextAttempt).toLocaleTimeString()}`);
    }
  }
  
  /**
   * Get current circuit state
   * @returns {Object} Current state information
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.state === 'OPEN' ? this.nextAttempt : null
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// CDP CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * CDP Connection Manager
 * Handles Chrome DevTools Protocol connections with automatic retry,
 * health checking, and resource cleanup.
 */
class CDPManager {
  /**
   * @param {Object} options - CDP connection options
   * @param {number} options.port - Debug port (default: 9222)
   * @param {string} options.host - Debug host (default: localhost)
   * @param {number} options.timeout - Connection timeout
   * @param {number} options.healthCheckInterval - Health check interval
   * @param {Function} options.logger - Logger function
   */
  constructor(options = {}) {
    this.port = options.port || 9222;
    this.host = options.host || 'localhost';
    this.timeout = options.timeout || 30000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.logger = options.logger || console;
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.healthCheckTimer = null;
    this.connectionAttempts = 0;
    this.maxAttempts = options.maxAttempts || 5;
  }
  
  /**
   * Get CDP WebSocket URL
   * @returns {string} WebSocket URL
   */
  getWsUrl() {
    return `http://${this.host}:${this.port}`;
  }
  
  /**
   * Connect to Chrome via CDP with retry logic
   * 
   * @param {Object} options - Connection options
   * @returns {Promise<import('playwright-core').Browser>} Connected browser
   * @throws {Error} If connection fails after all retries
   */
  async connect(options = {}) {
    const connectOptions = {
      headless: false,
      ...options
    };
    
    return withRetry(
      async () => {
        this.connectionAttempts++;
        this.logger.log(`[CDP] Connecting to ${this.getWsUrl()} (attempt ${this.connectionAttempts})`);
        
        this.browser = await chromium.connectOverCDP(this.getWsUrl());
        
        // Get or create context
        this.context = this.browser.contexts()[0];
        if (!this.context) {
          this.context = await this.browser.newContext();
        }
        
        // Get or create page
        this.page = this.context.pages()[0];
        if (!this.page) {
          this.page = await this.context.newPage();
        }
        
        this.connectionAttempts = 0;
        this.logger.log('[CDP] Connected successfully');
        
        // Start health checks
        this._startHealthCheck();
        
        return this.browser;
      },
      {
        maxAttempts: this.maxAttempts,
        baseDelay: 2000,
        onRetry: (attempt, max, error, delay) => {
          this.logger.log(`[CDP] Connection failed (attempt ${attempt}/${max}): ${error.message}`);
          this.logger.log(`[CDP] Retrying in ${Math.round(delay)}ms...`);
        }
      }
    );
  }
  
  /**
   * Check if connection is healthy
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    try {
      if (!this.browser || !this.page) return false;
      
      // Try to evaluate a simple expression
      await this.page.evaluate(() => true);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Start periodic health checks
   * @private
   */
  _startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.isHealthy();
      if (!healthy) {
        this.logger.warn('[CDP] Health check failed');
        this.emit?.('healthCheckFailed');
      }
    }, this.healthCheckInterval);
  }
  
  /**
   * Disconnect from CDP and cleanup resources
   */
  async disconnect() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log('[CDP] Disconnected');
      } catch (error) {
        this.logger.error('[CDP] Error during disconnect:', error.message);
      }
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
  
  /**
   * Get current page
   * @returns {import('playwright-core').Page|null}
   */
  getPage() {
    return this.page;
  }
  
  /**
   * Get current context
   * @returns {import('playwright-core').BrowserContext|null}
   */
  getContext() {
    return this.context;
  }
}

// ═══════════════════════════════════════════════════════════════
// COMMON SELECTORS - Site-specific element selectors
// ═══════════════════════════════════════════════════════════════

/**
 * Site-specific selectors for automation
 * @constant {Object}
 */
const SELECTORS = {
  /**
   * HEB (heb.com) selectors
   */
  heb: {
    // Navigation
    searchInput: 'input[data-testid="search-input"], input[placeholder*="Search"]',
    searchButton: 'button[data-testid="search-button"], button[aria-label*="Search"]',
    cartLink: 'a[data-testid="cart-link"], [href="/cart"]',
    
    // Login
    loginEmail: 'input[type="email"], input[name="email"]',
    loginPassword: 'input[type="password"], input[name="password"]',
    loginButton: 'button[type="submit"], button:has-text("Sign In")',
    verifyCode: 'input[type="tel"], input[name="code"], input[placeholder*="code"]',
    trustDevice: 'button:has-text("Trust"), button:has-text("Yes")',
    
    // Product
    productCard: '[data-testid="product-card"], .product-card',
    productGrid: '[data-testid="product-grid"], .product-grid',
    productName: '[data-testid="product-name"], .product-name',
    productPrice: '[data-testid="product-price"], .product-price',
    addToCartBtn: 'button[data-qe-id="addToCart"], button:has-text("Add to Cart")',
    
    // Cart
    cartItem: '[data-testid="cart-item"], .cart-item',
    cartTotal: '[data-testid="cart-total"], .cart-total',
    checkoutBtn: 'button:has-text("Checkout"), button[data-testid="checkout"]',
    
    // Account
    accountMenu: '[data-testid="account-menu"], .account-dropdown',
    welcomeMessage: '.welcome-message'
  },
  
  /**
   * Facebook (facebook.com) selectors
   */
  facebook: {
    // Navigation
    homeLink: '[aria-label="Home"], [href="/"]',
    profileLink: '[aria-label="Your profile"], [href*="/profile"]',
    marketplaceLink: '[href*="/marketplace"], [aria-label="Marketplace"]',
    
    // Login
    loginEmail: 'input[name="email"], input#email',
    loginPassword: 'input[name="pass"], input#pass',
    loginButton: 'button[name="login"], button[data-testid="royal_login_button"]',
    
    // Marketplace
    listingTitle: 'h1, [role="main"] h2',
    shareButton: '[aria-label*="Share"], button:has-text("Share")',
    shareToGroup: 'text=/Share to a group/i, text=/Share in a group/i',
    groupSearch: 'input[placeholder*="Search"], input[aria-label*="Search"]',
    postButton: 'button:has-text("Post"), [aria-label="Post"]',
    
    // Messages
    messageList: '[role="main"] [role="list"]',
    messageInput: 'div[contenteditable="true"], [role="textbox"]',
    sendButton: '[aria-label="Send"], button[type="submit"]',
    
    // Popups/Modals
    dismissButtons: [
      '[aria-label="Close"]',
      '[aria-label="Dismiss"]',
      'button[aria-label*="cookie" i]',
      'button:has-text("Not Now")',
      'button:has-text("Close")'
    ]
  },
  
  /**
   * Generic/common selectors
   */
  common: {
    // Form elements
    submitButton: 'button[type="submit"], input[type="submit"]',
    textInput: 'input[type="text"], textarea',
    checkbox: 'input[type="checkbox"]',
    radio: 'input[type="radio"]',
    select: 'select',
    
    // Navigation
    link: 'a',
    button: 'button',
    
    // Status
    loading: '[data-loading="true"], .loading, .spinner',
    error: '[data-error="true"], .error, [role="alert"]',
    success: '[data-success="true"], .success'
  }
};

/**
 * Get selectors for a specific site
 * 
 * @param {string} site - Site name ('heb', 'facebook', 'common')
 * @returns {Object|undefined} Site selectors
 */
function getSelectors(site) {
  return SELECTORS[site.toLowerCase()];
}

/**
 * Build a selector that matches any of the provided selectors
 * 
 * @param {string[]} selectors - Array of selectors
 * @returns {string} Combined selector
 */
function anyOf(selectors) {
  return selectors.join(', ');
}

// ═══════════════════════════════════════════════════════════════
// LOGGING UTILITY - Structured logging with timestamps
// ═══════════════════════════════════════════════════════════════

/**
 * Log levels
 * @constant {Object}
 */
const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60
};

/**
 * ANSI color codes
 * @constant {Object}
 */
const COLORS = {
  reset: '\x1b[0m',
  trace: '\x1b[90m',   // gray
  debug: '\x1b[36m',   // cyan
  info: '\x1b[32m',    // green
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  fatal: '\x1b[35m'    // magenta
};

/**
 * Create a structured logger
 * 
 * @param {Object} options - Logger options
 * @param {string} options.name - Logger name
 * @param {string} options.level - Minimum log level
 * @param {string} options.logDir - Directory for log files
 * @param {boolean} options.console - Enable console output
 * @param {boolean} options.file - Enable file output
 * @returns {Object} Logger instance
 * 
 * @example
 * const logger = createLogger({ name: 'heb-automation', level: 'debug' });
 * logger.info('Starting automation');
 * logger.error('Failed to connect', { error: err.message });
 */
function createLogger(options = {}) {
  const name = options.name || 'automation';
  const level = LOG_LEVELS[options.level?.toUpperCase()] || LOG_LEVELS.INFO;
  const logDir = options.logDir || path.join(process.cwd(), 'logs');
  const enableConsole = options.console !== false;
  const enableFile = options.file !== false;
  
  // Ensure log directory exists
  if (enableFile && !fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `${name}-${new Date().toISOString().split('T')[0]}.log`);
  
  /**
   * Write log entry
   * @param {string} logLevel - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  function write(logLevel, message, meta = {}) {
    const levelValue = LOG_LEVELS[logLevel.toUpperCase()];
    if (levelValue < level) return;
    
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level: logLevel.toUpperCase(),
      name,
      message,
      ...meta
    };
    
    // Console output with colors
    if (enableConsole) {
      const color = COLORS[logLevel.toLowerCase()] || COLORS.reset;
      const prefix = `${color}[${timestamp.split('T')[1].split('.')[0]} ${logLevel.toUpperCase()}${COLORS.reset}] ${name}:`;
      console.log(`${prefix} ${message}`);
      if (meta.error) {
        console.log(`  ${COLORS.error}Error: ${meta.error}${COLORS.reset}`);
      }
    }
    
    // File output (JSON)
    if (enableFile) {
      try {
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
      } catch (err) {
        // Silent fail for file logging
      }
    }
  }
  
  return {
    trace: (msg, meta) => write('trace', msg, meta),
    debug: (msg, meta) => write('debug', msg, meta),
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
    fatal: (msg, meta) => write('fatal', msg, meta),
    
    /**
     * Create child logger with additional context
     * @param {Object} context - Context to add to all logs
     * @returns {Object} Child logger
     */
    child(context) {
      return {
        trace: (msg, meta) => write('trace', msg, { ...context, ...meta }),
        debug: (msg, meta) => write('debug', msg, { ...context, ...meta }),
        info: (msg, meta) => write('info', msg, { ...context, ...meta }),
        warn: (msg, meta) => write('warn', msg, { ...context, ...meta }),
        error: (msg, meta) => write('error', msg, { ...context, ...meta }),
        fatal: (msg, meta) => write('fatal', msg, { ...context, ...meta })
      };
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// SCREENSHOT UTILITIES - Debugging and error capture
// ═══════════════════════════════════════════════════════════════

/**
 * Screenshot configuration
 * @constant {Object}
 */
const SCREENSHOT_CONFIG = {
  dir: path.join(process.cwd(), 'screenshots'),
  fullPage: true,
  format: 'png'
};

/**
 * Take a timestamped screenshot
 * 
 * @param {import('playwright-core').Page} page - Playwright page
 * @param {Object} options - Screenshot options
 * @param {string} options.prefix - Filename prefix
 * @param {string} options.dir - Output directory
 * @param {boolean} options.fullPage - Capture full page
 * @returns {Promise<string>} Path to saved screenshot
 * 
 * @example
 * await takeScreenshot(page, { prefix: 'error' });
 * // Saves to ./screenshots/error-2024-01-15T10-30-00-000Z.png
 */
async function takeScreenshot(page, options = {}) {
  const config = { ...SCREENSHOT_CONFIG, ...options };
  const { prefix, dir, fullPage } = config;
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${prefix}-${timestamp}.${SCREENSHOT_CONFIG.format}`;
  const filepath = path.join(dir, filename);
  
  await page.screenshot({ path: filepath, fullPage });
  
  return filepath;
}

/**
 * Wrap function with automatic screenshot on failure
 * 
 * @template T
 * @param {import('playwright-core').Page} page - Playwright page
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Options
 * @param {string} options.screenshotPrefix - Prefix for screenshot filename
 * @returns {Promise<T>}
 * @throws {Error} Original error after taking screenshot
 * 
 * @example
 * const result = await withScreenshotOnFailure(page, async () => {
 *   await page.click('#risky-button');
 * }, { screenshotPrefix: 'click-failed' });
 */
async function withScreenshotOnFailure(page, fn, options = {}) {
  try {
    return await fn();
  } catch (error) {
    try {
      const screenshotPath = await takeScreenshot(page, {
        prefix: options.screenshotPrefix || 'error',
        ...options
      });
      error.screenshotPath = screenshotPath;
    } catch (screenshotError) {
      // Don't let screenshot errors mask original error
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// GRACEFUL DEGRADATION - Fallback patterns
// ═══════════════════════════════════════════════════════════════

/**
 * Execute function with fallback
 * 
 * @template T
 * @param {Function} primary - Primary function
 * @param {Function} fallback - Fallback function
 * @param {...*} args - Arguments to pass
 * @returns {Promise<T>}
 * 
 * @example
 * const result = await withFallback(
 *   () => fetchFromPrimaryAPI(),
 *   () => fetchFromBackupAPI(),
 *   query
 * );
 */
async function withFallback(primary, fallback, ...args) {
  try {
    return await primary(...args);
  } catch (error) {
    return await fallback(...args);
  }
}

/**
 * Try multiple strategies until one succeeds
 * 
 * @template T
 * @param {Array<{name: string, fn: Function}>} strategies - Array of strategies
 * @param {...*} args - Arguments to pass to each strategy
 * @returns {Promise<{success: boolean, result?: T, errors: Error[]}>}
 * 
 * @example
 * const { success, result, errors } = await tryStrategies([
 *   { name: 'API', fn: fetchFromAPI },
 *   { name: 'Cache', fn: fetchFromCache },
 *   { name: 'Default', fn: getDefaultValue }
 * ]);
 */
async function tryStrategies(strategies, ...args) {
  const errors = [];
  
  for (const { name, fn } of strategies) {
    try {
      const result = await fn(...args);
      return { success: true, result, strategy: name, errors };
    } catch (error) {
      errors.push({ strategy: name, error });
    }
  }
  
  return { success: false, errors };
}

/**
 * Execute with timeout and optional fallback
 * 
 * @template T
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {Function} [onTimeout] - Called on timeout
 * @returns {Promise<T|undefined>}
 */
async function withTimeout(fn, timeoutMs, onTimeout) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => {
        const error = new Error(`Operation timed out after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs)
    )
  ]).catch(async (error) => {
    if (error.name === 'TimeoutError' && onTimeout) {
      return await onTimeout();
    }
    throw error;
  });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Delay utilities
  delay,
  randomDelay,
  humanDelay,
  humanType,
  
  // Retry logic
  withRetry,
  CircuitBreaker,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
  
  // CDP management
  CDPManager,
  
  // Selectors
  SELECTORS,
  getSelectors,
  anyOf,
  
  // Logging
  createLogger,
  LOG_LEVELS,
  
  // Screenshots
  takeScreenshot,
  withScreenshotOnFailure,
  SCREENSHOT_CONFIG,
  
  // Graceful degradation
  withFallback,
  tryStrategies,
  withTimeout
};
