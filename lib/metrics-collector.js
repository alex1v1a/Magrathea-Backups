/**
 * @fileoverview Metrics Collector - System-wide metrics aggregation
 * 
 * Features:
 * - Time-series metrics collection
 * - Prometheus-compatible export format
 * - Automatic aggregation and rollups
 * - Alert thresholds
 * 
 * @module lib/metrics-collector
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class MetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.namespace = options.namespace || 'marvin';
    this.retentionDays = options.retentionDays || 30;
    this.outputDir = options.outputDir || './logs/metrics';
    
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.timings = new Map();
  }

  // Counter (monotonically increasing)
  counter(name, help, labels = {}) {
    const key = this.formatKey(name, labels);
    
    return {
      inc: (value = 1) => {
        const current = this.counters.get(key) || 0;
        this.counters.set(key, current + value);
        this.emit('metric', { name, type: 'counter', value: current + value, labels });
      },
      get: () => this.counters.get(key) || 0
    };
  }

  // Gauge (can go up or down)
  gauge(name, help, labels = {}) {
    const key = this.formatKey(name, labels);
    
    return {
      set: (value) => {
        this.gauges.set(key, value);
        this.emit('metric', { name, type: 'gauge', value, labels });
      },
      inc: (value = 1) => {
        const current = this.gauges.get(key) || 0;
        this.gauges.set(key, current + value);
        this.emit('metric', { name, type: 'gauge', value: current + value, labels });
      },
      dec: (value = 1) => {
        const current = this.gauges.get(key) || 0;
        this.gauges.set(key, current - value);
        this.emit('metric', { name, type: 'gauge', value: current - value, labels });
      },
      get: () => this.gauges.get(key) || 0
    };
  }

  // Histogram (for tracking distributions)
  histogram(name, help, buckets = [0.1, 0.5, 1, 2.5, 5, 10], labels = {}) {
    const key = this.formatKey(name, labels);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        buckets: buckets.map(b => ({ le: b, count: 0 })),
        sum: 0,
        count: 0,
        bucketValues: []
      });
    }
    
    return {
      observe: (value) => {
        const h = this.histograms.get(key);
        h.sum += value;
        h.count++;
        h.bucketValues.push(value);
        
        h.buckets.forEach(b => {
          if (value <= b.le) b.count++;
        });
        
        // Keep only last 1000 values for memory
        if (h.bucketValues.length > 1000) {
          h.bucketValues = h.bucketValues.slice(-1000);
        }
        
        this.emit('metric', { name, type: 'histogram', value, labels });
      },
      get: () => this.histograms.get(key)
    };
  }

  // Timer (convenience for histogram)
  timer(name, help, labels = {}) {
    const hist = this.histogram(name, help, undefined, labels);
    
    return {
      start: () => {
        const startTime = process.hrtime.bigint();
        return {
          end: () => {
            const duration = Number(process.hrtime.bigint() - startTime) / 1e6; // Convert to ms
            hist.observe(duration);
            return duration;
          }
        };
      },
      observe: (duration) => hist.observe(duration)
    };
  }

  formatKey(name, labels) {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  // Export in Prometheus format
  toPrometheus() {
    const lines = [];
    
    // Counters
    for (const [key, value] of this.counters) {
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${this.namespace}_${key} ${value}`);
    }
    
    // Gauges
    for (const [key, value] of this.gauges) {
      lines.push(`# TYPE ${key} gauge`);
      lines.push(`${this.namespace}_${key} ${value}`);
    }
    
    // Histograms
    for (const [key, h] of this.histograms) {
      lines.push(`# TYPE ${key} histogram`);
      h.buckets.forEach(b => {
        lines.push(`${this.namespace}_${key}_bucket{le="${b.le}"} ${b.count}`);
      });
      lines.push(`${this.namespace}_${key}_bucket{le="+Inf"} ${h.count}`);
      lines.push(`${this.namespace}_${key}_sum ${h.sum}`);
      lines.push(`${this.namespace}_${key}_count ${h.count}`);
    }
    
    return lines.join('\n');
  }

  // Export as JSON
  toJSON() {
    return {
      timestamp: new Date().toISOString(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms).map(([k, v]) => [k, {
          buckets: v.buckets,
          sum: v.sum,
          count: v.count,
          p50: this.percentile(v.bucketValues, 0.5),
          p95: this.percentile(v.bucketValues, 0.95),
          p99: this.percentile(v.bucketValues, 0.99)
        }])
      )
    };
  }

  percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const arr = [...sorted].sort((a, b) => a - b);
    const index = Math.ceil(arr.length * p) - 1;
    return arr[Math.max(0, index)];
  }

  async save() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(this.outputDir, `metrics-${timestamp}.json`);
    
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(this.toJSON(), null, 2));
    
    // Also save latest
    await fs.writeFile(
      path.join(this.outputDir, 'latest.json'),
      JSON.stringify(this.toJSON(), null, 2)
    );
    
    // Save Prometheus format
    await fs.writeFile(
      path.join(this.outputDir, 'metrics.prom'),
      this.toPrometheus()
    );
    
    return filepath;
  }

  // Create time-series rollup
  rollup(intervalMinutes = 60) {
    const rollup = {
      timestamp: new Date().toISOString(),
      interval: `${intervalMinutes}m`,
      counters: {},
      gauges: {},
      histograms: {}
    };
    
    for (const [key, value] of this.counters) {
      rollup.counters[key] = {
        value,
        rate: value / intervalMinutes
      };
    }
    
    for (const [key, value] of this.gauges) {
      rollup.gauges[key] = { value };
    }
    
    return rollup;
  }

  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timings.clear();
  }
}

// Singleton
let instance = null;

function getMetricsCollector(options) {
  if (!instance) {
    instance = new MetricsCollector(options);
  }
  return instance;
}

module.exports = { MetricsCollector, getMetricsCollector };
