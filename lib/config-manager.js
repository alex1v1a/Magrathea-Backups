/**
 * @fileoverview Config Manager v2 - Centralized configuration with validation
 * 
 * Features:
 * - Schema-based validation
 * - Environment variable override
 * - Hot reload capability
 * - Secrets management integration
 * - Type coercion and defaults
 * 
 * @module lib/config-manager
 */

const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
  constructor(options = {}) {
    this.configDir = options.configDir || './config';
    this.secretsDir = options.secretsDir || './.secrets';
    this.envPrefix = options.envPrefix || 'MARVIN_';
    
    this.configs = new Map();
    this.schemas = new Map();
    this.watchers = new Map();
    this.hotReload = options.hotReload || false;
  }

  /**
   * Register a configuration schema
   * 
   * @param {string} name - Config name
   * @param {Object} schema - Validation schema
   * @param {Object} defaults - Default values
   */
  register(name, schema, defaults = {}) {
    this.schemas.set(name, { schema, defaults });
  }

  /**
   * Load configuration from file
   * 
   * @param {string} name - Config name
   * @param {Object} options - Load options
   * @returns {Promise<Object>} Validated config
   */
  async load(name, options = {}) {
    const filePath = options.filePath || path.join(this.configDir, `${name}.json`);
    const schemaDef = this.schemas.get(name);
    
    // Load from file
    let fileConfig = {};
    try {
      const content = await fs.readFile(filePath, 'utf8');
      fileConfig = JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to load config ${name}: ${error.message}`);
      }
    }
    
    // Merge with defaults
    const merged = schemaDef 
      ? { ...schemaDef.defaults, ...fileConfig }
      : fileConfig;
    
    // Apply environment overrides
    const withEnv = this.applyEnvOverrides(name, merged);
    
    // Validate
    if (schemaDef) {
      this.validate(name, withEnv, schemaDef.schema);
    }
    
    // Store
    this.configs.set(name, withEnv);
    
    // Watch for changes if hot reload enabled
    if (this.hotReload && !this.watchers.has(name)) {
      this.watchFile(name, filePath);
    }
    
    return withEnv;
  }

  /**
   * Load secrets from .secrets directory
   * 
   * @param {string} name - Secret file name (without .json)
   * @returns {Promise<Object>} Secrets object
   */
  async loadSecrets(name) {
    const filePath = path.join(this.secretsDir, `${name}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const secrets = JSON.parse(content);
      this.configs.set(`secrets.${name}`, secrets);
      return secrets;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Secrets file not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Get configuration value
   * 
   * @param {string} path - Dot-notation path (e.g., 'smtp.host')
   * @param {*} defaultValue - Default if not found
   * @returns {*} Config value
   */
  get(path, defaultValue = undefined) {
    const [configName, ...keyParts] = path.split('.');
    const config = this.configs.get(configName);
    
    if (!config) return defaultValue;
    if (keyParts.length === 0) return config;
    
    return keyParts.reduce((obj, key) => {
      return obj && typeof obj === 'object' ? obj[key] : undefined;
    }, config) ?? defaultValue;
  }

  /**
   * Set configuration value (in-memory only)
   */
  set(path, value) {
    const [configName, ...keyParts] = path.split('.');
    let config = this.configs.get(configName);
    
    if (!config) {
      config = {};
      this.configs.set(configName, config);
    }
    
    let current = config;
    for (let i = 0; i < keyParts.length - 1; i++) {
      const key = keyParts[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keyParts[keyParts.length - 1]] = value;
  }

  /**
   * Validate configuration against schema
   */
  validate(name, config, schema) {
    const errors = [];
    
    for (const [key, def] of Object.entries(schema)) {
      const value = config[key];
      
      // Required check
      if (def.required && (value === undefined || value === null)) {
        errors.push(`${key}: Required field missing`);
        continue;
      }
      
      if (value === undefined || value === null) continue;
      
      // Type check
      if (def.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== def.type) {
          errors.push(`${key}: Expected ${def.type}, got ${actualType}`);
        }
      }
      
      // Enum check
      if (def.enum && !def.enum.includes(value)) {
        errors.push(`${key}: Must be one of ${def.enum.join(', ')}`);
      }
      
      // Range check for numbers
      if (def.type === 'number') {
        if (def.min !== undefined && value < def.min) {
          errors.push(`${key}: Must be >= ${def.min}`);
        }
        if (def.max !== undefined && value > def.max) {
          errors.push(`${key}: Must be <= ${def.max}`);
        }
      }
      
      // Pattern check for strings
      if (def.pattern && typeof value === 'string') {
        const regex = new RegExp(def.pattern);
        if (!regex.test(value)) {
          errors.push(`${key}: Does not match required pattern`);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Config validation failed for ${name}:\n${errors.join('\n')}`);
    }
  }

  applyEnvOverrides(name, config) {
    const envPrefix = `${this.envPrefix}${name.toUpperCase()}_`;
    const result = { ...config };
    
    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (envKey.startsWith(envPrefix)) {
        const configPath = envKey
          .slice(envPrefix.length)
          .toLowerCase()
          .split('_');
        
        let current = result;
        for (let i = 0; i < configPath.length - 1; i++) {
          const key = configPath[i];
          if (!(key in current)) current[key] = {};
          current = current[key];
        }
        
        // Try to parse as JSON, fallback to string
        try {
          current[configPath[configPath.length - 1]] = JSON.parse(envValue);
        } catch {
          current[configPath.length - 1] = envValue;
        }
      }
    }
    
    return result;
  }

  watchFile(name, filePath) {
    // Simple polling-based watch (fs.watch is flaky on Windows)
    let lastMtime = 0;
    
    const check = async () => {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtimeMs > lastMtime) {
          lastMtime = stats.mtimeMs;
          console.log(`📝 Config ${name} changed, reloading...`);
          await this.load(name, { filePath });
        }
      } catch (error) {
        // File might not exist
      }
    };
    
    const interval = setInterval(check, 5000);
    this.watchers.set(name, interval);
  }

  /**
   * Get all loaded configurations
   */
  getAll() {
    return Object.fromEntries(this.configs);
  }

  /**
   * Clear all configs and watchers
   */
  dispose() {
    this.watchers.forEach(interval => clearInterval(interval));
    this.watchers.clear();
    this.configs.clear();
  }
}

// Singleton
let instance = null;

function getConfigManager(options) {
  if (!instance) {
    instance = new ConfigManager(options);
  }
  return instance;
}

module.exports = { ConfigManager, getConfigManager };
