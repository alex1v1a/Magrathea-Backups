/**
 * Marvin Shared Utilities Library
 * Common functions used across automation scripts
 * 
 * Usage: const { randomDelay, retryWithBackoff, log } = require('../lib/utils');
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// DELAY & TIMING UTILITIES
// ============================================================================

/**
 * Generate random delay between min and max milliseconds
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise<void>}
 */
function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Exponential backoff with jitter for retries
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @param {number} maxDelay - Maximum delay in ms (default: 30000)
 * @returns {number} Delay in ms
 */
function exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.floor(Math.random() * (exponential * 0.1)); // 10% jitter
  return exponential + jitter;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {Function} options.onRetry - Callback on retry (attempt, error) => void
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, onRetry } = options;
  
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      
      const delay = exponentialBackoff(attempt, baseDelay, maxDelay);
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Retry with specific conditions
 * @param {Function} fn - Function to retry
 * @param {Function} shouldRetry - (error) => boolean - whether to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} Function result
 */
async function retryWithCondition(fn, shouldRetry, options = {}) {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = LOG_LEVELS.INFO;

/**
 * Set global log level
 * @param {string} level - DEBUG, INFO, WARN, ERROR
 */
function setLogLevel(level) {
  currentLogLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
}

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @returns {string} Formatted message
 */
function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log debug message
 * @param {string} message - Message to log
 */
function logDebug(message) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    console.log(formatLog('DEBUG', message));
  }
}

/**
 * Log info message
 * @param {string} message - Message to log
 */
function logInfo(message) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', message));
  }
}

/**
 * Log warning message
 * @param {string} message - Message to log
 */
function logWarn(message) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message));
  }
}

/**
 * Log error message
 * @param {string} message - Message to log
 * @param {Error} error - Optional error object
 */
function logError(message, error) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message));
    if (error?.stack) {
      console.error(error.stack);
    }
  }
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Read JSON file safely
 * @param {string} filePath - Path to JSON file
 * @param {any} defaultValue - Default value if file doesn't exist or is invalid
 * @returns {Promise<any>} Parsed JSON or default value
 */
async function readJson(filePath, defaultValue = null) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Write JSON file atomically
 * @param {string} filePath - Path to write
 * @param {any} data - Data to write
 * @param {number} spaces - JSON indentation (default: 2)
 * @returns {Promise<void>}
 */
async function writeJson(filePath, data, spaces = 2) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, spaces) + '\n', 'utf8');
  await fs.rename(tempPath, filePath);
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - Date to format (default: now)
 * @returns {string} Formatted date
 */
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Format datetime as ISO string
 * @param {Date} date - Date to format (default: now)
 * @returns {string} ISO datetime
 */
function formatDateTime(date = new Date()) {
  return date.toISOString();
}

/**
 * Get relative time string
 * @param {Date} date - Date to compare
 * @returns {string} Relative time (e.g., "2 hours ago")
 */
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string for safe filename
 * @param {string} str - String to sanitize
 * @returns {string} Safe filename
 */
function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  // Delay & timing
  randomDelay,
  exponentialBackoff,
  sleep,
  
  // Retry
  retryWithBackoff,
  retryWithCondition,
  
  // Logging
  setLogLevel,
  logDebug,
  logInfo,
  logWarn,
  logError,
  LOG_LEVELS,
  
  // File operations
  readJson,
  writeJson,
  ensureDir,
  fileExists,
  
  // Date/time
  formatDate,
  formatDateTime,
  getRelativeTime,
  
  // Validation
  isValidEmail,
  isValidUrl,
  sanitizeFilename
};
