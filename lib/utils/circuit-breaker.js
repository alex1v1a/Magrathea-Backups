/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    
    this.metrics = {
      successes: 0,
      failures: 0,
      rejected: 0,
      stateChanges: []
    };
  }

  async execute(operation, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this._transitionTo('HALF_OPEN');
      } else {
        this.metrics.rejected++;
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }
    
    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      this.metrics.rejected++;
      throw new Error('Circuit breaker is HALF_OPEN - max test calls reached');
    }
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }
    
    try {
      const result = await operation(...args);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  _onSuccess() {
    this.failures = 0;
    this.metrics.successes++;
    
    if (this.state === 'HALF_OPEN') {
      this._transitionTo('CLOSED');
    }
  }

  _onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.metrics.failures++;
    
    if (this.failures >= this.failureThreshold) {
      this._transitionTo('OPEN');
    }
  }

  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.halfOpenCalls = 0;
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenCalls = 0;
    }
    
    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      time: new Date().toISOString()
    });
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      metrics: this.metrics,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Retry with circuit breaker wrapper
 */
async function withCircuitBreaker(operation, options = {}) {
  const breaker = new CircuitBreaker(options);
  
  return {
    execute: (...args) => breaker.execute(operation, ...args),
    getState: () => breaker.getState()
  };
}

module.exports = {
  CircuitBreaker,
  withCircuitBreaker
};
