/**
 * Common Utilities Library for Dinner Automation
 * Shared functions used across multiple scripts
 * 
 * Usage:
 *   const { delay, retry, loadConfig, log } = require('../lib/common');
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// DELAY UTILITIES
// ============================================================================

/**
 * Random delay between min and max milliseconds
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise<void>}
 */
function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Gaussian random delay for more human-like patterns
 * Most delays cluster around the mean
 * @param {number} min - Minimum delay
 * @param {number} max - Maximum delay
 * @returns {number} Delay in milliseconds
 */
function gaussianRandom(min, max) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6;
  const result = Math.round(mean + z * stdDev);
  return Math.max(min, Math.min(max, result));
}

/**
 * Exponential backoff for retries
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} base - Base delay in ms (default 1000)
 * @param {number} max - Maximum delay in ms (default 30000)
 * @returns {number} Delay in milliseconds
 */
function exponentialBackoff(attempt, base = 1000, max = 30000) {
  const delay = Math.min(base * Math.pow(2, attempt), max);
  const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
  return Math.floor(delay + jitter);
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default 3)
 * @param {number} options.baseDelay - Base delay in ms (default 1000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @returns {Promise<any>} Function result
 */
async function retry(fn, options = {}) {
  const { 
    maxRetries = 3, 
    baseDelay = 1000,
    shouldRetry = () => true 
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = exponentialBackoff(attempt, baseDelay);
      log('warn', `Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Retry with specific condition check
 * @param {Function} condition - Function returning true when condition is met
 * @param {Object} options - Options
 * @param {number} options.maxAttempts - Maximum attempts (default 5)
 * @param {number} options.delay - Delay between checks (default 2000)
 * @param {string} options.timeoutMessage - Message on timeout
 */
async function retryUntil(condition, options = {}) {
  const { maxAttempts = 5, delay = 2000, timeoutMessage = 'Condition not met' } = options;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await condition()) {
      return true;
    }
    await randomDelay(delay * 0.8, delay * 1.2);
  }
  
  throw new Error(timeoutMessage);
}

// ============================================================================
// CONFIGURATION UTILITIES
// ============================================================================

const CONFIG_PATHS = {
  secrets: path.join(__dirname, '..', '..', '.secrets'),
  data: path.join(__dirname, '..', '..', 'dinner-automation', 'data'),
  docs: path.join(__dirname, '..', '..', 'docs')
};

/**
 * Load JSON config file with caching
 */
const configCache = new Map();

async function loadConfig(name, useCache = true) {
  // Check cache
  if (useCache && configCache.has(name)) {
    return configCache.get(name);
  }
  
  const configPath = path.join(CONFIG_PATHS.secrets, `${name}.json`);
  
  try {
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    
    if (useCache) {
      configCache.set(name, config);
    }
    
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Load data file from dinner-automation/data
 */
async function loadData(filename, useCache = false) {
  const cacheKey = `data:${filename}`;
  
  if (useCache && configCache.has(cacheKey)) {
    return configCache.get(cacheKey);
  }
  
  const filePath = path.join(CONFIG_PATHS.data, filename);
  
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    if (useCache) {
      configCache.set(cacheKey, parsed);
    }
    
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Save data file
 */
async function saveData(filename, data) {
  const filePath = path.join(CONFIG_PATHS.data, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  // Invalidate cache
  const cacheKey = `data:${filename}`;
  configCache.delete(cacheKey);
}

/**
 * Clear config cache
 */
function clearConfigCache() {
  configCache.clear();
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

let currentLogLevel = LOG_LEVELS.info;

/**
 * Set global log level
 * @param {string} level - 'error', 'warn', 'info', or 'debug'
 */
function setLogLevel(level) {
  currentLogLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
}

/**
 * Structured logging with levels
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > currentLogLevel) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const emoji = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍',
    success: '✅'
  }[level] || '📝';
  
  const logLine = `[${timestamp}] ${emoji} ${message}`;
  
  if (Object.keys(meta).length > 0) {
    console.log(logLine, meta);
  } else {
    console.log(logLine);
  }
}

/**
 * Create a logger with a specific context
 * @param {string} context - Context name (e.g., 'HEB', 'Email')
 */
function createLogger(context) {
  return {
    error: (msg, meta) => log('error', `[${context}] ${msg}`, meta),
    warn: (msg, meta) => log('warn', `[${context}] ${msg}`, meta),
    info: (msg, meta) => log('info', `[${context}] ${msg}`, meta),
    debug: (msg, meta) => log('debug', `[${context}] ${msg}`, meta),
    success: (msg, meta) => log('success', `[${context}] ${msg}`, meta)
  };
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read JSON file safely
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
 * Write JSON file with pretty printing
 */
async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Atomic file write (write to temp, then rename)
 */
async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await writeJson(tempPath, data);
  await fs.rename(tempPath, filePath);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email address format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number (basic US format)
 */
function isValidPhone(phone) {
  return /^\+?1?\d{10,11}$/.test(phone.replace(/\D/g, ''));
}

/**
 * Validate date string
 */
function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

// ============================================================================
// ARRAY/OBJECT UTILITIES
// ============================================================================

/**
 * Chunk array into smaller arrays
 */
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Group array by key
 */
function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * Pick specific keys from object
 */
function pick(obj, keys) {
  return keys.reduce((picked, key) => {
    if (key in obj) {
      picked[key] = obj[key];
    }
    return picked;
  }, {});
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Generate unique ID
 */
function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Format date for display
 */
function formatDate(date, format = 'short') {
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Parse time string to minutes
 */
function parseTimeToMinutes(timeStr) {
  const match = timeStr.match(/(\d+)\s*(min|hour|hr)s?/i);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  return unit.startsWith('hour') || unit === 'hr' ? value * 60 : value;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// HTTP UTILITIES
// ============================================================================

const https = require('https');
const http = require('http');

/**
 * Simple HTTP GET with promise
 */
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(options.timeout || 10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Simple HTTP POST with promise
 */
function httpPost(url, data, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const postData = typeof data === 'string' ? data : JSON.stringify(data);
    
    const urlObj = new URL(url);
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...options.headers
      },
      ...options
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(options.timeout || 10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Delay
  randomDelay,
  gaussianRandom,
  exponentialBackoff,
  sleep,
  
  // Retry
  retry,
  retryUntil,
  
  // Config
  loadConfig,
  loadData,
  saveData,
  clearConfigCache,
  CONFIG_PATHS,
  
  // Logging
  log,
  setLogLevel,
  createLogger,
  LOG_LEVELS,
  
  // File
  ensureDir,
  readJson,
  writeJson,
  writeJsonAtomic,
  
  // Validation
  isValidEmail,
  isValidPhone,
  isValidDate,
  
  // Array/Object
  chunk,
  groupBy,
  pick,
  deepMerge,
  generateId,
  
  // Time
  formatDate,
  parseTimeToMinutes,
  
  // HTTP
  httpGet,
  httpPost
};
