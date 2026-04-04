/**
 * Retry Utilities - Exponential Backoff and Circuit Breaker
 * 
 * Provides robust retry mechanisms with various backoff strategies
 * and circuit breaker pattern for fault tolerance.
 * 
 * @module lib/retry-utils
 */

const { logger } = require('./logger');

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  delay: 1000,
  backoff: 2,
  maxDelay: 30000,
  jitter: true,
  onRetry: null,
};

// Circuit breaker states
const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject requests
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Sleep utility with jitter option
 * @param {number} ms - Base milliseconds
 * @param {boolean} jitter - Add random jitter
 * @returns {Promise<void>}
 */
async function sleep(ms, jitter = false) {
  const delay = jitter ? ms + Math.random() * (ms * 0.5) : ms;
  return new Promise(resolve => setTimeout(resolve, Math.min(delay, 60000)));
}

/**
 * Calculate delay with exponential backoff
 * @param {number} attempt - Current attempt number (1-based)
 * @param {Object} config - Retry configuration
 * @returns {number}
 */
function calculateDelay(attempt, config) {
  const { delay, backoff, maxDelay, jitter } = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let calculatedDelay = delay * Math.pow(backoff, attempt - 1);
  
  if (jitter) {
    calculatedDelay += Math.random() * (calculatedDelay * 0.3);
  }
  
  return Math.min(calculatedDelay, maxDelay);
}

/**
 * Execute function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const { maxRetries, onRetry } = config;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        logger.debug(`Max retries (${maxRetries}) exceeded`);
        throw error;
      }
      
      const waitTime = calculateDelay(attempt, config);
      
      if (onRetry) {
        onRetry({ attempt, maxRetries, error, waitTime });
      } else {
        logger.debug(`Retry ${attempt}/${maxRetries} after ${Math.round(waitTime)}ms: ${error.message}`);
      }
      
      await sleep(waitTime, false);
    }
  }
  
  throw lastError;
}

/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by temporarily rejecting requests
 * when failure threshold is reached.
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    this.onStateChange = options.onStateChange || null;
    
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * Execute function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @returns {Promise<any>}
   */
  async execute(fn) {
    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError('Circuit breaker is OPEN', this.state);
      }
      this.transitionTo(CIRCUIT_STATE.HALF_OPEN);
    }

    if (this.state === CIRCUIT_STATE.HALF_OPEN && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new CircuitBreakerError('Circuit breaker half-open limit reached', this.state);
    }

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failures = 0;
    
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.halfOpenMaxCalls) {
        this.transitionTo(CIRCUIT_STATE.CLOSED);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.transitionTo(CIRCUIT_STATE.OPEN);
    } else if (this.failures >= this.failureThreshold) {
      this.transitionTo(CIRCUIT_STATE.OPEN);
    }
  }

  /**
   * Transition to new state
   * @param {string} newState
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    if (newState === CIRCUIT_STATE.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.halfOpenCalls = 0;
    } else if (newState === CIRCUIT_STATE.OPEN) {
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.halfOpenCalls = 0;
    } else if (newState === CIRCUIT_STATE.HALF_OPEN) {
      this.halfOpenCalls = 0;
      this.successes = 0;
    }

    if (this.onStateChange) {
      this.onStateChange({ from: oldState, to: newState, failures: this.failures });
    }

    logger.debug(`Circuit breaker: ${oldState} -> ${newState}`);
  }

  /**
   * Get current state info
   * @returns {Object}
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }

  /**
   * Force circuit breaker to closed state
   */
  reset() {
    this.transitionTo(CIRCUIT_STATE.CLOSED);
  }
}

/**
 * Circuit breaker error class
 */
class CircuitBreakerError extends Error {
  constructor(message, state) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state;
  }
}

/**
 * Batch processor with concurrency control
 * @param {Array} items - Items to process
 * @param {Function} processor - Async processor function
 * @param {Object} options - Processing options
 * @returns {Promise<Array>}
 */
async function batchProcess(items, processor, options = {}) {
  const {
    batchSize = 10,
    concurrency = 5,
    onBatchComplete = null,
    continueOnError = true
  } = options;

  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    logger.debug(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);

    // Process batch with concurrency limit
    const batchResults = await Promise.all(
      batch.map(async (item, index) => {
        const globalIndex = i + index;
        try {
          const result = await processor(item, globalIndex);
          return { success: true, result, index: globalIndex, item };
        } catch (error) {
          if (!continueOnError) throw error;
          return { success: false, error: error.message, index: globalIndex, item };
        }
      })
    );

    results.push(...batchResults);

    if (onBatchComplete) {
      await onBatchComplete(batchNum, totalBatches, batchResults);
    }

    // Delay between batches
    if (i + batchSize < items.length) {
      await sleep(100);
    }
  }

  return results;
}

/**
 * Timeout wrapper for promises
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Timeout error message
 * @returns {Promise<any>}
 */
async function withTimeout(promise, ms, message = 'Operation timed out') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry with circuit breaker combination
 * @param {Function} fn - Function to execute
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<any>}
 */
async function withCircuitBreakerAndRetry(fn, breaker, retryOptions = {}) {
  return breaker.execute(() => withRetry(fn, retryOptions));
}

/**
 * Debounce function calls
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
function debounce(fn, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function}
 */
function throttle(fn, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

module.exports = {
  // Core retry functions
  withRetry,
  sleep,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  
  // Circuit breaker
  CircuitBreaker,
  CircuitBreakerError,
  CIRCUIT_STATE,
  
  // Batch processing
  batchProcess,
  
  // Utilities
  withTimeout,
  withCircuitBreakerAndRetry,
  debounce,
  throttle,
};
