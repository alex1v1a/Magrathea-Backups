/**
 * Config - Unified Configuration Loading
 * 
 * Provides centralized configuration management with support for:
 * - Environment variables
 * - JSON config files
 * - Default values
 * - Type coercion and validation
 * 
 * @module lib/config
 */

const fs = require('fs');
const path = require('path');

// Default configuration values
const DEFAULTS = {
  // Browser settings
  browser: {
    debugPort: 9222,
    edgePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\User Data',
    profile: 'Marvin',
    headless: false
  },
  
  // HEB settings
  heb: {
    baseUrl: 'https://www.heb.com',
    email: process.env.HEB_EMAIL || 'alex@1v1a.com',
    password: process.env.HEB_PASSWORD,
    timeout: 30000,
    retryAttempts: 3
  },
  
  // Facebook settings
  facebook: {
    baseUrl: 'https://www.facebook.com',
    marketplaceUrl: 'https://www.facebook.com/marketplace',
    debugPort: 9224
  },
  
  // Paths
  paths: {
    data: 'data',
    logs: 'logs',
    screenshots: 'screenshots',
    extension: 'heb-extension',
    templates: 'templates'
  },
  
  // Automation settings
  automation: {
    batchSize: 5,
    delayMin: 1000,
    delayMax: 3000,
    maxRetries: 3,
    timeout: 30000
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    structured: false,
    file: null
  }
};

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Get value from nested object using dot notation
 * @param {Object} obj - Object to query
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if not found
 * @returns {any}
 */
function getNestedValue(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * Set value in nested object using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Configuration manager class
 */
class Config {
  constructor(options = {}) {
    this.values = deepMerge({}, DEFAULTS);
    this.configDir = options.configDir || path.join(process.cwd(), 'config');
    this.envPrefix = options.envPrefix || 'DINNER_';
    
    // Load from files and environment
    this.loadFromFiles();
    this.loadFromEnv();
  }

  /**
   * Load configuration from JSON files
   */
  loadFromFiles() {
    const files = ['config.json', 'config.local.json'];
    
    for (const file of files) {
      const filePath = path.join(this.configDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const config = JSON.parse(content);
          this.values = deepMerge(this.values, config);
        } catch (error) {
          console.warn(`Failed to load config from ${file}:`, error.message);
        }
      }
    }
    
    // Also check for config in data directory (legacy support)
    const dataConfigPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataConfigPath)) {
      try {
        const content = fs.readFileSync(dataConfigPath, 'utf8');
        const config = JSON.parse(content);
        this.values = deepMerge(this.values, config);
      } catch (error) {
        console.warn('Failed to load data/config.json:', error.message);
      }
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnv() {
    const envMappings = {
      [`${this.envPrefix}BROWSER_DEBUG_PORT`]: 'browser.debugPort',
      [`${this.envPrefix}BROWSER_HEADLESS`]: 'browser.headless',
      [`${this.envPrefix}HEB_EMAIL`]: 'heb.email',
      [`${this.envPrefix}HEB_PASSWORD`]: 'heb.password',
      [`${this.envPrefix}HEB_TIMEOUT`]: 'heb.timeout',
      [`${this.envPrefix}LOG_LEVEL`]: 'logging.level',
      [`${this.envPrefix}DATA_DIR`]: 'paths.data',
      [`${this.envPrefix}LOGS_DIR`]: 'paths.logs'
    };
    
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        // Try to parse as number or boolean
        const parsed = this.parseValue(value);
        setNestedValue(this.values, configPath, parsed);
      }
    }
    
    // Also load unprefixed common env vars
    const commonMappings = {
      'HEB_EMAIL': 'heb.email',
      'HEB_PASSWORD': 'heb.password',
      'FB_USERNAME': 'facebook.username',
      'FB_PASSWORD': 'facebook.password',
      'LOG_LEVEL': 'logging.level',
      'NODE_ENV': 'env'
    };
    
    for (const [envVar, configPath] of Object.entries(commonMappings)) {
      const value = process.env[envVar];
      if (value !== undefined && getNestedValue(this.values, configPath) === undefined) {
        setNestedValue(this.values, configPath, this.parseValue(value));
      }
    }
  }

  /**
   * Parse a string value to appropriate type
   * @param {string} value - Value to parse
   * @returns {any}
   */
  parseValue(value) {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // JSON
    if ((value.startsWith('{') && value.endsWith('}')) ||
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    return value;
  }

  /**
   * Get configuration value
   * @param {string} path - Dot notation path
   * @param {any} defaultValue - Default value
   * @returns {any}
   */
  get(path, defaultValue = undefined) {
    return getNestedValue(this.values, path, defaultValue);
  }

  /**
   * Set configuration value
   * @param {string} path - Dot notation path
   * @param {any} value - Value to set
   */
  set(path, value) {
    setNestedValue(this.values, path, value);
  }

  /**
   * Check if a path exists in config
   * @param {string} path - Dot notation path
   * @returns {boolean}
   */
  has(path) {
    return getNestedValue(this.values, path) !== undefined;
  }

  /**
   * Get all values (for debugging)
   * @returns {Object}
   */
  getAll() {
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.values));
  }

  /**
   * Get resolved path (relative to project root)
   * @param {string} pathKey - Path configuration key
   * @returns {string}
   */
  getPath(pathKey) {
    const relativePath = this.get(`paths.${pathKey}`);
    if (!relativePath) return null;
    return path.resolve(process.cwd(), relativePath);
  }

  /**
   * Validate required configuration values
   * @param {Array<string>} required - Required paths
   * @returns {Object} { valid: boolean, missing: Array }
   */
  validate(required = []) {
    const missing = [];
    
    for (const path of required) {
      const value = this.get(path);
      if (value === undefined || value === null || value === '') {
        missing.push(path);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Save current configuration to file
   * @param {string} filePath - Path to save
   */
  save(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(this.values, null, 2));
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.values = deepMerge({}, DEFAULTS);
    this.loadFromEnv();
  }
}

// Singleton instance
let singleton = null;

/**
 * Get or create singleton config instance
 * @param {Object} options - Options (only used on first call)
 * @returns {Config}
 */
function getConfig(options = {}) {
  if (!singleton) {
    singleton = new Config(options);
  }
  return singleton;
}

/**
 * Reset singleton (useful for testing)
 */
function resetConfig() {
  singleton = null;
}

/**
 * Create a new config instance (not singleton)
 * @param {Object} options - Configuration options
 * @returns {Config}
 */
function createConfig(options = {}) {
  return new Config(options);
}

module.exports = {
  Config,
  getConfig,
  createConfig,
  resetConfig,
  DEFAULTS,
  deepMerge,
  getNestedValue,
  setNestedValue
};
