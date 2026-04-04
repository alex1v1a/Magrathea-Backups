/**
 * Validation Utilities - Input Validation and Sanitization
 * 
 * Provides consistent validation for user inputs, configuration values,
 * and automation parameters. Helps prevent errors and security issues.
 * 
 * @module lib/validation
 * 
 * @example
 * const { validateEmail, validateUrl, ValidationError } = require('./validation');
 * 
 * try {
 *   validateEmail('user@example.com');
 *   validateUrl('https://heb.com');
 * } catch (e) {
 *   if (e instanceof ValidationError) {
 *     console.error('Validation failed:', e.message);
 *   }
 * }
 */

// ═══════════════════════════════════════════════════════════════
// Custom Error Types
// ═══════════════════════════════════════════════════════════════

/**
 * Validation error with field information
 */
class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      value: this.value
    };
  }
}

/**
 * Multiple validation errors aggregated
 */
class ValidationErrors extends Error {
  constructor(errors = []) {
    super(`${errors.length} validation error(s)`);
    this.name = 'ValidationErrors';
    this.errors = errors;
  }

  get messages() {
    return this.errors.map(e => e.message);
  }

  toJSON() {
    return {
      name: this.name,
      count: this.errors.length,
      errors: this.errors.map(e => e instanceof ValidationError ? e.toJSON() : { message: e.message })
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// String Validators
// ═══════════════════════════════════════════════════════════════

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
function validateEmail(email, field = 'email') {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required', field, email);
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`, field, email);
  }

  return true;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {string} field - Field name for error reporting
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
function validateUrl(url, field = 'url', options = {}) {
  const { allowedProtocols = ['http:', 'https:'], requireProtocol = true } = options;
  
  if (!url || typeof url !== 'string') {
    throw new ValidationError('URL is required', field, url);
  }

  let urlToCheck = url;
  
  // Add protocol if missing and not required
  if (!requireProtocol && !url.includes('://')) {
    urlToCheck = 'https://' + url;
  }

  try {
    const parsed = new URL(urlToCheck);
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new ValidationError(
        `Invalid protocol: ${parsed.protocol}. Allowed: ${allowedProtocols.join(', ')}`,
        field,
        url
      );
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(`Invalid URL: ${url}`, field, url);
  }
}

/**
 * Validate string length
 * @param {string} str - String to validate
 * @param {Object} limits - Min/max limits
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
function validateLength(str, limits = {}, field = 'string') {
  const { min = 0, max = Infinity } = limits;
  
  if (typeof str !== 'string') {
    throw new ValidationError(`${field} must be a string`, field, str);
  }

  if (str.length < min) {
    throw new ValidationError(
      `${field} must be at least ${min} characters`,
      field,
      str
    );
  }

  if (str.length > max) {
    throw new ValidationError(
      `${field} must be at most ${max} characters`,
      field,
      str
    );
  }

  return true;
}

/**
 * Validate string matches pattern
 * @param {string} str - String to validate
 * @param {RegExp} pattern - Pattern to match
 * @param {string} field - Field name for error reporting
 * @param {string} message - Custom error message
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
function validatePattern(str, pattern, field = 'string', message = null) {
  if (typeof str !== 'string') {
    throw new ValidationError(`${field} must be a string`, field, str);
  }

  if (!pattern.test(str)) {
    throw new ValidationError(
      message || `${field} does not match required pattern`,
      field,
      str
    );
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
// Number Validators
// ═══════════════════════════════════════════════════════════════

/**
 * Validate number is within range
 * @param {number} num - Number to validate
 * @param {Object} range - Min/max range
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
function validateRange(num, range = {}, field = 'number') {
  const { min = -Infinity, max = Infinity, integer = false } = range;
  
  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationError(`${field} must be a number`, field, num);
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${field} must be an integer`, field, num);
  }

  if (num < min) {
    throw new ValidationError(
      `${field} must be at least ${min}`,
      field,
      num
    );
  }

  if (num > max) {
    throw new ValidationError(
      `${field} must be at most ${max}`,
      field,
      num
    );
  }

  return true;
}

/**
 * Validate positive number
 * @param {number} num - Number to validate
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
function validatePositive(num, field = 'number') {
  return validateRange(num, { min: 0 }, field);
}

// ═══════════════════════════════════════════════════════════════
// Object/Array Validators
// ═══════════════════════════════════════════════════════════════

/**
 * Validate object has required properties
 * @param {Object} obj - Object to validate
 * @param {string[]} required - Required property names
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError|ValidationErrors} If invalid
 */
function validateRequired(obj, required = [], field = 'object') {
  if (!obj || typeof obj !== 'object') {
    throw new ValidationError(`${field} must be an object`, field, obj);
  }

  const missing = required.filter(key => !(key in obj) || obj[key] === undefined || obj[key] === null);
  
  if (missing.length > 0) {
    throw new ValidationErrors(
      missing.map(key => new ValidationError(
        `Missing required property: ${key}`,
        `${field}.${key}`,
        null
      ))
    );
  }

  return true;
}

/**
 * Validate array items
 * @param {Array} arr - Array to validate
 * @param {Function} itemValidator - Validator function for each item
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationErrors} If invalid
 */
function validateArray(arr, itemValidator = null, field = 'array') {
  if (!Array.isArray(arr)) {
    throw new ValidationError(`${field} must be an array`, field, arr);
  }

  if (!itemValidator) return true;

  const errors = [];
  
  for (let i = 0; i < arr.length; i++) {
    try {
      itemValidator(arr[i], `${field}[${i}]`);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        errors.push(new ValidationError(error.message, `${field}[${i}]`, arr[i]));
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationErrors(errors);
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
// Automation-Specific Validators
// ═══════════════════════════════════════════════════════════════

/**
 * Validate HEB cart item
 * @param {Object} item - Cart item to validate
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError|ValidationErrors} If invalid
 */
function validateHEBCartItem(item, field = 'item') {
  validateRequired(item, ['name'], field);
  
  validateLength(item.name, { min: 1, max: 200 }, `${field}.name`);
  
  if (item.searchTerm !== undefined) {
    validateLength(item.searchTerm, { min: 1, max: 200 }, `${field}.searchTerm`);
  }
  
  if (item.quantity !== undefined) {
    validateRange(item.quantity, { min: 1, max: 100, integer: true }, `${field}.quantity`);
  }
  
  return true;
}

/**
 * Validate Facebook marketplace listing config
 * @param {Object} config - Listing config to validate
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationError|ValidationErrors} If invalid
 */
function validateMarketplaceConfig(config, field = 'config') {
  validateRequired(config, ['listingUrl'], field);
  validateUrl(config.listingUrl, `${field}.listingUrl`);
  
  if (config.groups !== undefined) {
    validateArray(config.groups, 
      (g, f) => validateLength(g, { min: 1 }, f),
      `${field}.groups`
    );
  }
  
  if (config.keywords !== undefined) {
    validateArray(config.keywords,
      (k, f) => validateLength(k, { min: 1 }, f),
      `${field}.keywords`
    );
  }
  
  return true;
}

/**
 * Validate automation configuration
 * @param {Object} config - Automation config
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationErrors} If invalid
 */
function validateAutomationConfig(config, field = 'automation') {
  const errors = [];
  
  // Validate delay settings
  if (config.delays) {
    try {
      validateRange(config.delays.min, { min: 0 }, `${field}.delays.min`);
      validateRange(config.delays.max, { min: 0 }, `${field}.delays.max`);
      
      if (config.delays.min > config.delays.max) {
        throw new ValidationError('min delay cannot be greater than max', `${field}.delays`);
      }
    } catch (error) {
      errors.push(error);
    }
  }
  
  // Validate batch settings
  if (config.batchSize !== undefined) {
    try {
      validateRange(config.batchSize, { min: 1, max: 100, integer: true }, `${field}.batchSize`);
    } catch (error) {
      errors.push(error);
    }
  }
  
  // Validate retry settings
  if (config.maxRetries !== undefined) {
    try {
      validateRange(config.maxRetries, { min: 0, max: 10, integer: true }, `${field}.maxRetries`);
    } catch (error) {
      errors.push(error);
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationErrors(errors);
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════════
// Sanitization Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize string for safe output
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  // Remove control characters and limit length
  return str
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .slice(0, 1000);
}

/**
 * Sanitize file name
 * @param {string} filename - Filename to sanitize
 * @returns {string} Safe filename
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'unnamed';
  
  return filename
    .replace(/[<>:"\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

/**
 * Sanitize HTML (basic)
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ═══════════════════════════════════════════════════════════════
// Schema Validator
// ═══════════════════════════════════════════════════════════════

/**
 * Simple schema validator
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @param {string} field - Field name for error reporting
 * @returns {boolean} True if valid
 * @throws {ValidationErrors} If invalid
 * 
 * @example
 * const schema = {
 *   name: { type: 'string', required: true, min: 1 },
 *   age: { type: 'number', min: 0 },
 *   email: { type: 'email', required: true }
 * };
 * validateSchema({ name: 'John', email: 'john@example.com' }, schema);
 */
function validateSchema(data, schema, field = 'data') {
  const errors = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];
    const fieldPath = `${field}.${key}`;
    
    // Check required
    if (rules.required && (value === undefined || value === null)) {
      errors.push(new ValidationError(`Required field missing: ${key}`, fieldPath, value));
      continue;
    }
    
    // Skip if not required and missing
    if (value === undefined || value === null) continue;
    
    try {
      // Type validation
      switch (rules.type) {
        case 'string':
          validateLength(value, { min: rules.min || 0, max: rules.max || Infinity }, fieldPath);
          break;
        case 'number':
          validateRange(value, { min: rules.min, max: rules.max, integer: rules.integer }, fieldPath);
          break;
        case 'email':
          validateEmail(value, fieldPath);
          break;
        case 'url':
          validateUrl(value, fieldPath);
          break;
        case 'array':
          validateArray(value, rules.itemValidator, fieldPath);
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            throw new ValidationError('Must be an object', fieldPath, value);
          }
          if (rules.schema) {
            validateSchema(value, rules.schema, fieldPath);
          }
          break;
      }
      
      // Pattern validation
      if (rules.pattern) {
        validatePattern(value, rules.pattern, fieldPath, rules.patternMessage);
      }
      
      // Custom validator
      if (rules.validator) {
        rules.validator(value, fieldPath);
      }
    } catch (error) {
      errors.push(error instanceof ValidationError ? error : new ValidationError(error.message, fieldPath, value));
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationErrors(errors);
  }
  
  return true;
}

module.exports = {
  // Error classes
  ValidationError,
  ValidationErrors,
  
  // String validators
  validateEmail,
  validateUrl,
  validateLength,
  validatePattern,
  
  // Number validators
  validateRange,
  validatePositive,
  
  // Object/Array validators
  validateRequired,
  validateArray,
  
  // Automation validators
  validateHEBCartItem,
  validateMarketplaceConfig,
  validateAutomationConfig,
  
  // Sanitization
  sanitizeString,
  sanitizeFilename,
  sanitizeHTML,
  
  // Schema
  validateSchema
};
