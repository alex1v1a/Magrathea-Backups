/**
 * @fileoverview Marvin Automation Framework - Main Entry Point
 * Unified exports for all shared utilities and automation components.
 * 
 * @module lib
 * 
 * @example
 * const { 
 *   AutomationTask, 
 *   HEBPlugin, 
 *   sendEmail, 
 *   logger,
 *   retryWithBackoff 
 * } = require('./lib');
 */

// Core automation components
const { AutomationTask } = require('./automation-task');
const { HEBPlugin } = require('./plugins/heb-plugin');
const { FacebookPlugin } = require('./plugins/facebook-plugin');

// Utilities
const { getPool, shutdownPool } = require('./browser-pool');
const config = require('./config');
const { MarvinLogger, logger } = require('./logger');
const { printReport } = require('./metrics');
const { 
  CircuitBreaker, 
  retryWithBackoff, 
  retryWithFilter, 
  Bulkhead 
} = require('./retry-manager');

// Error handling
const {
  MarvinError,
  BrowserError,
  NetworkError,
  ConfigError,
  AuthError,
  TimeoutError,
  ValidationError,
  isRetryableError,
  withErrorHandling
} = require('./errors');

// Extended error handling (new)
const {
  AutomationError,
  SelectorError,
  ErrorRecovery,
  withScreenshotOnError,
  captureErrorScreenshot,
  ErrorCodes,
  classifyError,
  isRetryable,
  ErrorAggregator
} = require('./error-handling');

// Automation utilities (new)
const {
  delay,
  randomDelay,
  humanDelay,
  humanType,
  withRetry,
  CDPManager,
  SELECTORS,
  getSelectors,
  anyOf,
  createLogger,
  LOG_LEVELS,
  takeScreenshot,
  withScreenshotOnFailure,
  withFallback,
  tryStrategies,
  withTimeout,
  CircuitBreaker: CircuitBreakerNew,
  isRetryableError: isRetryableErrorNew,
  DEFAULT_RETRY_CONFIG
} = require('./automation-utils');

// Config validator (new)
const {
  CONFIG_SCHEMA,
  validateConfig,
  validateSecrets,
  applyDefaults,
  getSchemaForPath,
  generateSchemaDocs,
  findHardcodedSecrets
} = require('./config-validator');

// File utilities
const {
  ensureDir,
  readJsonSafe,
  writeJsonSafe,
  appendFileSafe,
  findFiles,
  getFileStats,
  deleteSafe,
  moveFileSafe
} = require('./file-utils');

// Date utilities
const {
  formatDate,
  parseDate,
  startOf,
  addTime,
  diff,
  formatDuration,
  dateRange,
  relativeTime
} = require('./date-utils');

// Email utilities
const {
  createTransporter,
  sendEmail,
  sendEmailBatch,
  sendTemplateEmail,
  recordSentEmail,
  getEmailStats,
  parseEmail,
  DEFAULT_CONFIG: EMAIL_DEFAULTS
} = require('./email-utils');

// Browser helpers
const {
  DEFAULT_TIMEOUTS,
  SITE_SELECTORS,
  waitForElement,
  waitForAnyElement,
  safeClick,
  safeType,
  waitForPageLoad,
  elementExists,
  getElementText,
  extractData,
  applyStealth,
  connectToChrome,
  takeScreenshot,
  getSiteSelectors
} = require('./browser-helpers');

/**
 * Package version
 * @constant {string}
 */
const VERSION = '2.1.0';

/**
 * Framework metadata
 * @constant {Object}
 */
const FRAMEWORK = {
  name: 'Marvin Automation Framework',
  version: VERSION,
  description: 'Unified automation utilities for HEB, Facebook, and email operations'
};

// Export all components organized by category
module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // Framework metadata
  // ═══════════════════════════════════════════════════════════════
  VERSION,
  FRAMEWORK,

  // ═══════════════════════════════════════════════════════════════
  // Core automation components
  // ═══════════════════════════════════════════════════════════════
  /** @type {AutomationTask} Base automation task class */
  AutomationTask,
  
  /** @type {HEBPlugin} HEB automation plugin */
  HEBPlugin,
  
  /** @type {FacebookPlugin} Facebook automation plugin */
  FacebookPlugin,

  // ═══════════════════════════════════════════════════════════════
  // Browser pool management
  // ═══════════════════════════════════════════════════════════════
  /** Get browser pool singleton */
  getPool,
  /** Shutdown browser pool */
  shutdownPool,

  // ═══════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════
  /** Configuration manager */
  config,

  // ═══════════════════════════════════════════════════════════════
  // Logging
  // ═══════════════════════════════════════════════════════════════
  /** @type {MarvinLogger} Logger class */
  MarvinLogger,
  /** Default logger instance */
  logger,
  /** Print metrics report */
  printReport,

  // ═══════════════════════════════════════════════════════════════
  // Retry and resilience patterns
  // ═══════════════════════════════════════════════════════════════
  /** Circuit breaker pattern */
  CircuitBreaker,
  /** Retry with exponential backoff */
  retryWithBackoff,
  /** Retry with error filtering */
  retryWithFilter,
  /** Bulkhead pattern for concurrency limiting */
  Bulkhead,

  // ═══════════════════════════════════════════════════════════════
  // Error handling (legacy)
  // ═══════════════════════════════════════════════════════════════
  /** @type {MarvinError} Base error class */
  MarvinError,
  /** @type {BrowserError} Browser automation error */
  BrowserError,
  /** @type {NetworkError} Network error */
  NetworkError,
  /** @type {ConfigError} Configuration error */
  ConfigError,
  /** @type {AuthError} Authentication error */
  AuthError,
  /** @type {TimeoutError} Timeout error */
  TimeoutError,
  /** @type {ValidationError} Validation error */
  ValidationError,
  /** Check if error is retryable */
  isRetryableError,
  /** Wrap function with error handling */
  withErrorHandling,

  // ═══════════════════════════════════════════════════════════════
  // Extended error handling (new)
  // ═══════════════════════════════════════════════════════════════
  /** @type {AutomationError} Enhanced error class with screenshots */
  AutomationError,
  /** @type {SelectorError} Element selector errors */
  SelectorError,
  /** Error recovery strategies */
  ErrorRecovery,
  /** Wrap with automatic screenshot on error */
  withScreenshotOnError,
  /** Capture error screenshot */
  captureErrorScreenshot,
  /** Error code constants */
  ErrorCodes,
  /** Classify error type */
  classifyError,
  /** Check if error is retryable (new) */
  isRetryable,
  /** Aggregate multiple errors */
  ErrorAggregator,

  // ═══════════════════════════════════════════════════════════════
  // Automation utilities (new)
  // ═══════════════════════════════════════════════════════════════
  /** Simple delay */
  delay,
  /** Random delay within range */
  randomDelay,
  /** Human-like delay by action type */
  humanDelay,
  /** Type with human delays */
  humanType,
  /** Retry with exponential backoff (new) */
  withRetry,
  /** CDP connection manager */
  CDPManager,
  /** Site-specific selectors */
  SELECTORS,
  /** Get selectors for site */
  getSelectors,
  /** Combine multiple selectors */
  anyOf,
  /** Create structured logger */
  createLogger,
  /** Log level constants */
  LOG_LEVELS,
  /** Take timestamped screenshot */
  takeScreenshot,
  /** Wrap with screenshot on failure */
  withScreenshotOnFailure,
  /** Execute with fallback */
  withFallback,
  /** Try multiple strategies */
  tryStrategies,
  /** Execute with timeout */
  withTimeout,
  /** Default retry configuration */
  DEFAULT_RETRY_CONFIG,

  // ═══════════════════════════════════════════════════════════════
  // Configuration validation (new)
  // ═══════════════════════════════════════════════════════════════
  /** Configuration schema definition */
  CONFIG_SCHEMA,
  /** Validate configuration object */
  validateConfig,
  /** Validate secrets placement */
  validateSecrets,
  /** Apply default values */
  applyDefaults,
  /** Get schema for config path */
  getSchemaForPath,
  /** Generate schema documentation */
  generateSchemaDocs,
  /** Find hardcoded secrets */
  findHardcodedSecrets,

  // ═══════════════════════════════════════════════════════════════
  // File utilities
  // ═══════════════════════════════════════════════════════════════
  /** Ensure directory exists */
  ensureDir,
  /** Read JSON file safely */
  readJsonSafe,
  /** Write JSON file safely */
  writeJsonSafe,
  /** Append to file safely */
  appendFileSafe,
  /** Find files matching pattern */
  findFiles,
  /** Get file statistics */
  getFileStats,
  /** Delete file/directory safely */
  deleteSafe,
  /** Move file safely */
  moveFileSafe,

  // ═══════════════════════════════════════════════════════════════
  // Date utilities
  // ═══════════════════════════════════════════════════════════════
  /** Format date to string */
  formatDate,
  /** Parse date from various formats */
  parseDate,
  /** Get start of time period */
  startOf,
  /** Add time to date */
  addTime,
  /** Calculate difference between dates */
  diff,
  /** Format duration in ms */
  formatDuration,
  /** Generate date range */
  dateRange,
  /** Get relative time description */
  relativeTime,

  // ═══════════════════════════════════════════════════════════════
  // Email utilities
  // ═══════════════════════════════════════════════════════════════
  /** Create email transporter */
  createTransporter,
  /** Send single email */
  sendEmail,
  /** Send batch of emails */
  sendEmailBatch,
  /** Send templated email */
  sendTemplateEmail,
  /** Record sent email for tracking */
  recordSentEmail,
  /** Get email statistics */
  getEmailStats,
  /** Parse raw email content */
  parseEmail,
  /** Default email configuration */
  EMAIL_DEFAULTS,

  // ═══════════════════════════════════════════════════════════════
  // Browser helpers
  // ═══════════════════════════════════════════════════════════════
  /** Default timeout values */
  DEFAULT_TIMEOUTS,
  /** Site-specific selectors */
  SITE_SELECTORS,
  /** Wait for element with retry */
  waitForElement,
  /** Wait for any of multiple elements */
  waitForAnyElement,
  /** Safe click with retry */
  safeClick,
  /** Safe type with human delays */
  safeType,
  /** Wait for page load */
  waitForPageLoad,
  /** Check if element exists */
  elementExists,
  /** Get element text content */
  getElementText,
  /** Extract data from multiple elements */
  extractData,
  /** Apply stealth patches */
  applyStealth,
  /** Connect to Chrome via CDP */
  connectToChrome,
  /** Take timestamped screenshot */
  takeScreenshot,
  /** Get selectors for specific site */
  getSiteSelectors
};

// ═══════════════════════════════════════════════════════════════
// CLI usage (when run directly)
// ═══════════════════════════════════════════════════════════════
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  
  const commands = {
    /**
     * Run HEB cart automation
     */
    async heb() {
      const plugin = new HEBPlugin();
      return await plugin.execute();
    },
    
    /**
     * Run Facebook automation
     * @param {string} action - Action to perform
     */
    async facebook(action = 'messages') {
      const plugin = new FacebookPlugin({ action });
      return await plugin.execute();
    },
    
    /**
     * Show metrics report
     * @param {string} hours - Hours to look back
     */
    async metrics(hours = '24') {
      await printReport(parseInt(hours));
    },
    
    /**
     * Show system status
     */
    async status() {
      const pool = getPool();
      console.log('\n📊 Marvin Automation Framework Status');
      console.log('=' .repeat(50));
      console.log(`Version: ${VERSION}`);
      console.log('Browser Pool:', pool.getStats());
      console.log('=' .repeat(50));
    },
    
    /**
     * Show available utilities
     */
    async utils() {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║        Marvin Automation Framework - Utilities               ║
╠══════════════════════════════════════════════════════════════╣
║ Error Classes:                                               ║
║   MarvinError, BrowserError, NetworkError, ConfigError      ║
║   AuthError, TimeoutError, ValidationError                  ║
║                                                              ║
║ File Utilities:                                              ║
║   ensureDir, readJsonSafe, writeJsonSafe, appendFileSafe    ║
║   findFiles, getFileStats, deleteSafe, moveFileSafe         ║
║                                                              ║
║ Date Utilities:                                              ║
║   formatDate, parseDate, startOf, addTime, diff             ║
║   formatDuration, dateRange, relativeTime                   ║
║                                                              ║
║ Email Utilities:                                             ║
║   createTransporter, sendEmail, sendEmailBatch              ║
║   sendTemplateEmail, recordSentEmail, getEmailStats         ║
║                                                              ║
║ Browser Helpers:                                             ║
║   waitForElement, waitForAnyElement, safeClick, safeType    ║
║   extractData, connectToChrome, takeScreenshot              ║
║                                                              ║
║ Retry Patterns:                                              ║
║   CircuitBreaker, retryWithBackoff, retryWithFilter         ║
║   Bulkhead, isRetryableError, withErrorHandling             ║
╚══════════════════════════════════════════════════════════════╝
      `);
    },
    
    /**
     * Show help
     */
    async help() {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║        Marvin Automation Framework v${VERSION}                    ║
╠══════════════════════════════════════════════════════════════╣
║ Commands:                                                    ║
║   node lib/index.js heb              Run HEB automation     ║
║   node lib/index.js facebook [act]   Run Facebook auto      ║
║   node lib/index.js metrics [hrs]    Show metrics report    ║
║   node lib/index.js status           Show system status     ║
║   node lib/index.js utils            List all utilities     ║
║   node lib/index.js help             Show this help         ║
║                                                              ║
║ Examples:                                                    ║
║   node lib/index.js heb                                    ║
║   node lib/index.js facebook messages                      ║
║   node lib/index.js facebook share                         ║
║   node lib/index.js metrics 48                             ║
║                                                              ║
║ Module Usage:                                                ║
║   const { sendEmail, logger } = require('./lib');          ║
║   const { formatDate, retryWithBackoff } = require('./lib');║
╚══════════════════════════════════════════════════════════════╝
      `);
    }
  };
  
  (async () => {
    try {
      const cmd = commands[command] || commands.help;
      await cmd(...args);
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    } finally {
      await shutdownPool();
    }
  })();
}
