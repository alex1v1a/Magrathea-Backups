/**
 * @fileoverview Configuration Schema and Validator
 * Validates configuration against schema and provides helpful error messages.
 * 
 * @module lib/config-validator
 * 
 * @example
 * const { validateConfig, CONFIG_SCHEMA } = require('./lib/config-validator');
 * 
 * const result = validateConfig(myConfig, CONFIG_SCHEMA);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION SCHEMA
// ═══════════════════════════════════════════════════════════════

/**
 * Configuration schema definition
 * Defines the structure, types, and validation rules for all configuration.
 * 
 * @constant {Object}
 */
const CONFIG_SCHEMA = {
  // ─────────────────────────────────────────────────────────────
  // Browser Configuration
  // ─────────────────────────────────────────────────────────────
  browser: {
    description: 'Browser automation settings',
    type: 'object',
    required: true,
    properties: {
      // Chrome/Edge debug port for CDP connections
      debugPort: {
        type: 'number',
        min: 1024,
        max: 65535,
        default: 9222,
        description: 'Chrome DevTools Protocol port'
      },
      // Chrome executable path
      chromePath: {
        type: 'string',
        pattern: /^.*chrome.*\.exe$|^.*msedge.*\.exe$/i,
        description: 'Path to Chrome or Edge executable'
      },
      // Edge configuration for HEB automation
      edge: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
            description: 'Use Edge for HEB automation'
          },
          debugPort: {
            type: 'number',
            default: 9222,
            description: 'Edge debug port for HEB'
          },
          profileDir: {
            type: 'string',
            description: 'Edge profile directory for HEB'
          }
        }
      },
      // Chrome configuration for Facebook automation
      chrome: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
            description: 'Use Chrome for Facebook automation'
          },
          debugPort: {
            type: 'number',
            default: 18800,
            description: 'Chrome debug port for Facebook'
          },
          profileDir: {
            type: 'string',
            description: 'Chrome profile directory for Facebook'
          }
        }
      },
      // Default viewport size
      defaultViewport: {
        type: 'object',
        properties: {
          width: { type: 'number', min: 800, max: 3840, default: 1920 },
          height: { type: 'number', min: 600, max: 2160, default: 1080 }
        }
      },
      // User agent string
      userAgent: {
        type: 'string',
        description: 'Custom user agent string'
      },
      // Timeout settings
      timeouts: {
        type: 'object',
        properties: {
          navigation: { type: 'number', min: 1000, default: 30000 },
          element: { type: 'number', min: 1000, default: 10000 },
          action: { type: 'number', min: 500, default: 5000 },
          download: { type: 'number', min: 1000, default: 60000 }
        }
      },
      // Headless mode
      headless: {
        type: 'boolean',
        default: false,
        description: 'Run browser in headless mode'
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // Anti-Bot Detection Settings
  // ─────────────────────────────────────────────────────────────
  antiBot: {
    description: 'Settings to avoid bot detection',
    type: 'object',
    required: true,
    properties: {
      // Delay between actions
      minDelay: {
        type: 'number',
        min: 0,
        max: 10000,
        default: 500,
        description: 'Minimum delay between actions (ms)'
      },
      maxDelay: {
        type: 'number',
        min: 0,
        max: 30000,
        default: 2000,
        description: 'Maximum delay between actions (ms)'
      },
      // Typing simulation
      typingDelay: {
        type: 'number',
        min: 0,
        max: 500,
        default: 50,
        description: 'Delay between keystrokes (ms)'
      },
      // Batch processing
      batchSize: {
        type: 'number',
        min: 1,
        max: 100,
        default: 5,
        description: 'Items to process before longer pause'
      },
      batchPause: {
        type: 'number',
        min: 1000,
        default: 10000,
        description: 'Pause duration after batch (ms)'
      },
      // Retry settings
      retryAttempts: {
        type: 'number',
        min: 1,
        max: 10,
        default: 3,
        description: 'Number of retry attempts'
      },
      retryDelay: {
        type: 'number',
        min: 100,
        default: 1000,
        description: 'Initial retry delay (ms)'
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // HEB Configuration
  // ─────────────────────────────────────────────────────────────
  heb: {
    description: 'HEB-specific automation settings',
    type: 'object',
    required: false,
    properties: {
      baseUrl: {
        type: 'string',
        pattern: /^https?:\/\//,
        default: 'https://www.heb.com',
        description: 'HEB website base URL'
      },
      loginUrl: {
        type: 'string',
        pattern: /^https?:\/\//,
        default: 'https://www.heb.com/login',
        description: 'HEB login page URL'
      },
      cartUrl: {
        type: 'string',
        pattern: /^https?:\/\//,
        default: 'https://www.heb.com/cart',
        description: 'HEB cart page URL'
      },
      selectors: {
        type: 'object',
        description: 'Custom CSS selectors for HEB'
      },
      credentials: {
        type: 'object',
        description: 'HEB login credentials (use .secrets/)',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'HEB account email'
          },
          password: {
            type: 'string',
            sensitive: true,
            description: 'HEB account password'
          }
        }
      },
      // Two-factor authentication
      twoFactor: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
            description: 'Enable 2FA handling'
          },
          emailProvider: {
            type: 'string',
            enum: ['icloud', 'gmail', 'manual'],
            default: 'icloud',
            description: 'Email provider for 2FA codes'
          },
          verificationTimeout: {
            type: 'number',
            default: 120000,
            description: 'Max time to wait for 2FA code (ms)'
          }
        }
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // Facebook Configuration
  // ─────────────────────────────────────────────────────────────
  facebook: {
    description: 'Facebook-specific automation settings',
    type: 'object',
    required: false,
    properties: {
      baseUrl: {
        type: 'string',
        pattern: /^https?:\/\//,
        default: 'https://www.facebook.com',
        description: 'Facebook base URL'
      },
      marketplace: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
            description: 'Enable Marketplace automation'
          },
          listingUrl: {
            type: 'string',
            pattern: /^https?:\/\/.*facebook\.com\/marketplace/,
            description: 'F-150 listing URL'
          },
          targetGroups: {
            type: 'array',
            items: { type: 'string' },
            description: 'Groups to share listing to'
          },
          postTemplate: {
            type: 'string',
            description: 'Template for post text'
          }
        }
      },
      credentials: {
        type: 'object',
        description: 'Facebook login credentials (use .secrets/)',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Facebook account email'
          },
          password: {
            type: 'string',
            sensitive: true,
            description: 'Facebook account password'
          }
        }
      },
      selectors: {
        type: 'object',
        description: 'Custom CSS selectors for Facebook'
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // Email Configuration
  // ─────────────────────────────────────────────────────────────
  email: {
    description: 'Email client settings',
    type: 'object',
    required: false,
    properties: {
      smtp: {
        type: 'object',
        properties: {
          host: { type: 'string', required: true },
          port: { type: 'number', default: 587 },
          secure: { type: 'boolean', default: false },
          auth: {
            type: 'object',
            properties: {
              user: { type: 'string', required: true },
              pass: { type: 'string', sensitive: true, required: true }
            }
          }
        }
      },
      imap: {
        type: 'object',
        properties: {
          host: { type: 'string', required: true },
          port: { type: 'number', default: 993 },
          tls: { type: 'boolean', default: true },
          auth: {
            type: 'object',
            properties: {
              user: { type: 'string', required: true },
              pass: { type: 'string', sensitive: true, required: true }
            }
          }
        }
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // iCloud Configuration
  // ─────────────────────────────────────────────────────────────
  icloud: {
    description: 'iCloud integration settings',
    type: 'object',
    required: false,
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'iCloud email address'
      },
      appSpecificPassword: {
        type: 'string',
        sensitive: true,
        description: 'iCloud app-specific password'
      },
      calendar: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          calendarName: { type: 'string', default: 'Dinner' }
        }
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // Logging Configuration
  // ─────────────────────────────────────────────────────────────
  logging: {
    description: 'Logging settings',
    type: 'object',
    required: false,
    properties: {
      level: {
        type: 'string',
        enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
        default: 'info',
        description: 'Minimum log level to output'
      },
      dir: {
        type: 'string',
        default: './logs',
        description: 'Directory for log files'
      },
      console: {
        type: 'boolean',
        default: true,
        description: 'Enable console output'
      },
      file: {
        type: 'boolean',
        default: true,
        description: 'Enable file output'
      },
      maxFiles: {
        type: 'number',
        default: 10,
        description: 'Maximum number of log files to keep'
      },
      maxSize: {
        type: 'string',
        pattern: /^\d+[kmg]b?$/i,
        default: '10m',
        description: 'Maximum log file size'
      }
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────
  notifications: {
    description: 'Notification settings',
    type: 'object',
    required: false,
    properties: {
      discord: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: false },
          webhookUrl: {
            type: 'string',
            pattern: /^https:\/\/discord\.com\/api\/webhooks\//,
            description: 'Discord webhook URL'
          },
          channelId: { type: 'string', description: 'Discord channel ID' }
        }
      },
      onError: {
        type: 'boolean',
        default: true,
        description: 'Send notification on errors'
      },
      onSuccess: {
        type: 'boolean',
        default: false,
        description: 'Send notification on success'
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a value against a schema definition
 * 
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition
 * @param {string} path - Current path for error messages
 * @returns {Array<string>} Array of validation errors
 */
function validateValue(value, schema, path = '') {
  const errors = [];
  
  // Check required
  if (schema.required && (value === undefined || value === null)) {
    errors.push(`${path}: Required field is missing`);
    return errors;
  }
  
  // Skip further validation if value is undefined/null and not required
  if (value === undefined || value === null) {
    return errors;
  }
  
  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
      return errors;
    }
  }
  
  // Number validations
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`${path}: Value ${value} is less than minimum ${schema.min}`);
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`${path}: Value ${value} is greater than maximum ${schema.max}`);
    }
  }
  
  // String validations
  if (typeof value === 'string') {
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(`${path}: Value does not match required pattern ${schema.pattern}`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: Value must be one of: ${schema.enum.join(', ')}`);
    }
    if (schema.format === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${path}: Invalid email format`);
      }
    }
  }
  
  // Array validations
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validateValue(item, schema.items, `${path}[${index}]`));
    });
  }
  
  // Object property validations
  if (typeof value === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propValue = value[key];
      const propPath = path ? `${path}.${key}` : key;
      errors.push(...validateValue(propValue, propSchema, propPath));
    }
  }
  
  return errors;
}

/**
 * Validate configuration object against schema
 * 
 * @param {Object} config - Configuration to validate
 * @param {Object} [schema=CONFIG_SCHEMA] - Schema to validate against
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 * 
 * @example
 * const result = validateConfig(myConfig);
 * if (!result.valid) {
 *   console.error('Configuration errors:');
 *   result.errors.forEach(err => console.error('  -', err));
 * }
 */
function validateConfig(config, schema = CONFIG_SCHEMA) {
  const errors = [];
  
  for (const [key, propSchema] of Object.entries(schema)) {
    const value = config[key];
    errors.push(...validateValue(value, propSchema, key));
  }
  
  // Check for unknown properties
  for (const key of Object.keys(config)) {
    if (key.startsWith('_')) continue; // Allow private properties
    if (!schema[key]) {
      errors.push(`Unknown configuration key: ${key}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply default values from schema to config
 * 
 * @param {Object} config - Configuration object
 * @param {Object} [schema=CONFIG_SCHEMA] - Schema with defaults
 * @returns {Object} Config with defaults applied
 */
function applyDefaults(config = {}, schema = CONFIG_SCHEMA) {
  const result = { ...config };
  
  for (const [key, propSchema] of Object.entries(schema)) {
    if (propSchema.type === 'object' && propSchema.properties) {
      result[key] = applyDefaults(result[key], propSchema.properties);
    }
    
    if (result[key] === undefined && propSchema.default !== undefined) {
      result[key] = propSchema.default;
    }
  }
  
  return result;
}

/**
 * Get schema documentation for a specific path
 * 
 * @param {string} path - Dot-notation path (e.g., 'browser.debugPort')
 * @param {Object} [schema=CONFIG_SCHEMA] - Schema to search
 * @returns {Object|null} Schema definition or null
 */
function getSchemaForPath(path, schema = CONFIG_SCHEMA) {
  const parts = path.split('.');
  let current = schema;
  
  for (const part of parts) {
    if (current.properties && current.properties[part]) {
      current = current.properties[part];
    } else if (current[part]) {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return current;
}

/**
 * Generate markdown documentation from schema
 * 
 * @param {Object} [schema=CONFIG_SCHEMA] - Schema to document
 * @param {number} [depth=0] - Current depth for indentation
 * @returns {string} Markdown documentation
 */
function generateSchemaDocs(schema = CONFIG_SCHEMA, depth = 0) {
  const indent = '  '.repeat(depth);
  let docs = '';
  
  for (const [key, def] of Object.entries(schema)) {
    const required = def.required ? ' **(required)**' : '';
    const defaultVal = def.default !== undefined ? ` (default: \`${JSON.stringify(def.default)}\`)` : '';
    
    docs += `${indent}- **${key}**${required}${defaultVal}\n`;
    
    if (def.description) {
      docs += `${indent}  - ${def.description}\n`;
    }
    
    if (def.type) {
      docs += `${indent}  - Type: \`${def.type}\`\n`;
    }
    
    if (def.enum) {
      docs += `${indent}  - Allowed values: ${def.enum.map(v => `\`${v}\``).join(', ')}\n`;
    }
    
    if (def.properties) {
      docs += `${indent}  - Properties:\n`;
      docs += generateSchemaDocs(def.properties, depth + 2);
    }
  }
  
  return docs;
}

// ═══════════════════════════════════════════════════════════════
// SECRETS AUDIT
// ═══════════════════════════════════════════════════════════════

/**
 * Check for hardcoded secrets in configuration
 * 
 * @param {Object} config - Configuration to check
 * @param {string} path - Current path (for recursion)
 * @returns {Array<Object>} Array of potential secrets found
 */
function findHardcodedSecrets(config, path = '') {
  const secrets = [];
  const secretPatterns = [
    { key: /password/i, type: 'password' },
    { key: /secret/i, type: 'secret' },
    { key: /token/i, type: 'token' },
    { key: /api[_-]?key/i, type: 'api_key' },
    { key: /auth/i, type: 'auth' }
  ];
  
  for (const [key, value] of Object.entries(config)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // Check if key matches secret pattern
    const pattern = secretPatterns.find(p => p.key.test(key));
    
    if (pattern && typeof value === 'string' && value.length > 0) {
      secrets.push({
        path: currentPath,
        type: pattern.type,
        suggestion: `Move to .secrets/${key}.json or environment variable`
      });
    }
    
    // Recurse into nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      secrets.push(...findHardcodedSecrets(value, currentPath));
    }
  }
  
  return secrets;
}

/**
 * Validate secrets are not in config files
 * 
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
function validateSecrets(config) {
  const hardcoded = findHardcodedSecrets(config);
  
  return {
    valid: hardcoded.length === 0,
    hardcoded,
    message: hardcoded.length > 0 
      ? `Found ${hardcoded.length} hardcoded secret(s). Move to .secrets/ directory.`
      : 'No hardcoded secrets found'
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Schema
  CONFIG_SCHEMA,
  
  // Validation
  validateConfig,
  validateValue,
  applyDefaults,
  
  // Schema utilities
  getSchemaForPath,
  generateSchemaDocs,
  
  // Security
  findHardcodedSecrets,
  validateSecrets
};
