/**
 * @fileoverview Extended Error Classes and Error Handling Utilities
 * Provides standardized error handling with automatic screenshots,
 * error recovery patterns, and detailed error context.
 * 
 * @module lib/error-handling
 * 
 * @example
 * const {
 *   AutomationError,
 *   NetworkError,
 *   SelectorError,
 *   withScreenshotOnError,
 *   ErrorRecovery
 * } = require('./lib/error-handling');
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// BASE ERROR CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Base error class for all automation errors
 * @class AutomationError
 * @extends Error
 */
class AutomationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code for programmatic handling
   * @param {Object} options - Additional options
   * @param {Error} options.cause - Original error that caused this
   * @param {boolean} options.recoverable - Whether error can be recovered from
   * @param {Object} options.context - Additional context data
   * @param {string} options.screenshotPath - Path to error screenshot
   */
  constructor(message, code, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? false;
    this.context = options.context || {};
    this.screenshotPath = options.screenshotPath;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert error to JSON-serializable object
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      context: this.context,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : null,
      screenshotPath: this.screenshotPath,
      stack: this.stack
    };
  }
  
  /**
   * Create formatted error report
   * @returns {string}
   */
  toString() {
    let str = `[${this.code}] ${this.message}`;
    if (this.cause) {
      str += `\n  Caused by: ${this.cause.message}`;
    }
    if (this.screenshotPath) {
      str += `\n  Screenshot: ${this.screenshotPath}`;
    }
    return str;
  }
}

// ═══════════════════════════════════════════════════════════════
// SPECIFIC ERROR CLASSES
// ═══════════════════════════════════════════════════════════════

/**
 * Network-related errors (timeouts, connection failures)
 * These are typically recoverable with retry
 * @class NetworkError
 * @extends AutomationError
 */
class NetworkError extends AutomationError {
  constructor(message, code = 'NETWORK_ERROR', options = {}) {
    super(message, code, { ...options, recoverable: true });
  }
}

/**
 * Browser automation errors
 * @class BrowserError
 * @extends AutomationError
 */
class BrowserError extends AutomationError {
  constructor(message, code = 'BROWSER_ERROR', options = {}) {
    super(message, code, { 
      recoverable: options.recoverable ?? true,
      ...options 
    });
  }
}

/**
 * Element selector errors
 * @class SelectorError
 * @extends AutomationError
 */
class SelectorError extends AutomationError {
  /**
   * @param {string} message - Error message
   * @param {string} selector - The selector that failed
   * @param {Object} options - Additional options
   */
  constructor(message, selector, options = {}) {
    super(message, 'SELECTOR_ERROR', {
      ...options,
      context: { selector, ...options.context }
    });
    this.selector = selector;
  }
}

/**
 * Authentication/login errors
 * @class AuthError
 * @extends AutomationError
 */
class AuthError extends AutomationError {
  constructor(message, code = 'AUTH_ERROR', options = {}) {
    super(message, code, { 
      ...options, 
      recoverable: false // Auth errors usually require manual intervention
    });
  }
}

/**
 * Configuration errors
 * @class ConfigError
 * @extends AutomationError
 */
class ConfigError extends AutomationError {
  constructor(message, code = 'CONFIG_ERROR', options = {}) {
    super(message, code, { 
      ...options, 
      recoverable: false 
    });
  }
}

/**
 * Timeout errors
 * @class TimeoutError
 * @extends AutomationError
 */
class TimeoutError extends AutomationError {
  /**
   * @param {string} message - Error message
   * @param {number} timeoutMs - Timeout duration
   * @param {Object} options - Additional options
   */
  constructor(message, timeoutMs, options = {}) {
    super(message, 'TIMEOUT_ERROR', { 
      ...options, 
      recoverable: true,
      context: { timeoutMs, ...options.context }
    });
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Validation errors
 * @class ValidationError
 * @extends AutomationError
 */
class ValidationError extends AutomationError {
  /**
   * @param {string} message - Error message
   * @param {Array} errors - Array of specific validation errors
   * @param {Object} options - Additional options
   */
  constructor(message, errors = [], options = {}) {
    super(message, 'VALIDATION_ERROR', { 
      ...options, 
      recoverable: false,
      context: { validationErrors: errors, ...options.context }
    });
    this.validationErrors = errors;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR CODES ENUM
// ═══════════════════════════════════════════════════════════════

/**
 * Standardized error codes
 * @constant {Object}
 */
const ErrorCodes = {
  // Network
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  DNS_ERROR: 'DNS_ERROR',
  SSL_ERROR: 'SSL_ERROR',
  
  // Browser
  BROWSER_CRASH: 'BROWSER_CRASH',
  BROWSER_DISCONNECT: 'BROWSER_DISCONNECT',
  PAGE_NAVIGATION_FAILED: 'PAGE_NAVIGATION_FAILED',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_VISIBLE: 'ELEMENT_NOT_VISIBLE',
  CLICK_INTERCEPTED: 'CLICK_INTERCEPTED',
  
  // Auth
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  
  // Config
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
  SECRET_NOT_FOUND: 'SECRET_NOT_FOUND',
  
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED'
};

// ═══════════════════════════════════════════════════════════════
// SCREENSHOT ON ERROR UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Default screenshot configuration
 * @constant {Object}
 */
const DEFAULT_SCREENSHOT_CONFIG = {
  dir: path.join(process.cwd(), 'screenshots', 'errors'),
  fullPage: true,
  format: 'png',
  maxScreenshots: 50 // Keep only recent screenshots
};

/**
 * Ensure screenshot directory exists and cleanup old screenshots
 * @param {string} dir - Directory path
 * @param {number} maxFiles - Maximum number of files to keep
 */
async function manageScreenshotDir(dir, maxFiles = 50) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  
  // Cleanup old screenshots
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.png'))
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        stat: fs.statSync(path.join(dir, f))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
    
    if (files.length > maxFiles) {
      const toDelete = files.slice(maxFiles);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
      }
    }
  } catch (err) {
    // Silent fail for cleanup
  }
}

/**
 * Take screenshot on error and attach to error object
 * 
 * @param {import('playwright-core').Page} page - Playwright page
 * @param {Error} error - Error that occurred
 * @param {Object} config - Screenshot configuration
 * @returns {Promise<string|null>} Path to screenshot or null
 */
async function captureErrorScreenshot(page, error, config = {}) {
  const cfg = { ...DEFAULT_SCREENSHOT_CONFIG, ...config };
  
  if (!page) return null;
  
  await manageScreenshotDir(cfg.dir, cfg.maxScreenshots);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const errorCode = error.code || error.name || 'error';
  const filename = `${errorCode}-${timestamp}.${cfg.format}`;
  const filepath = path.join(cfg.dir, filename);
  
  try {
    await page.screenshot({ 
      path: filepath, 
      fullPage: cfg.fullPage 
    });
    return filepath;
  } catch (screenshotError) {
    // Don't let screenshot errors mask original error
    return null;
  }
}

/**
 * Wrap async function with automatic error screenshot
 * 
 * @template T
 * @param {import('playwright-core').Page} page - Playwright page
 * @param {Function} fn - Function to execute
 * @param {Object} options - Options
 * @param {string} options.errorCode - Error code to use on failure
 * @param {Object} options.screenshotConfig - Screenshot configuration
 * @returns {Promise<T>}
 * @throws {AutomationError} Wrapped error with screenshot
 * 
 * @example
 * const result = await withScreenshotOnError(page, async () => {
 *   await page.click('#submit');
 *   return await page.textContent('#result');
 * }, { errorCode: 'SUBMIT_FAILED' });
 */
async function withScreenshotOnError(page, fn, options = {}) {
  try {
    return await fn();
  } catch (error) {
    // Take screenshot
    const screenshotPath = await captureErrorScreenshot(page, error, options.screenshotConfig);
    
    // Wrap in AutomationError if not already
    if (!(error instanceof AutomationError)) {
      const wrappedError = new AutomationError(
        error.message,
        options.errorCode || ErrorCodes.UNKNOWN_ERROR,
        {
          cause: error,
          screenshotPath,
          context: options.context
        }
      );
      throw wrappedError;
    }
    
    // Attach screenshot to existing AutomationError
    error.screenshotPath = screenshotPath;
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR RECOVERY PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Error recovery manager
 * Provides strategies for recovering from common errors
 */
class ErrorRecovery {
  /**
   * @param {Object} options - Recovery options
   * @param {Function} options.logger - Logger function
   * @param {number} options.maxRetries - Maximum recovery attempts
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.maxRetries = options.maxRetries || 3;
    this.recoveryStrategies = new Map();
    this._registerDefaultStrategies();
  }
  
  /**
   * Register a recovery strategy
   * @param {string} errorCode - Error code to handle
   * @param {Function} strategy - Recovery strategy function
   */
  registerStrategy(errorCode, strategy) {
    this.recoveryStrategies.set(errorCode, strategy);
  }
  
  /**
   * Register default recovery strategies
   * @private
   */
  _registerDefaultStrategies() {
    // Recovery for element not found - try scrolling
    this.registerStrategy(ErrorCodes.ELEMENT_NOT_FOUND, async (error, context) => {
      const { page, selector } = context;
      if (!page || !selector) return false;
      
      try {
        this.logger.log(`[Recovery] Attempting to scroll to ${selector}`);
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(r => setTimeout(r, 500));
        
        // Try again
        await page.locator(selector).first().waitFor({ timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    });
    
    // Recovery for click intercepted - dismiss popups
    this.registerStrategy(ErrorCodes.CLICK_INTERCEPTED, async (error, context) => {
      const { page } = context;
      if (!page) return false;
      
      try {
        this.logger.log('[Recovery] Attempting to dismiss popups');
        const popupSelectors = [
          '[aria-label="Close"]',
          '[aria-label="Dismiss"]',
          'button:has-text("Not Now")',
          'button:has-text("Close")'
        ];
        
        for (const sel of popupSelectors) {
          const btn = await page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await btn.click();
            await new Promise(r => setTimeout(r, 500));
          }
        }
        return true;
      } catch {
        return false;
      }
    });
    
    // Recovery for session expired - refresh page
    this.registerStrategy(ErrorCodes.SESSION_EXPIRED, async (error, context) => {
      const { page } = context;
      if (!page) return false;
      
      try {
        this.logger.log('[Recovery] Attempting to refresh page');
        await page.reload({ waitUntil: 'networkidle' });
        return true;
      } catch {
        return false;
      }
    });
  }
  
  /**
   * Attempt to recover from an error
   * @param {AutomationError} error - Error to recover from
   * @param {Object} context - Recovery context (page, selector, etc.)
   * @returns {Promise<boolean>} Whether recovery succeeded
   */
  async recover(error, context = {}) {
    const strategy = this.recoveryStrategies.get(error.code);
    
    if (!strategy) {
      this.logger.log(`[Recovery] No strategy for ${error.code}`);
      return false;
    }
    
    this.logger.log(`[Recovery] Attempting recovery for ${error.code}`);
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const success = await strategy(error, context);
        if (success) {
          this.logger.log(`[Recovery] Success on attempt ${attempt}`);
          return true;
        }
      } catch (recoveryError) {
        this.logger.error(`[Recovery] Attempt ${attempt} failed:`, recoveryError.message);
      }
      
      if (attempt < this.maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    
    this.logger.log('[Recovery] All recovery attempts failed');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Classify error type from raw error
 * @param {Error} error - Error to classify
 * @returns {string} Error classification
 */
function classifyError(error) {
  const message = error?.message || '';
  
  // Network errors
  if (/timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(message)) {
    return 'network';
  }
  
  // Selector errors
  if (/element.*not.*found|selector.*failed|locator.*resolved/i.test(message)) {
    return 'selector';
  }
  
  // Navigation errors
  if (/navigation|net::ERR|page.*crash/i.test(message)) {
    return 'navigation';
  }
  
  // Auth errors
  if (/login|auth|session|unauthorized|401|403/i.test(message)) {
    return 'auth';
  }
  
  return 'unknown';
}

/**
 * Check if error is potentially retryable
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
function isRetryable(error) {
  if (error instanceof AutomationError) {
    return error.recoverable;
  }
  
  const classification = classifyError(error);
  return ['network', 'selector', 'navigation'].includes(classification);
}

// ═══════════════════════════════════════════════════════════════
// ERROR REPORTING
// ═══════════════════════════════════════════════════════════════

/**
 * Error aggregator for collecting and reporting multiple errors
 */
class ErrorAggregator {
  constructor() {
    this.errors = [];
  }
  
  /**
   * Add error to collection
   * @param {Error} error - Error to add
   * @param {Object} context - Error context
   */
  add(error, context = {}) {
    this.errors.push({
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Check if any errors were collected
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }
  
  /**
   * Get all collected errors
   * @returns {Array}
   */
  getErrors() {
    return this.errors;
  }
  
  /**
   * Generate error report
   * @returns {Object}
   */
  generateReport() {
    const byType = {};
    
    for (const { error } of this.errors) {
      const type = error.name || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;
    }
    
    return {
      total: this.errors.length,
      byType,
      errors: this.errors.map(e => ({
        type: e.error.name,
        message: e.error.message,
        code: e.error.code,
        timestamp: e.timestamp,
        context: e.context
      }))
    };
  }
  
  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Error classes
  AutomationError,
  NetworkError,
  BrowserError,
  SelectorError,
  AuthError,
  ConfigError,
  TimeoutError,
  ValidationError,
  
  // Error codes
  ErrorCodes,
  
  // Screenshot utilities
  withScreenshotOnError,
  captureErrorScreenshot,
  DEFAULT_SCREENSHOT_CONFIG,
  
  // Recovery
  ErrorRecovery,
  
  // Classification
  classifyError,
  isRetryable,
  
  // Aggregation
  ErrorAggregator
};
