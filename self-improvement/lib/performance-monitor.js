/**
 * Performance Monitoring & Metrics Collection
 * 
 * Tracks automation performance metrics for continuous improvement:
 * - Operation timing
 * - Success/failure rates
 * - Resource usage
 * - Bottleneck identification
 * 
 * @module lib/performance-monitor
 */

const { logger } = require('../../dinner-automation/lib/logger');

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.sampleRate = options.sampleRate || 1.0; // 100% by default
    this.maxMetrics = options.maxMetrics || 10000;
    this.metrics = [];
    this.activeTimers = new Map();
    this.aggregates = new Map();
    this.startTime = Date.now();
  }

  /**
   * Start timing an operation
   */
  startTimer(operation, metadata = {}) {
    if (!this.enabled || Math.random() > this.sampleRate) return null;
    
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeTimers.set(id, {
      operation,
      startTime: Date.now(),
      metadata
    });
    
    return id;
  }

  /**
   * End timing and record metric
   */
  endTimer(timerId, result = 'success', error = null) {
    if (!timerId || !this.activeTimers.has(timerId)) return null;
    
    const timer = this.activeTimers.get(timerId);
    const duration = Date.now() - timer.startTime;
    
    const metric = {
      operation: timer.operation,
      duration,
      result,
      error: error?.message,
      timestamp: new Date().toISOString(),
      ...timer.metadata
    };
    
    this._recordMetric(metric);
    this.activeTimers.delete(timerId);
    
    return metric;
  }

  /**
   * Record a metric directly
   */
  recordMetric(operation, duration, result = 'success', metadata = {}) {
    if (!this.enabled || Math.random() > this.sampleRate) return;
    
    this._recordMetric({
      operation,
      duration,
      result,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  _recordMetric(metric) {
    this.metrics.push(metric);
    
    // Update aggregates
    const agg = this.aggregates.get(metric.operation) || {
      count: 0,
      totalDuration: 0,
      successes: 0,
      failures: 0,
      minDuration: Infinity,
      maxDuration: 0
    };
    
    agg.count++;
    agg.totalDuration += metric.duration;
    agg[metric.result === 'success' ? 'successes' : 'failures']++;
    agg.minDuration = Math.min(agg.minDuration, metric.duration);
    agg.maxDuration = Math.max(agg.maxDuration, metric.duration);
    
    this.aggregates.set(metric.operation, agg);
    
    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
  }

  /**
   * Get performance report
   */
  getReport(options = {}) {
    const { includeMetrics = false, timeRange = null } = options;
    
    let metrics = this.metrics;
    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      metrics = metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
    }

    const report = {
      summary: {
        totalOperations: metrics.length,
        uniqueOperations: this.aggregates.size,
        uptime: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      },
      operations: {}
    };

    for (const [operation, agg] of this.aggregates) {
      report.operations[operation] = {
        count: agg.count,
        avgDuration: Math.round(agg.totalDuration / agg.count),
        minDuration: agg.minDuration === Infinity ? 0 : agg.minDuration,
        maxDuration: agg.maxDuration,
        successRate: agg.count > 0 ? (agg.successes / agg.count * 100).toFixed(2) + '%' : '0%',
        successes: agg.successes,
        failures: agg.failures
      };
    }

    // Identify bottlenecks
    report.bottlenecks = this._identifyBottlenecks();
    
    if (includeMetrics) {
      report.metrics = metrics;
    }

    return report;
  }

  _identifyBottlenecks() {
    const bottlenecks = [];
    
    for (const [operation, agg] of this.aggregates) {
      if (agg.count < 5) continue; // Need enough samples
      
      const avgDuration = agg.totalDuration / agg.count;
      
      // Flag slow operations (> 5s average)
      if (avgDuration > 5000) {
        bottlenecks.push({
          operation,
          type: 'slow',
          avgDuration: Math.round(avgDuration),
          severity: avgDuration > 10000 ? 'high' : 'medium'
        });
      }
      
      // Flag high failure rate (> 20%)
      const failureRate = agg.failures / agg.count;
      if (failureRate > 0.2) {
        bottlenecks.push({
          operation,
          type: 'unreliable',
          failureRate: (failureRate * 100).toFixed(2) + '%',
          severity: failureRate > 0.5 ? 'high' : 'medium'
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Wrap a function with performance tracking
   */
  track(fn, operation, metadata = {}) {
    return async (...args) => {
      const timerId = this.startTimer(operation, metadata);
      try {
        const result = await fn(...args);
        this.endTimer(timerId, 'success');
        return result;
      } catch (error) {
        this.endTimer(timerId, 'failure', error);
        throw error;
      }
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format = 'json') {
    switch (format) {
      case 'json':
        return JSON.stringify(this.getReport({ includeMetrics: true }), null, 2);
      case 'csv':
        return this._toCSV();
      case 'prometheus':
        return this._toPrometheus();
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  _toCSV() {
    const headers = 'operation,duration,result,timestamp';
    const rows = this.metrics.map(m => 
      `${m.operation},${m.duration},${m.result},${m.timestamp}`
    );
    return [headers, ...rows].join('\n');
  }

  _toPrometheus() {
    const lines = [];
    
    for (const [operation, agg] of this.aggregates) {
      const safeOp = operation.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# HELP automation_${safeOp}_duration_ms Operation duration in milliseconds`);
      lines.push(`# TYPE automation_${safeOp}_duration_ms summary`);
      lines.push(`automation_${safeOp}_duration_ms_count ${agg.count}`);
      lines.push(`automation_${safeOp}_duration_ms_sum ${agg.totalDuration}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = [];
    this.aggregates.clear();
    this.activeTimers.clear();
    this.startTime = Date.now();
  }
}

// Singleton instance
let globalMonitor = null;

function getMonitor(options = {}) {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(options);
  }
  return globalMonitor;
}

module.exports = {
  PerformanceMonitor,
  getMonitor
};
