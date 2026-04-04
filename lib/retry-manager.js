/**
 * Retry Manager with Circuit Breaker Pattern
 * Prevents cascading failures and provides exponential backoff
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }
  
  async execute(fn, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN. Retry after ${new Date(this.nextAttempt).toISOString()}`);
      }
      this.state = 'HALF_OPEN';
      this.halfOpenCalls = 0;
    }
    
    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        console.log('🔓 Circuit breaker CLOSED - service recovered');
      }
    }
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`🔒 Circuit breaker OPENED until ${new Date(this.nextAttempt).toLocaleTimeString()}`);
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.state === 'OPEN' ? this.nextAttempt : null
    };
  }
}

/**
 * Exponential backoff retry
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Calculate delay with jitter
      const delay = Math.min(
        baseDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;
      
      if (onRetry) {
        onRetry(attempt, maxAttempts, error, totalDelay);
      }
      
      console.log(`  🔄 Retry ${attempt}/${maxAttempts} after ${Math.round(totalDelay)}ms...`);
      await new Promise(r => setTimeout(r, totalDelay));
    }
  }
  
  throw lastError;
}

/**
 * Retry with specific error filtering
 */
async function retryWithFilter(fn, options = {}) {
  const {
    maxAttempts = 3,
    retryableErrors = [], // Error classes that should trigger retry
    shouldRetry = null // Function(error) => boolean
  } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = shouldRetry 
        ? shouldRetry(error)
        : retryableErrors.some(E => error instanceof E);
      
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }
      
      console.log(`  🔄 Retry ${attempt}/${maxAttempts} for ${error.name}...`);
    }
  }
}

/**
 * Bulkhead pattern - limit concurrent operations
 */
class Bulkhead {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }
  
  async execute(fn) {
    if (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

module.exports = {
  CircuitBreaker,
  retryWithBackoff,
  retryWithFilter,
  Bulkhead
};
