/**
 * @fileoverview Configuration loader with validation and environment support.
 * Loads and validates configuration from config/ directory.
 * @module config
 */

const fs = require('fs');
const path = require('path');
const { ConfigError, ValidationError } = require('../lib/errors');

const CONFIG_DIR = path.join(__dirname);
const SECRETS_DIR = path.join(__dirname, '..', '.secrets');
const ENV_FILE = path.join(__dirname, '..', '.env');

// Load .env file if exists
try {
  if (fs.existsSync(ENV_FILE)) {
    require('dotenv').config({ path: ENV_FILE });
  }
} catch {
  // dotenv not installed, continue
}

/**
 * Configuration schema for validation.
 * @constant {Object}
 */
const CONFIG_SCHEMA = {
  browser: {
    type: 'object',
    required: true,
    properties: {
      debugPort: { type: 'number', min: 1024, max: 65535 },
      headless: { type: 'boolean' },
      defaultViewport: { type: 'object' },
      userAgent: { type: 'string' },
      timeouts: { type: 'object' }
    }
  },
  antiBot: {
    type: 'object',
    required: true,
    properties: {
      minDelay: { type: 'number', min: 0 },
      maxDelay: { type: 'number', min: 0 },
      batchSize: { type: 'number', min: 1 },
      retryAttempts: { type: 'number', min: 1 }
    }
  },
  heb: {
    type: 'object',
    required: false,
    properties: {
      baseUrl: { type: 'string', pattern: /^https?:\/\// },
      selectors: { type: 'object' }
    }
  },
  facebook: {
    type: 'object',
    required: false,
    properties: {
      baseUrl: { type: 'string', pattern: /^https?:\/\// },
      selectors: { type: 'object' }
    }
  },
  email: {
    type: 'object',
    required: false,
    properties: {
      smtp: { type: 'object' },
      imap: { type: 'object' }
    }
  },
  logging: {
    type: 'object',
    required: false,
    properties: {
      level: { type: 'string', enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] },
      dir: { type: 'string' }
    }
  }
};

/**
 * Load raw JSON config file.
 * 
 * @param {string} filename - Config filename
 * @returns {Object|null} Parsed config or null if not found
 */
function loadConfigFile(filename) {
  const filepath = path.join(CONFIG_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    // Replace environment variables
    const interpolated = content.replace(/\$\{(\w+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
    return JSON.parse(interpolated);
  } catch (error) {
    throw new ConfigError(
      `Failed to load config file: ${filename}`,
      'CONFIG_LOAD_ERROR',
      { cause: error }
    );
  }
}

/**
 * Validate a value against schema.
 * 
 * @param {*} value - Value to validate
 * @param {Object} schema - Validation schema
 * @param {string} path - Current path for error messages
 * @returns {Array} Array of validation errors
 */
function validateValue(value, schema, path = '') {
  const errors = [];
  
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
      return errors;
    }
  }
  
  if (schema.min !== undefined && value < schema.min) {
    errors.push(`${path}: Value ${value} is less than minimum ${schema.min}`);
  }
  
  if (schema.max !== undefined && value > schema.max) {
    errors.push(`${path}: Value ${value} is greater than maximum ${schema.max}`);
  }
  
  if (schema.pattern && !schema.pattern.test(value)) {
    errors.push(`${path}: Value does not match required pattern`);
  }
  
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: Value must be one of: ${schema.enum.join(', ')}`);
  }
  
  if (schema.properties && typeof value === 'object') {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) {
        errors.push(...validateValue(value[key], propSchema, `${path}.${key}`));
      }
    }
  }
  
  return errors;
}

/**
 * Validate configuration object.
 * 
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
  const errors = [];
  
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    if (schema.required && config[key] === undefined) {
      errors.push(`Missing required config: ${key}`);
      continue;
    }
    
    if (config[key] !== undefined) {
      errors.push(...validateValue(config[key], schema, key));
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Deep merge objects.
 * 
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}

/**
 * Load and merge configuration from all sources.
 * 
 * @param {Object} [options={}] - Options
 * @param {string} [options.env] - Environment name (development, production, test)
 * @param {boolean} [options.validate=true] - Validate configuration
 * @returns {Object} Merged configuration
 * @throws {ConfigError|ValidationError} If loading or validation fails
 * 
 * @example
 * const config = loadConfig({ env: 'production' });
 * const browserPort = config.browser.debugPort;
 */
function loadConfig(options = {}) {
  const { env = process.env.NODE_ENV || 'development', validate = true } = options;
  
  // Start with default config
  let config = loadConfigFile('default.json') || {};
  
  // Merge environment-specific config
  const envConfig = loadConfigFile(`${env}.json`);
  if (envConfig) {
    config = deepMerge(config, envConfig);
  }
  
  // Merge local config (gitignored)
  const localConfig = loadConfigFile('local.json');
  if (localConfig) {
    config = deepMerge(config, localConfig);
  }
  
  // Load secrets
  const secretsPath = path.join(SECRETS_DIR, 'config-secrets.json');
  if (fs.existsSync(secretsPath)) {
    try {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      config = deepMerge(config, secrets);
    } catch (error) {
      throw new ConfigError(
        'Failed to load secrets',
        'SECRETS_LOAD_ERROR',
        { cause: error }
      );
    }
  }
  
  // Environment variable overrides
  const envOverrides = {
    'browser.debugPort': process.env.BROWSER_DEBUG_PORT,
    'browser.headless': process.env.BROWSER_HEADLESS === 'true',
    'logging.level': process.env.LOG_LEVEL,
    'antiBot.minDelay': process.env.ANTI_BOT_MIN_DELAY,
    'antiBot.maxDelay': process.env.ANTI_BOT_MAX_DELAY
  };
  
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value !== undefined) {
      const parts = key.split('.');
      let current = config;
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }
  }
  
  // Validate
  if (validate) {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new ValidationError(
        'Configuration validation failed',
        'CONFIG_VALIDATION_FAILED',
        { errors: validation.errors }
      );
    }
  }
  
  // Set environment info
  config._meta = {
    loaded: new Date().toISOString(),
    environment: env,
    validated
  };
  
  return config;
}

/**
 * Get a config value using dot notation.
 * 
 * @param {Object} config - Configuration object
 * @param {string} key - Dot-notation key (e.g., 'browser.debugPort')
 * @param {*} [defaultValue] - Default if not found
 * @returns {*} Config value
 * 
 * @example
 * const port = get(config, 'browser.debugPort', 9222);
 */
function get(config, key, defaultValue) {
  const parts = key.split('.');
  let value = config;
  
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return defaultValue;
    }
  }
  
  return value !== undefined ? value : defaultValue;
}

/**
 * Save configuration to file.
 * 
 * @param {Object} config - Configuration to save
 * @param {string} [filename='local.json'] - Filename
 * @returns {string} Path to saved file
 */
function saveConfig(config, filename = 'local.json') {
  const filepath = path.join(CONFIG_DIR, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
    return filepath;
  } catch (error) {
    throw new ConfigError(
      `Failed to save config: ${filename}`,
      'CONFIG_SAVE_ERROR',
      { cause: error }
    );
  }
}

// Export singleton instance
let cachedConfig = null;

/**
 * Get cached configuration or load new.
 * @returns {Object} Configuration object
 */
function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Clear configuration cache.
 */
function clearCache() {
  cachedConfig = null;
}

module.exports = {
  loadConfig,
  getConfig,
  validateConfig,
  get,
  saveConfig,
  clearCache,
  CONFIG_SCHEMA
};
