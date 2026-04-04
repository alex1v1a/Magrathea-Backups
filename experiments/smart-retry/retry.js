/**
 * Smart Retry with Exponential Backoff and Jitter
 * Experiment 4: Improved retry logic for automation resilience
 */

class RetryExhaustedError extends Error {
  constructor(originalError, attempts) {
    super(`Operation failed after ${attempts} attempts: ${originalError.message}`);
    this.originalError = originalError;
    this.attempts = attempts;
    this.name = 'RetryExhaustedError';
  }
}

class SmartRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.jitterFactor = options.jitterFactor || 0.3; // ±30%
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || null; // null = retry all
    this.onRetry = options.onRetry || null; // Callback for each retry
    this.onSuccess = options.onSuccess || null; // Callback on success
  }

  /**
   * Execute an operation with smart retry
   * @param {Function} operation - Async function to execute
   * @param {string} context - Description for logging
   * @returns {Promise} - Result of operation
   */
  async execute(operation, context = '') {
    let lastError;
    const attemptTimes = [];
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const attemptStart = Date.now();
      
      try {
        const result = await operation();
        
        if (this.onSuccess) {
          this.onSuccess({
            context,
            attempts: attempt + 1,
            totalTime: Date.now() - attemptStart
          });
        }
        
        return {
          success: true,
          result,
          attempts: attempt + 1,
          attemptTimes
        };
        
      } catch (error) {
        lastError = error;
        attemptTimes.push(Date.now() - attemptStart);
        
        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }
        
        if (attempt === this.maxRetries) {
          throw new RetryExhaustedError(lastError, attempt + 1);
        }
        
        const delay = this.calculateDelay(attempt);
        
        if (this.onRetry) {
          this.onRetry({
            context,
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            delay,
            error: error.message
          });
        }
        
        console.log(`⏱️  ${context} - Attempt ${attempt + 1}/${this.maxRetries + 1} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    // Should never reach here
    throw new RetryExhaustedError(lastError, this.maxRetries + 1);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt) {
    // Exponential backoff: base * multiplier^attempt
    const exponential = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    const capped = Math.min(exponential, this.maxDelay);
    
    // Add jitter: ±jitterFactor%
    const jitter = (Math.random() * 2 - 1) * this.jitterFactor;
    const withJitter = capped * (1 + jitter);
    
    return Math.floor(Math.max(0, withJitter));
  }

  /**
   * Check if error should be retried
   */
  isRetryable(error) {
    if (!this.retryableErrors) return true;
    return this.retryableErrors.some(pattern => 
      error.message.includes(pattern) || error.code === pattern
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get delay schedule (for testing/planning)
   */
  getDelaySchedule() {
    const delays = [];
    for (let i = 0; i < this.maxRetries; i++) {
      const min = this.calculateDelay(i) * (1 - this.jitterFactor);
      const max = this.calculateDelay(i) * (1 + this.jitterFactor);
      delays.push({
        attempt: i + 1,
        min: Math.floor(min),
        max: Math.floor(max),
        base: this.baseDelay * Math.pow(this.backoffMultiplier, i)
      });
    }
    return delays;
  }
}

/**
 * Comparison: Fixed delay retry (current approach)
 */
class FixedRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.fixedDelay = options.fixedDelay || 2000;
  }

  async execute(operation, context = '') {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, result, attempts: attempt + 1 };
      } catch (error) {
        if (attempt === this.maxRetries) throw error;
        console.log(`⏱️  ${context} - Attempt ${attempt + 1} failed, waiting ${this.fixedDelay}ms...`);
        await new Promise(r => setTimeout(r, this.fixedDelay));
      }
    }
  }
}

/**
 * Comparison: Linear backoff retry
 */
class LinearRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.increment = options.increment || 1000;
  }

  async execute(operation, context = '') {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, result, attempts: attempt + 1 };
      } catch (error) {
        if (attempt === this.maxRetries) throw error;
        const delay = this.baseDelay + (attempt * this.increment);
        console.log(`⏱️  ${context} - Attempt ${attempt + 1} failed, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}

module.exports = { 
  SmartRetry, 
  FixedRetry, 
  LinearRetry,
  RetryExhaustedError 
};
