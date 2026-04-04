/**
 * @fileoverview Core error classes for standardized error handling across the codebase.
 * @module lib/errors
 */

/**
 * Base error class for all Marvin automation errors.
 * Provides additional context like error codes and retryability.
 * 
 * @class MarvinError
 * @extends Error
 * 
 * @example
 * throw new MarvinError('Operation failed', 'OP_FAILED', { retryable: true });
 */
class MarvinError extends Error {
  /**
   * Creates a MarvinError instance.
   * 
   * @param {string} message - Error message
   * @param {string} code - Error code for programmatic handling
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.retryable=false] - Whether the operation can be retried
   * @param {*} [options.cause] - Original error that caused this error
   * @param {Object} [options.metadata={}] - Additional context data
   */
  constructor(message, code, options = {}) {
    super(message);
    this.name = 'MarvinError';
    this.code = code;
    this.retryable = options.retryable || false;
    this.cause = options.cause;
    this.metadata = options.metadata || {};
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MarvinError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization.
   * @returns {Object} Serialized error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      timestamp: this.timestamp,
      metadata: this.metadata,
      cause: this.cause?.message || this.cause,
      stack: this.stack
    };
  }

  /**
   * Create a string representation of the error.
   * @returns {string} Formatted error string
   */
  toString() {
    let str = `[${this.code}] ${this.message}`;
    if (this.cause) {
      str += ` (caused by: ${this.cause.message || this.cause})`;
    }
    return str;
  }
}

/**
 * Error class for browser automation failures.
 * 
 * @class BrowserError
 * @extends MarvinError
 * 
 * @example
 * throw new BrowserError('Failed to connect to Chrome', 'BROWSER_CONN_FAILED', { 
 *   retryable: true,
 *   metadata: { port: 9222 }
 * });
 */
class BrowserError extends MarvinError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [options={}] - Additional options
   */
  constructor(message, code, options = {}) {
    super(message, code, options);
    this.name = 'BrowserError';
  }
}

/**
 * Error class for network/connection failures.
 * These are typically retryable.
 * 
 * @class NetworkError
 * @extends MarvinError
 */
class NetworkError extends MarvinError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [options={}] - Additional options
   */
  constructor(message, code, options = {}) {
    super(message, code, { ...options, retryable: true });
    this.name = 'NetworkError';
  }
}

/**
 * Error class for configuration issues.
 * These are typically NOT retryable.
 * 
 * @class ConfigError
 * @extends MarvinError
 */
class ConfigError extends MarvinError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [options={}] - Additional options
   */
  constructor(message, code, options = {}) {
    super(message, code, { ...options, retryable: false });
    this.name = 'ConfigError';
  }
}

/**
 * Error class for authentication/authorization failures.
 * 
 * @class AuthError
 * @extends MarvinError
 */
class AuthError extends MarvinError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [options={}] - Additional options
   */
  constructor(message, code, options = {}) {
    super(message, code, { ...options, retryable: false });
    this.name = 'AuthError';
  }
}

/**
 * Error class for timeout scenarios.
 * These are typically retryable.
 * 
 * @class TimeoutError
 * @extends MarvinError
 */
class TimeoutError extends MarvinError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [options={}] - Additional options
   * @param {number} [options.timeoutMs] - Timeout duration in milliseconds
   */
  constructor(message, code, options = {}) {
    super(message, code, { ...options, retryable: true });
    this.name = 'TimeoutError';
    this.timeoutMs = options.timeoutMs;
  }
}

/**
 * Error class for validation failures.
 * These are typically NOT retryable.
 * 
 * @class ValidationError
 * @extends MarvinError
 */
class ValidationError extends MarvinError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [options={}] - Additional options
   * @param {Array} [options.errors] - Array of specific validation errors
   */
  constructor(message, code, options = {}) {
    super(message, code, { ...options, retryable: false });
    this.name = 'ValidationError';
    this.errors = options.errors || [];
  }
}

/**
 * Check if an error is retryable.
 * 
 * @param {Error} error - Error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  if (error instanceof MarvinError) {
    return error.retryable;
  }
  
  // Check for common retryable error patterns
  const retryablePatterns = [
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /EAI_AGAIN/i,
    /socket hang up/i,
    /network error/i,
    /timeout/i
  ];
  
  const errorMessage = error.message || String(error);
  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Wrap an async function with error handling.
 * 
 * @template T
 * @param {Function} fn - Function to wrap
 * @param {Function} errorMapper - Function to map errors to MarvinError
 * @returns {Function} Wrapped function
 * 
 * @example
 * const safeOperation = withErrorHandling(
 *   riskyOperation,
 *   (err) => new NetworkError('Operation failed', 'OP_FAIL', { cause: err })
 * );
 */
function withErrorHandling(fn, errorMapper) {
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof MarvinError) {
        throw error;
      }
      throw errorMapper(error);
    }
  };
}

module.exports = {
  MarvinError,
  BrowserError,
  NetworkError,
  ConfigError,
  AuthError,
  TimeoutError,
  ValidationError,
  isRetryableError,
  withErrorHandling
};
