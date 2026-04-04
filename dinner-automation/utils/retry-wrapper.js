/**
 * Retry Wrapper with Circuit Breaker
 * Intelligent retry logic with exponential backoff and circuit breaker pattern
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Circuit breaker to prevent cascade failures
 * - Error classification (retryable vs fatal)
 * - Per-function custom retry policies
 * 
 * @module utils/retry-wrapper
 */

class CircuitBreaker {
  /**
   * Create a circuit breaker
   * @param {Object} options
   * @param {number} options.failureThreshold - Open after N failures (default: 5)
   * @param {number} options.resetTimeout - Try again after ms (default: 60000)
   * @param {number} options.halfOpenMaxCalls - Test calls in half-open state (default: 3)
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
  }

  /**
   * Check if request should proceed
   * @returns {boolean}
   */
  canExecute() {
    if (this.state === 'CLOSED') return true;
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        return true;
      }
      return false;
    }
    
    if (this.state === 'HALF_OPEN') {
      return this.halfOpenCalls < this.halfOpenMaxCalls;
    }
    
    return true;
  }

  /**
   * Record a success
   */
  recordSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failure
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      return;
    }
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailure: this.lastFailureTime
    };
  }
}

class RetryWrapper {
  /**
   * Create retry wrapper
   * @param {Object} defaultOptions - Default retry options
   */
  constructor(defaultOptions = {}) {
    this.defaultOptions = {
      maxRetries: 3,
      delay: 1000,
      backoff: 2,
      maxDelay: 30000,
      jitter: true,
      timeout: 60000,
      onRetry: null,
      onFail: null,
      ...defaultOptions
    };
    
    this.circuitBreakers = new Map();
    this.errorClassifier = new Map();
    
    this._setupDefaultErrorClassifier();
  }

  /**
   * Setup default error classification
   * @private
   */
  _setupDefaultErrorClassifier() {
    // Network errors - always retryable
    this.registerErrorType('ECONNRESET', true);
    this.registerErrorType('ECONNREFUSED', true);
    this.registerErrorType('ETIMEDOUT', true);
    this.registerErrorType('ENOTFOUND', true);
    this.registerErrorType('EAI_AGAIN', true);
    
    // HTTP errors - conditionally retryable
    this.registerErrorType('timeout', true);
    this.registerErrorType('navigation', true);
    
    // Fatal errors - never retry
    this.registerErrorType('authentication', false);
    this.registerErrorType('authorization', false);
    this.registerErrorType('notfound', false);
  }

  /**
   * Register error type classification
   * @param {string} errorType - Error type identifier
   * @param {boolean} retryable - Whether this error type is retryable
   */
  registerErrorType(errorType, retryable) {
    this.errorClassifier.set(errorType.toLowerCase(), retryable);
  }

  /**
   * Get or create circuit breaker for a function
   * @private
   */
  _getCircuitBreaker(fnName, options) {
    if (!options.useCircuitBreaker) return null;
    
    if (!this.circuitBreakers.has(fnName)) {
      this.circuitBreakers.set(fnName, new CircuitBreaker(options.circuitBreaker));
    }
    
    return this.circuitBreakers.get(fnName);
  }

  /**
   * Check if error is retryable
   * @private
   */
  _isRetryable(error) {
    // Check explicit error codes
    if (error.code && this.errorClassifier.has(error.code.toLowerCase())) {
      return this.errorClassifier.get(error.code.toLowerCase());
    }
    
    // Check error messages
    const message = (error.message || '').toLowerCase();
    for (const [type, retryable] of this.errorClassifier) {
      if (message.includes(type)) return retryable;
    }
    
    // Default: retryable
    return true;
  }

  /**
   * Calculate delay with backoff and jitter
   * @private
   */
  _calculateDelay(attempt, options) {
    let delay = options.delay * Math.pow(options.backoff, attempt - 1);
    delay = Math.min(delay, options.maxDelay);
    
    if (options.jitter) {
      // Add randomness: delay ± 25%
      const jitter = delay * 0.25;
      delay = delay - jitter + (Math.random() * jitter * 2);
    }
    
    return Math.floor(delay);
  }

  /**
   * Wrap a function with retry logic
   * @param {Function} fn - Function to wrap
   * @param {Object} options - Retry options for this function
   * @returns {Function} Wrapped function
   */
  wrap(fn, options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const fnName = fn.name || 'anonymous';
    const circuitBreaker = this._getCircuitBreaker(fnName, opts);

    return async (...args) => {
      // Check circuit breaker
      if (circuitBreaker && !circuitBreaker.canExecute()) {
        throw new Error(`Circuit breaker OPEN for ${fnName}`);
      }

      let lastError;
      
      for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
        try {
          // Execute with timeout if specified
          let result;
          if (opts.timeout) {
            result = await Promise.race([
              fn(...args),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), opts.timeout)
              )
            ]);
          } else {
            result = await fn(...args);
          }

          // Record success
          if (circuitBreaker) circuitBreaker.recordSuccess();
          
          return result;
          
        } catch (error) {
          lastError = error;
          
          // Check if retryable
          if (!this._isRetryable(error)) {
            if (opts.onFail) opts.onFail(error, attempt);
            throw error;
          }

          // Record failure
          if (circuitBreaker) circuitBreaker.recordFailure();
          
          // Last attempt failed
          if (attempt > opts.maxRetries) {
            if (opts.onFail) opts.onFail(error, attempt);
            throw error;
          }

          // Notify retry
          if (opts.onRetry) {
            opts.onRetry(error, attempt, opts.maxRetries + 1);
          }

          // Wait before retry
          const delay = this._calculateDelay(attempt, opts);
          await new Promise(r => setTimeout(r, delay));
        }
      }

      throw lastError;
    };
  }

  /**
   * Execute with retry (one-off)
   * @param {Function} fn - Function to execute
   * @param {Array} args - Arguments
   * @param {Object} options - Retry options
   */
  async execute(fn, args = [], options = {}) {
    return this.wrap(fn, options)(...args);
  }

  /**
   * Get circuit breaker states
   * @returns {Object}
   */
  getCircuitBreakerStates() {
    const states = {};
    for (const [name, cb] of this.circuitBreakers) {
      states[name] = cb.getState();
    }
    return states;
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers() {
    this.circuitBreakers.clear();
  }
}

// Convenience function for quick retries
async function withRetry(fn, options = {}) {
  const wrapper = new RetryWrapper(options);
  return wrapper.execute(fn, [], options);
}

module.exports = { RetryWrapper, CircuitBreaker, withRetry };
