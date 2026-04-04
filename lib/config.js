/**
 * Configuration Management Module
 * Centralized config with environment-based overrides
 * 
 * Usage: const config = require('../lib/config');
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // Automation settings
  automation: {
    // Browser settings
    browser: {
      cdpEndpoint: 'http://localhost:9222',
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      timeout: 30000,
    },
    
    // Anti-bot settings
    antiBot: {
      enabled: true,
      minDelay: 2000,
      maxDelay: 5000,
      batchSize: 5,
      batchPauseMin: 10000,
      batchPauseMax: 15000,
    },
    
    // Retry settings
    retry: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
    }
  },
  
  // Email settings
  email: {
    provider: 'icloud',
    from: 'MarvinMartian9@icloud.com',
    fromName: 'Marvin Maverick',
    to: 'alex@1v1a.com',
    smtp: {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false, // STARTTLS
    }
  },
  
  // Paths
  paths: {
    workspace: process.cwd(),
    data: path.join(process.cwd(), 'data'),
    secrets: path.join(process.cwd(), '.secrets'),
    logs: path.join(process.cwd(), 'logs'),
  },
  
  // Feature flags
  features: {
    smsFallback: true,
    emailTracking: true,
    cartVerification: true,
    parallelProcessing: false, // Experimental
  }
};

// ============================================================================
// CONFIGURATION LOADING
// ============================================================================

let cachedConfig = null;

/**
 * Load configuration from file or return defaults
 * @param {string} configPath - Path to config file
 * @returns {Object} Merged configuration
 */
function loadConfig(configPath = null) {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  // Start with defaults
  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  
  // Try to load from file
  const pathsToTry = [
    configPath,
    process.env.MARVIN_CONFIG,
    path.join(process.cwd(), 'config', 'default.json'),
    path.join(process.cwd(), 'config.json'),
  ].filter(Boolean);
  
  for (const tryPath of pathsToTry) {
    try {
      if (fs.existsSync(tryPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(tryPath, 'utf8'));
        config = deepMerge(config, fileConfig);
        break;
      }
    } catch (error) {
      console.warn(`Warning: Could not load config from ${tryPath}:`, error.message);
    }
  }
  
  // Apply environment variable overrides
  config = applyEnvOverrides(config);
  
  // Cache and return
  cachedConfig = config;
  return config;
}

/**
 * Apply environment variable overrides to config
 * @param {Object} config - Current configuration
 * @returns {Object} Config with env overrides applied
 */
function applyEnvOverrides(config) {
  const envMappings = {
    'MARVIN_BROWSER_CDP': ['automation', 'browser', 'cdpEndpoint'],
    'MARVIN_BROWSER_HEADLESS': ['automation', 'browser', 'headless'],
    'MARVIN_EMAIL_FROM': ['email', 'from'],
    'MARVIN_EMAIL_TO': ['email', 'to'],
    'MARVIN_ANTIBOT_ENABLED': ['automation', 'antiBot', 'enabled'],
    'MARVIN_RETRY_MAX': ['automation', 'retry', 'maxRetries'],
  };
  
  for (const [envVar, path] of Object.entries(envMappings)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      setNestedValue(config, path, parseEnvValue(value));
    }
  }
  
  return config;
}

/**
 * Parse environment variable value
 * @param {string} value - Raw env value
 * @returns {any} Parsed value
 */
function parseEnvValue(value) {
  // Boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Number
  if (/^-?\d+$/.test(value)) return parseInt(value);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  
  // JSON
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {}
  }
  
  // String
  return value;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
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
 * Set nested object value
 * @param {Object} obj - Object to modify
 * @param {string[]} path - Path array
 * @param {any} value - Value to set
 */
function setNestedValue(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

/**
 * Get nested object value
 * @param {Object} obj - Object to read
 * @param {string} path - Dot-notation path
 * @param {any} defaultValue - Default if not found
 * @returns {any} Value or default
 */
function get(config, path, defaultValue = undefined) {
  const parts = path.split('.');
  let current = config;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Clear config cache (for testing/hot reload)
 */
function clearCache() {
  cachedConfig = null;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  load: loadConfig,
  get,
  clearCache,
  DEFAULT_CONFIG,
};
