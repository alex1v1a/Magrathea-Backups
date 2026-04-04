/**
 * Intelligent Retry Module
 * Advanced retry logic with adaptive backoff and circuit breaker
 * 
 * @module lib/intelligent-retry
 * @version 2.0.0
 */

const EventEmitter = require('events');

// Default configuration
const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 60000,
  jitter: true,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenMaxCalls: 3
  }
};

/**
 * Error classification for adaptive retry
 */
const ERROR_TYPES = {
  NETWORK: 'network',      // Connection issues, timeouts
  RATE_LIMIT: 'rate_limit', // 429 Too Many Requests
  SERVER: 'server',        // 5xx errors
  CLIENT: 'client',        // 4xx errors (don't retry)
  UNKNOWN: 'unknown'
};

/**
 * Classify error type for appropriate retry strategy
 */
function classifyError(error) {
  if (!error) return ERROR_TYPES.UNKNOWN;
  
  const message = error.message || '';
  const code = error.code || '';
  const statusCode = error.statusCode || error.status;
  
  // Network errors
  if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE'].includes(code)) {
    return ERROR_TYPES.NETWORK;
  }
  
  // HTTP status codes
  if (statusCode === 429) return ERROR_TYPES.RATE_LIMIT;
  if (statusCode >= 500) return ERROR_TYPES.SERVER;
  if (statusCode >= 400) return ERROR_TYPES.CLIENT;
  
  // Message patterns
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return ERROR_TYPES.NETWORK;
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ERROR_TYPES.RATE_LIMIT;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt, errorType, config) {
  let baseDelay = config.baseDelay;
  
  // Adjust base delay based on error type
  switch (errorType) {
    case ERROR_TYPES.RATE_LIMIT:
      baseDelay = Math.max(baseDelay, 5000); // Start at 5s for rate limits
      break;
    case ERROR_TYPES.SERVER:
      baseDelay = Math.max(baseDelay, 2000); // Start at 2s for server errors
      break;
    case ERROR_TYPES.NETWORK:
      baseDelay = Math.max(baseDelay, 1000); // Start at 1s for network
      break;
  }
  
  // Exponential backoff: delay = base * 2^attempt
  let delay = baseDelay * Math.pow(2, attempt);
  
  // Cap at max delay
  delay = Math.min(delay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  if (config.jitter) {
    const jitterAmount = delay * 0.2; // 20% jitter
    delay = delay + (Math.random() * jitterAmount - jitterAmount / 2);
  }
  
  return Math.floor(delay);
}

/**
 * Circuit Breaker State Management
 */
class CircuitBreaker extends EventEmitter {
  constructor(config) {
    super();
    this.config = { ...DEFAULT_CONFIG.circuitBreaker, ...config };
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.halfOpenCalls = 0;
  }
  
  canExecute() {
    if (this.state === 'CLOSED') return true;
    
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        this.emit('stateChange', 'HALF_OPEN');
        return true;
      }
      return false;
    }
    
    if (this.state === 'HALF_OPEN') {
      return this.halfOpenCalls < this.config.halfOpenMaxCalls;
    }
    
    return true;
  }
  
  recordSuccess() {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      this.halfOpenCalls++;
      
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.emit('stateChange', 'CLOSED');
      }
    }
  }
  
  recordFailure() {
    this.failures++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.emit('stateChange', 'OPEN');
      return;
    }
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.emit('stateChange', 'OPEN');
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt
    };
  }
}

/**
 * Intelligent Retry Manager
 */
class IntelligentRetry extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitBreakers = new Map();
    this.stats = {
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      retriesPerformed: 0
    };
  }
  
  /**
   * Get or create circuit breaker for endpoint
   */
  getCircuitBreaker(endpoint) {
    if (!this.circuitBreakers.has(endpoint)) {
      const cb = new CircuitBreaker(this.config.circuitBreaker);
      cb.on('stateChange', (state) => {
        this.emit('circuitBreakerStateChange', { endpoint, state });
      });
      this.circuitBreakers.set(endpoint, cb);
    }
    return this.circuitBreakers.get(endpoint);
  }
  
  /**
   * Execute function with intelligent retry
   */
  async execute(fn, options = {}) {
    const config = { ...this.config, ...options };
    const endpoint = options.endpoint || 'default';
    const circuitBreaker = this.getCircuitBreaker(endpoint);
    
    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      const state = circuitBreaker.getState();
      const error = new Error(`Circuit breaker is OPEN for ${endpoint}. Retry after ${new Date(state.nextAttempt).toISOString()}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }
    
    let lastError;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      this.stats.totalAttempts++;
      
      try {
        const result = await fn(attempt);
        
        // Success
        circuitBreaker.recordSuccess();
        this.stats.totalSuccesses++;
        
        if (attempt > 0) {
          this.emit('retrySuccess', { endpoint, attempts: attempt + 1 });
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        const errorType = classifyError(error);
        
        // Don't retry client errors (4xx)
        if (errorType === ERROR_TYPES.CLIENT) {
          circuitBreaker.recordFailure();
          throw error;
        }
        
        // Check if we should retry
        if (attempt < config.maxRetries) {
          this.stats.retriesPerformed++;
          const delay = calculateDelay(attempt, errorType, config);
          
          this.emit('retry', {
            endpoint,
            attempt: attempt + 1,
            maxRetries: config.maxRetries,
            delay,
            errorType,
            error: error.message
          });
          
          await this.sleep(delay);
        } else {
          // Max retries exceeded
          circuitBreaker.recordFailure();
          this.stats.totalFailures++;
          this.emit('maxRetriesExceeded', { endpoint, error, attempts: attempt + 1 });
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Execute multiple operations with controlled concurrency
   */
  async executeBatch(operations, options = {}) {
    const { concurrency = 3, continueOnError = true } = options;
    const results = [];
    const errors = [];
    
    // Process in chunks
    for (let i = 0; i < operations.length; i += concurrency) {
      const chunk = operations.slice(i, i + concurrency);
      
      const chunkPromises = chunk.map(async (op, idx) => {
        try {
          const result = await this.execute(op.fn, { ...op.options, endpoint: op.endpoint || `batch-${i + idx}` });
          return { success: true, result, index: i + idx };
        } catch (error) {
          if (!continueOnError) throw error;
          return { success: false, error: error.message, index: i + idx };
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      
      for (const r of chunkResults) {
        if (r.success) {
          results[r.index] = r.result;
        } else {
          errors[r.index] = r.error;
          results[r.index] = null;
        }
      }
    }
    
    return {
      results,
      errors: errors.length > 0 ? errors : null,
      successCount: results.filter(r => r !== null).length,
      failureCount: errors.filter(e => e !== undefined).length
    };
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalAttempts > 0 
        ? (this.stats.totalSuccesses / this.stats.totalAttempts * 100).toFixed(2) + '%'
        : '0%',
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([endpoint, cb]) => ({
        endpoint,
        ...cb.getState()
      }))
    };
  }
  
  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers() {
    for (const cb of this.circuitBreakers.values()) {
      cb.state = 'CLOSED';
      cb.failures = 0;
      cb.successes = 0;
    }
    this.emit('circuitBreakersReset');
  }
}

// Create singleton instance
const defaultRetry = new IntelligentRetry();

module.exports = {
  IntelligentRetry,
  CircuitBreaker,
  ERROR_TYPES,
  classifyError,
  calculateDelay,
  execute: (fn, options) => defaultRetry.execute(fn, options),
  executeBatch: (operations, options) => defaultRetry.executeBatch(operations, options),
  getStats: () => defaultRetry.getStats(),
  resetCircuitBreakers: () => defaultRetry.resetCircuitBreakers()
};
