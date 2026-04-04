/**
 * RetryManager - Intelligent Retry and Circuit Breaker
 * 
 * Provides:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern for failing services
 * - Granular retry policies per operation type
 * - Error classification and handling
 */

const EventEmitter = require('events');

/**
 * Error classification
 */
const ErrorTypes = {
  TRANSIENT: 'transient',      // Network errors, timeouts - retryable
  PERMANENT: 'permanent',      // Auth failures, invalid input - not retryable
  RATELIMIT: 'ratelimit',      // Rate limiting - retry with backoff
  UNKNOWN: 'unknown'           // Unknown - retry with caution
};

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  jitterFactor: 0.3,
  retryableErrors: [],
  nonRetryableErrors: []
};

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Failing fast
  HALF_OPEN: 'HALF_OPEN'  // Testing if recovered
};

/**
 * Classifies errors for retry decisions
 */
function classifyError(error) {
  if (!error) return ErrorTypes.UNKNOWN;
  
  const message = error.message || error.toString();
  const lowerMessage = message.toLowerCase();
  
  // Rate limiting
  if (lowerMessage.includes('rate limit') || 
      lowerMessage.includes('429') || 
      lowerMessage.includes('too many requests')) {
    return ErrorTypes.RATELIMIT;
  }
  
  // Transient network errors
  if (lowerMessage.includes('timeout') || 
      lowerMessage.includes('etimedout') || 
      lowerMessage.includes('enotfound') ||
      lowerMessage.includes('econnreset') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('network') ||
      lowerMessage.includes('socket') ||
      lowerMessage.includes('temporarily') ||
      lowerMessage.includes('503') ||
      lowerMessage.includes('502') ||
      lowerMessage.includes('504')) {
    return ErrorTypes.TRANSIENT;
  }
  
  // Permanent errors (don't retry)
  if (lowerMessage.includes('authentication') || 
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('401') ||
      lowerMessage.includes('403') ||
      lowerMessage.includes('404')) {
    return ErrorTypes.PERMANENT;
  }
  
  return ErrorTypes.UNKNOWN;
}

/**
 * Retry policy for specific operations
 */
class RetryPolicy {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Calculate delay for retry attempt with exponential backoff and jitter
   */
  calculateDelay(attempt) {
    const { baseDelay, maxDelay, backoffMultiplier, jitter, jitterFactor } = this.config;
    
    // Exponential backoff
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    
    // Cap at max delay
    delay = Math.min(delay, maxDelay);
    
    // Add jitter to avoid thundering herd
    if (jitter) {
      const jitterAmount = delay * jitterFactor;
      delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }
    
    return Math.floor(delay);
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    
    const errorType = classifyError(error);
    
    // Never retry permanent errors
    if (errorType === ErrorTypes.PERMANENT) {
      return false;
    }
    
    // Check custom error lists
    const message = error.message || error.toString();
    
    if (this.config.nonRetryableErrors.length > 0) {
      for (const pattern of this.config.nonRetryableErrors) {
        if (message.includes(pattern)) return false;
      }
    }
    
    if (this.config.retryableErrors.length > 0) {
      for (const pattern of this.config.retryableErrors) {
        if (message.includes(pattern)) return true;
      }
      // If whitelist specified and not matched, don't retry
      return false;
    }
    
    return true;
  }
}

/**
 * Circuit breaker for protecting against cascading failures
 */
class CircuitBreaker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.failureThreshold = config.failureThreshold || 5;
    this.resetTimeout = config.resetTimeout || 30000;
    this.halfOpenMaxCalls = config.halfOpenMaxCalls || 3;
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
  }

  /**
   * Check if operation is allowed
   */
  canExecute() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      return this.halfOpenCalls < this.halfOpenMaxCalls;
    }
    
    return true;
  }

  /**
   * Record success
   */
  recordSuccess() {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
    
    this.emit('success');
  }

  /**
   * Record failure
   */
  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED && 
               this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
    
    this.emit('failure', error);
  }

  /**
   * Transition to new state
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenCalls = 0;
      this.successCount = 0;
    }
    
    this.emit('state-change', { from: oldState, to: newState });
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, ...args) {
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker is OPEN for this operation`);
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
    }
    
    try {
      const result = await fn(...args);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Main retry manager
 */
class RetryManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.defaultPolicy = new RetryPolicy(config);
    this.policies = new Map();
    this.circuitBreakers = new Map();
    this.operationHistory = [];
    this.maxHistorySize = config.maxHistorySize || 100;
  }

  /**
   * Register a policy for a specific operation type
   */
  registerPolicy(operationType, config) {
    this.policies.set(operationType, new RetryPolicy(config));
  }

  /**
   * Get policy for operation type
   */
  getPolicy(operationType) {
    return this.policies.get(operationType) || this.defaultPolicy;
  }

  /**
   * Get or create circuit breaker
   */
  getCircuitBreaker(name, config = {}) {
    if (!this.circuitBreakers.has(name)) {
      const breaker = new CircuitBreaker(config);
      breaker.on('state-change', (data) => {
        this.emit('circuit-state-change', { name, ...data });
      });
      this.circuitBreakers.set(name, breaker);
    }
    return this.circuitBreakers.get(name);
  }

  /**
   * Execute function with retry logic
   */
  async execute(operationType, fn, ...args) {
    const policy = this.getPolicy(operationType);
    const historyEntry = {
      operationType,
      startTime: Date.now(),
      attempts: 0,
      success: false,
      errors: []
    };
    
    let lastError;
    
    for (let attempt = 1; attempt <= policy.config.maxRetries + 1; attempt++) {
      historyEntry.attempts = attempt;
      
      try {
        const result = await fn(...args);
        
        historyEntry.success = true;
        historyEntry.endTime = Date.now();
        this.addToHistory(historyEntry);
        
        this.emit('operation:success', { 
          operationType, 
          attempts: attempt,
          duration: historyEntry.endTime - historyEntry.startTime
        });
        
        return result;
        
      } catch (error) {
        lastError = error;
        historyEntry.errors.push({
          attempt,
          error: error.message,
          type: classifyError(error),
          timestamp: Date.now()
        });
        
        const shouldRetry = policy.shouldRetry(error, attempt);
        
        if (!shouldRetry || attempt > policy.config.maxRetries) {
          break;
        }
        
        const delay = policy.calculateDelay(attempt);
        
        this.emit('operation:retry', {
          operationType,
          attempt,
          maxRetries: policy.config.maxRetries,
          delay,
          error: error.message
        });
        
        await this.sleep(delay);
      }
    }
    
    historyEntry.success = false;
    historyEntry.endTime = Date.now();
    this.addToHistory(historyEntry);
    
    this.emit('operation:failure', {
      operationType,
      attempts: historyEntry.attempts,
      duration: historyEntry.endTime - historyEntry.startTime,
      error: lastError.message
    });
    
    throw lastError;
  }

  /**
   * Execute with circuit breaker protection
   */
  async executeWithCircuitBreaker(operationType, circuitName, fn, ...args) {
    const breaker = this.getCircuitBreaker(circuitName);
    
    return breaker.execute(async () => {
      return this.execute(operationType, fn, ...args);
    });
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add entry to history
   */
  addToHistory(entry) {
    this.operationHistory.push(entry);
    
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
    }
  }

  /**
   * Get operation statistics
   */
  getStats() {
    const stats = {
      total: this.operationHistory.length,
      successful: 0,
      failed: 0,
      byType: {},
      averageAttempts: 0,
      circuitBreakers: {}
    };
    
    let totalAttempts = 0;
    
    for (const entry of this.operationHistory) {
      if (entry.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
      
      totalAttempts += entry.attempts;
      
      if (!stats.byType[entry.operationType]) {
        stats.byType[entry.operationType] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      
      stats.byType[entry.operationType].total++;
      if (entry.success) {
        stats.byType[entry.operationType].successful++;
      } else {
        stats.byType[entry.operationType].failed++;
      }
    }
    
    stats.averageAttempts = stats.total > 0 ? totalAttempts / stats.total : 0;
    
    // Circuit breaker stats
    for (const [name, breaker] of this.circuitBreakers) {
      stats.circuitBreakers[name] = breaker.getState();
    }
    
    return stats;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(name) {
    const breaker = this.circuitBreakers.get(name);
    if (breaker) {
      breaker.transitionTo(CircuitState.CLOSED);
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.operationHistory = [];
  }
}

module.exports = {
  RetryManager,
  RetryPolicy,
  CircuitBreaker,
  CircuitState,
  ErrorTypes,
  classifyError,
  DEFAULT_RETRY_CONFIG
};
