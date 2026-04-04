/**
 * Performance Metrics and Monitoring
 * 
 * Tracks automation performance, success rates, and error patterns.
 * Provides insights for optimization and alerting.
 * 
 * @module lib/metrics
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

// Metrics configuration
const METRICS_CONFIG = {
  // Metrics file path
  metricsPath: path.join(process.cwd(), 'data', 'metrics.json'),
  // Max history entries per metric
  maxHistory: 1000,
  // Alert thresholds
  alerts: {
    errorRateThreshold: 0.1, // 10%
    latencyThreshold: 30000, // 30 seconds
    circuitBreakerThreshold: 3 // 3 trips in 1 hour
  }
};

/**
 * Timer for measuring operation duration
 */
class Timer {
  constructor(name) {
    this.name = name;
    this.startTime = process.hrtime.bigint();
  }

  /**
   * Stop timer and return duration in ms
   */
  stop() {
    const endTime = process.hrtime.bigint();
    return Number(endTime - this.startTime) / 1000000; // Convert to ms
  }
}

/**
 * Metrics collector
 */
class Metrics {
  constructor(options = {}) {
    this.config = { ...METRICS_CONFIG, ...options };
    this.data = {
      counters: {},
      gauges: {},
      histograms: {},
      events: [],
      alerts: []
    };
    this.initialized = false;
  }

  /**
   * Initialize metrics (load from disk)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      const content = await fs.readFile(this.config.metricsPath, 'utf8');
      const loaded = JSON.parse(content);
      this.data = { ...this.data, ...loaded };
      logger.debug('Metrics loaded from disk');
    } catch {
      // File doesn't exist yet
    }
    
    this.initialized = true;
  }

  /**
   * Persist metrics to disk
   */
  async persist() {
    try {
      const dir = path.dirname(this.config.metricsPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Trim history before saving
      this.trimHistory();
      
      await fs.writeFile(
        this.config.metricsPath, 
        JSON.stringify(this.data, null, 2),
        'utf8'
      );
    } catch (error) {
      logger.error('Failed to persist metrics:', error.message);
    }
  }

  /**
   * Increment a counter
   * @param {string} name - Counter name
   * @param {number} value - Amount to increment
   * @param {Object} tags - Optional tags
   */
  increment(name, value = 1, tags = {}) {
    const key = this.makeKey(name, tags);
    this.data.counters[key] = (this.data.counters[key] || 0) + value;
  }

  /**
   * Set a gauge value
   * @param {string} name - Gauge name
   * @param {number} value - Value
   * @param {Object} tags - Optional tags
   */
  gauge(name, value, tags = {}) {
    const key = this.makeKey(name, tags);
    this.data.gauges[key] = {
      value,
      timestamp: Date.now()
    };
  }

  /**
   * Record a histogram value
   * @param {string} name - Histogram name
   * @param {number} value - Value to record
   * @param {Object} tags - Optional tags
   */
  histogram(name, value, tags = {}) {
    const key = this.makeKey(name, tags);
    
    if (!this.data.histograms[key]) {
      this.data.histograms[key] = {
        values: [],
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity
      };
    }
    
    const h = this.data.histograms[key];
    h.values.push(value);
    h.count++;
    h.sum += value;
    h.min = Math.min(h.min, value);
    h.max = Math.max(h.max, value);
    
    // Keep only last N values
    if (h.values.length > this.config.maxHistory) {
      h.values.shift();
    }
  }

  /**
   * Record an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  event(type, data = {}) {
    this.data.events.push({
      type,
      data,
      timestamp: Date.now()
    });
    
    // Trim events
    if (this.data.events.length > this.config.maxHistory) {
      this.data.events.shift();
    }
  }

  /**
   * Time an operation
   * @param {string} name - Operation name
   * @param {Function} fn - Async function to time
   * @param {Object} tags - Optional tags
   * @returns {Promise<any>}
   */
  async time(name, fn, tags = {}) {
    const timer = new Timer(name);
    
    try {
      const result = await fn();
      const duration = timer.stop();
      
      this.histogram(`${name}_duration`, duration, { ...tags, status: 'success' });
      this.increment(`${name}_total`, 1, { ...tags, status: 'success' });
      
      return result;
    } catch (error) {
      const duration = timer.stop();
      
      this.histogram(`${name}_duration`, duration, { ...tags, status: 'error' });
      this.increment(`${name}_total`, 1, { ...tags, status: 'error' });
      
      throw error;
    }
  }

  /**
   * Create a timer without auto-recording
   * @param {string} name
   * @returns {Timer}
   */
  timer(name) {
    return new Timer(name);
  }

  /**
   * Make a key from name and tags
   */
  makeKey(name, tags) {
    if (Object.keys(tags).length === 0) return name;
    
    const tagStr = Object.entries(tags)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }

  /**
   * Trim history to max size
   */
  trimHistory() {
    if (this.data.events.length > this.config.maxHistory) {
      this.data.events = this.data.events.slice(-this.config.maxHistory);
    }
  }

  /**
   * Get metric value
   * @param {string} name
   * @param {Object} tags
   * @returns {any}
   */
  get(name, tags = {}) {
    const key = this.makeKey(name, tags);
    return this.data.counters[key] || 
           this.data.gauges[key]?.value || 
           this.data.histograms[key];
  }

  /**
   * Get success rate for an operation
   * @param {string} name
   * @param {Object} tags
   * @returns {number} Success rate (0-1)
   */
  getSuccessRate(name, tags = {}) {
    const successKey = this.makeKey(`${name}_total`, { ...tags, status: 'success' });
    const errorKey = this.makeKey(`${name}_total`, { ...tags, status: 'error' });
    
    const success = this.data.counters[successKey] || 0;
    const errors = this.data.counters[errorKey] || 0;
    const total = success + errors;
    
    return total > 0 ? success / total : 1;
  }

  /**
   * Get average latency
   * @param {string} name
   * @param {Object} tags
   * @returns {number} Average latency in ms
   */
  getAverageLatency(name, tags = {}) {
    const key = this.makeKey(`${name}_duration`, { ...tags, status: 'success' });
    const hist = this.data.histograms[key];
    
    if (!hist || hist.count === 0) return 0;
    return hist.sum / hist.count;
  }

  /**
   * Check and trigger alerts
   */
  checkAlerts() {
    const alerts = [];
    const now = Date.now();
    
    // Check error rates
    for (const key of Object.keys(this.data.counters)) {
      if (key.includes('_total')) {
        const opName = key.split('{')[0].replace('_total', '');
        const rate = this.getSuccessRate(opName);
        
        if (rate < (1 - this.config.alerts.errorRateThreshold)) {
          alerts.push({
            type: 'high_error_rate',
            operation: opName,
            errorRate: (1 - rate).toFixed(2),
            timestamp: now
          });
        }
      }
    }
    
    // Check latencies
    for (const [key, hist] of Object.entries(this.data.histograms)) {
      if (hist.max > this.config.alerts.latencyThreshold) {
        alerts.push({
          type: 'high_latency',
          operation: key,
          maxLatency: hist.max.toFixed(2),
          timestamp: now
        });
      }
    }
    
    // Store alerts
    this.data.alerts.push(...alerts);
    
    return alerts;
  }

  /**
   * Get summary statistics
   * @returns {Object}
   */
  getSummary() {
    const summary = {
      counters: {},
      successRates: {},
      latencies: {},
      recentAlerts: this.data.alerts.slice(-10),
      recentEvents: this.data.events.slice(-10)
    };
    
    // Summarize counters
    for (const [key, value] of Object.entries(this.data.counters)) {
      summary.counters[key] = value;
    }
    
    // Calculate success rates
    const operations = new Set();
    for (const key of Object.keys(this.data.counters)) {
      if (key.includes('_total')) {
        operations.add(key.split('{')[0].replace('_total', ''));
      }
    }
    
    for (const op of operations) {
      summary.successRates[op] = (this.getSuccessRate(op) * 100).toFixed(2) + '%';
      summary.latencies[op] = this.getAverageLatency(op).toFixed(2) + 'ms';
    }
    
    return summary;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.data = {
      counters: {},
      gauges: {},
      histograms: {},
      events: [],
      alerts: []
    };
  }
}

// Singleton instance
let metricsInstance = null;

/**
 * Get or create metrics instance
 * @param {Object} options
 * @returns {Metrics}
 */
function getMetrics(options = {}) {
  if (!metricsInstance) {
    metricsInstance = new Metrics(options);
  }
  return metricsInstance;
}

/**
 * Reset metrics (for testing)
 */
function resetMetrics() {
  metricsInstance = null;
}

module.exports = {
  Metrics,
  Timer,
  METRICS_CONFIG,
  getMetrics,
  resetMetrics
};
