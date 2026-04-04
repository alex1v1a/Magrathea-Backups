/**
 * Retry Utility with Exponential Backoff
 * Provides resilient execution for flaky operations
 */

/**
 * Execute a function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @param {Function} options.onRetry - Callback on each retry attempt
 * @returns {Promise<any>} Result of fn
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      if (!shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delay, error);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is likely transient (network, timeout, etc.)
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
function isTransientError(error) {
  if (!error) return false;
  
  const transientPatterns = [
    /ETIMEDOUT/,
    /ECONNRESET/,
    /ECONNREFUSED/,
    /EPIPE/,
    /network/i,
    /timeout/i,
    /temporarily unavailable/i,
    /rate limit/i,
    /too many requests/i,
    /503/,
    /502/,
    /504/
  ];
  
  const errorMessage = error.message || error.toString();
  return transientPatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Create a circuit breaker for failing operations
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Circuit breaker options
 * @returns {Function} Wrapped function
 */
function circuitBreaker(fn, options = {}) {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    onOpen = null,
    onClose = null
  } = options;
  
  let failures = 0;
  let lastFailureTime = null;
  let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  
  return async function(...args) {
    if (state === 'OPEN') {
      if (Date.now() - lastFailureTime >= resetTimeout) {
        state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn(...args);
      
      if (state === 'HALF_OPEN') {
        state = 'CLOSED';
        failures = 0;
        if (onClose) onClose();
      }
      
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = Date.now();
      
      if (failures >= failureThreshold) {
        state = 'OPEN';
        if (onOpen) onOpen();
      }
      
      throw error;
    }
  };
}

/**
 * Batch processor for handling arrays with concurrency control
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Batch options
 * @returns {Promise<Array>} Results
 */
async function batchProcess(items, processor, options = {}) {
  const {
    batchSize = 10,
    concurrency = 3,
    retryAttempts = 2,
    onBatchComplete = null
  } = options;
  
  const results = [];
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  // Process batches with concurrency limit
  const processBatch = async (batch, batchIndex) => {
    const batchResults = [];
    
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const itemIndex = batchIndex * batchSize + i;
      
      try {
        const result = await withRetry(
          () => processor(item, itemIndex),
          { maxRetries: retryAttempts }
        );
        batchResults.push({ success: true, result, index: itemIndex });
      } catch (error) {
        batchResults.push({ success: false, error: error.message, index: itemIndex });
      }
    }
    
    if (onBatchComplete) {
      onBatchComplete(batchIndex, batches.length, batchResults);
    }
    
    return batchResults;
  };
  
  // Process with concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const currentBatches = batches.slice(i, i + concurrency);
    const batchPromises = currentBatches.map((batch, idx) => 
      processBatch(batch, i + idx)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }
  
  // Sort by original index
  results.sort((a, b) => a.index - b.index);
  return results;
}

module.exports = {
  withRetry,
  sleep,
  isTransientError,
  circuitBreaker,
  batchProcess
};
