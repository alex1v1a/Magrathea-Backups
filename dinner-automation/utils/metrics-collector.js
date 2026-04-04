/**
 * Metrics Collector
 * Performance instrumentation and monitoring
 * 
 * Features:
 * - Timing decorators for functions
 * - Memory usage tracking
 * - Custom metrics collection
 * - Export to JSON/CSV
 * - Histogram and percentile calculations
 * 
 * @module utils/metrics-collector
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class MetricsCollector extends EventEmitter {
  /**
   * Create metrics collector
   * @param {Object} options
   * @param {string} options.outputDir - Directory for metric exports
   * @param {boolean} options.autoSave - Auto save on exit (default: false)
   * @param {number} options.retentionCount - Keep last N reports (default: 10)
   */
  constructor(options = {}) {
    super();
    
    this.config = {
      outputDir: options.outputDir || path.join(process.cwd(), 'metrics'),
      autoSave: options.autoSave || false,
      retentionCount: options.retentionCount || 10
    };

    this.timers = new Map();
    this.metrics = new Map();
    this.histograms = new Map();
    this.sessionStart = Date.now();
    this.markers = [];

    if (this.config.autoSave) {
      this._setupAutoSave();
    }
  }

  /**
   * Setup auto-save on exit
   * @private
   */
  _setupAutoSave() {
    const save = async () => {
      await this.save();
    };

    process.on('exit', save);
    process.on('SIGINT', () => { save(); process.exit(0); });
    process.on('SIGTERM', () => { save(); process.exit(0); });
    process.on('uncaughtException', () => { save(); process.exit(1); });
  }

  /**
   * Start a timer
   * @param {string} name - Timer name
   * @returns {Object} Timer object with end() method
   */
  startTimer(name) {
    const start = performance.now();
    const startTime = Date.now();
    
    const timer = {
      name,
      start,
      startTime,
      end: () => {
        const duration = performance.now() - start;
        this._recordTiming(name, duration);
        return duration;
      }
    };

    this.timers.set(name, timer);
    return timer;
  }

  /**
   * Record a timing value
   * @private
   */
  _recordTiming(name, duration) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        type: 'timing',
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
        values: []
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
    metric.values.push(duration);

    // Keep only last 1000 values for memory efficiency
    if (metric.values.length > 1000) {
      metric.values = metric.values.slice(-1000);
    }

    this.emit('timing', { name, duration });
  }

  /**
   * Increment a counter
   * @param {string} name - Counter name
   * @param {number} value - Amount to increment (default: 1)
   */
  increment(name, value = 1) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        type: 'counter',
        value: 0
      });
    }

    const metric = this.metrics.get(name);
    metric.value += value;
    
    this.emit('counter', { name, value: metric.value });
  }

  /**
   * Record a gauge value
   * @param {string} name - Gauge name
   * @param {number} value - Current value
   */
  gauge(name, value) {
    this.metrics.set(name, {
      type: 'gauge',
      value,
      timestamp: Date.now()
    });
    
    this.emit('gauge', { name, value });
  }

  /**
   * Record a histogram value
   * @param {string} name - Histogram name
   * @param {number} value - Value to record
   */
  histogram(name, value) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }

    const values = this.histograms.get(name);
    values.push(value);

    // Keep last 10000 values
    if (values.length > 10000) {
      values.shift();
    }
  }

  /**
   * Add a marker/event
   * @param {string} name - Marker name
   * @param {Object} data - Additional data
   */
  marker(name, data = {}) {
    this.markers.push({
      name,
      timestamp: Date.now(),
      elapsed: Date.now() - this.sessionStart,
      ...data
    });
  }

  /**
   * Create a timing decorator
   * @param {string} name - Metric name (optional, defaults to function name)
   * @returns {Function} Decorator
   */
  time(name) {
    return (target, propertyKey, descriptor) => {
      const metricName = name || propertyKey;
      const originalMethod = descriptor.value;

      descriptor.value = async (...args) => {
        const timer = this.startTimer(metricName);
        try {
          return await originalMethod.apply(target, args);
        } finally {
          timer.end();
        }
      };

      return descriptor;
    };
  }

  /**
   * Get memory usage snapshot
   * @returns {Object}
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: this._formatBytes(usage.rss),
      heapTotal: this._formatBytes(usage.heapTotal),
      heapUsed: this._formatBytes(usage.heapUsed),
      external: this._formatBytes(usage.external),
      arrayBuffers: this._formatBytes(usage.arrayBuffers),
      raw: usage
    };
  }

  /**
   * Format bytes to human readable
   * @private
   */
  _formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Calculate percentiles
   * @private
   */
  _calculatePercentiles(values) {
    if (values.length === 0) return {};

    const sorted = [...values].sort((a, b) => a - b);
    
    const percentile = (p) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99)
    };
  }

  /**
   * Get summary statistics
   * @returns {Object}
   */
  getSummary() {
    const summary = {
      session: {
        startTime: new Date(this.sessionStart).toISOString(),
        duration: Date.now() - this.sessionStart
      },
      memory: this.getMemoryUsage(),
      metrics: {},
      histograms: {},
      markers: this.markers
    };

    // Process metrics
    for (const [name, metric] of this.metrics) {
      if (metric.type === 'timing') {
        summary.metrics[name] = {
          type: 'timing',
          count: metric.count,
          avg: metric.count > 0 ? (metric.total / metric.count).toFixed(2) : 0,
          min: metric.min === Infinity ? 0 : metric.min.toFixed(2),
          max: metric.max.toFixed(2),
          total: metric.total.toFixed(2),
          percentiles: this._calculatePercentiles(metric.values)
        };
      } else {
        summary.metrics[name] = { ...metric };
      }
    }

    // Process histograms
    for (const [name, values] of this.histograms) {
      summary.histograms[name] = {
        count: values.length,
        ...this._calculatePercentiles(values)
      };
    }

    return summary;
  }

  /**
   * Print formatted report to console
   */
  printReport() {
    const summary = this.getSummary();

    console.log('\n📊 METRICS REPORT');
    console.log('═'.repeat(60));
    
    console.log(`\n⏱️  Session: ${(summary.session.duration / 1000).toFixed(1)}s`);
    
    console.log('\n💾 Memory:');
    console.log(`  Heap Used:  ${summary.memory.heapUsed}`);
    console.log(`  Heap Total: ${summary.memory.heapTotal}`);
    console.log(`  RSS:        ${summary.memory.rss}`);

    const timings = Object.entries(summary.metrics)
      .filter(([, m]) => m.type === 'timing');

    if (timings.length > 0) {
      console.log('\n⏰ Timings:');
      timings.forEach(([name, m]) => {
        console.log(`  ${name.padEnd(25)} ${m.avg}ms avg | ${m.count} calls | min:${m.min} max:${m.max}`);
      });
    }

    const counters = Object.entries(summary.metrics)
      .filter(([, m]) => m.type === 'counter');

    if (counters.length > 0) {
      console.log('\n📈 Counters:');
      counters.forEach(([name, m]) => {
        console.log(`  ${name}: ${m.value}`);
      });
    }

    console.log('═'.repeat(60));
  }

  /**
   * Save metrics to file
   * @param {string} format - 'json' | 'csv'
   * @returns {Promise<string>} File path
   */
  async save(format = 'json') {
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summary = this.getSummary();

    if (format === 'json') {
      const filepath = path.join(this.config.outputDir, `metrics-${timestamp}.json`);
      await fs.writeFile(filepath, JSON.stringify(summary, null, 2));
      
      await this._cleanupOldFiles('json');
      return filepath;
    }

    if (format === 'csv') {
      const filepath = path.join(this.config.outputDir, `metrics-${timestamp}.csv`);
      const csv = this._toCSV(summary);
      await fs.writeFile(filepath, csv);
      
      await this._cleanupOldFiles('csv');
      return filepath;
    }

    throw new Error(`Unknown format: ${format}`);
  }

  /**
   * Convert summary to CSV
   * @private
   */
  _toCSV(summary) {
    const lines = ['metric_type,name,value,count,avg,min,max'];

    for (const [name, metric] of Object.entries(summary.metrics)) {
      if (metric.type === 'timing') {
        lines.push(`timing,${name},${metric.total},${metric.count},${metric.avg},${metric.min},${metric.max}`);
      } else if (metric.type === 'counter') {
        lines.push(`counter,${name},${metric.value},,,,`);
      } else if (metric.type === 'gauge') {
        lines.push(`gauge,${name},${metric.value},,,,`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Cleanup old metric files
   * @private
   */
  async _cleanupOldFiles(extension) {
    try {
      const files = await fs.readdir(this.config.outputDir);
      const metricFiles = files
        .filter(f => f.startsWith('metrics-') && f.endsWith(`.${extension}`))
        .map(f => ({
          name: f,
          path: path.join(this.config.outputDir, f),
          stat: fs.stat(path.join(this.config.outputDir, f))
        }));

      if (metricFiles.length <= this.config.retentionCount) return;

      const stats = await Promise.all(metricFiles.map(async f => ({
        ...f,
        stat: await f.stat
      })));

      // Sort by mtime, oldest first
      stats.sort((a, b) => a.stat.mtime - b.stat.mtime);

      // Delete oldest
      const toDelete = stats.slice(0, stats.length - this.config.retentionCount);
      for (const file of toDelete) {
        await fs.unlink(file.path);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.timers.clear();
    this.metrics.clear();
    this.histograms.clear();
    this.markers = [];
    this.sessionStart = Date.now();
  }
}

// Decorator helper
function timed(collector, name) {
  return collector.time(name);
}

module.exports = { MetricsCollector, timed };
