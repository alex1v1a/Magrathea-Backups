/**
 * @fileoverview Performance Profiler - Track and analyze execution performance
 * 
 * Features:
 * - Function timing and tracing
 * - Memory usage tracking
 * - Performance bottleneck identification
 * - Export to various formats
 * 
 * @module lib/profiler-v3
 */

const fs = require('fs').promises;
const path = require('path');

class PerformanceProfiler {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.logToConsole = options.logToConsole || false;
    this.outputPath = options.outputPath || null;
    
    this.spans = [];
    this.activeSpans = new Map();
    this.metrics = {
      callCounts: {},
      totalTime: {},
      avgTime: {},
      maxTime: {},
      minTime: {}
    };
  }

  /**
   * Start a timing span
   * 
   * @param {string} name - Span name
   * @param {Object} metadata - Additional metadata
   * @returns {string} Span ID
   */
  startSpan(name, metadata = {}) {
    if (!this.enabled) return null;
    
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const span = {
      id,
      name,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      metadata
    };
    
    this.activeSpans.set(id, span);
    
    if (this.logToConsole) {
      console.log(`▶️  ${name} started`);
    }
    
    return id;
  }

  /**
   * End a timing span
   * 
   * @param {string} id - Span ID from startSpan
   * @param {Object} additionalMetadata - Additional metadata to add
   * @returns {Object} Span result
   */
  endSpan(id, additionalMetadata = {}) {
    if (!this.enabled || !id) return null;
    
    const span = this.activeSpans.get(id);
    if (!span) {
      console.warn(`Span ${id} not found`);
      return null;
    }
    
    span.endTime = performance.now();
    span.endMemory = process.memoryUsage();
    span.duration = span.endTime - span.startTime;
    span.memoryDelta = {
      heapUsed: span.endMemory.heapUsed - span.startMemory.heapUsed,
      heapTotal: span.endMemory.heapTotal - span.startMemory.heapTotal,
      external: span.endMemory.external - span.startMemory.external
    };
    
    Object.assign(span.metadata, additionalMetadata);
    
    this.spans.push(span);
    this.activeSpans.delete(id);
    
    // Update metrics
    this.updateMetrics(span);
    
    if (this.logToConsole) {
      console.log(`⏹️  ${span.name} ended (${span.duration.toFixed(2)}ms)`);
    }
    
    return span;
  }

  /**
   * Profile an async function
   * 
   * @param {Function} fn - Function to profile
   * @param {string} name - Profile name
   * @param {*} args - Arguments to pass to function
   * @returns {Promise<*>} Function result
   */
  async profile(fn, name, ...args) {
    const id = this.startSpan(name, { type: 'function', args: args.length });
    
    try {
      const result = await fn(...args);
      this.endSpan(id, { success: true });
      return result;
    } catch (error) {
      this.endSpan(id, { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Create a profiled wrapper for a function
   */
  wrap(fn, name) {
    const profiler = this;
    
    return async function(...args) {
      return profiler.profile(fn.bind(this), name || fn.name, ...args);
    };
  }

  /**
   * Get performance report
   */
  getReport() {
    const totalDuration = this.spans.reduce((sum, s) => sum + s.duration, 0);
    
    // Group by name
    const byName = {};
    for (const span of this.spans) {
      if (!byName[span.name]) {
        byName[span.name] = [];
      }
      byName[span.name].push(span);
    }
    
    // Calculate statistics per name
    const statistics = {};
    for (const [name, spans] of Object.entries(byName)) {
      const durations = spans.map(s => s.duration);
      statistics[name] = {
        count: spans.length,
        total: durations.reduce((a, b) => a + b, 0),
        avg: durations.reduce((a, b) => a + b, 0) / spans.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: this.percentile(durations, 0.95),
        p99: this.percentile(durations, 0.99)
      };
    }
    
    // Find bottlenecks (top 5 by total time)
    const bottlenecks = Object.entries(statistics)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    
    return {
      summary: {
        totalSpans: this.spans.length,
        totalDuration: totalDuration.toFixed(2),
        avgSpanDuration: (totalDuration / this.spans.length).toFixed(2),
        uniqueOperations: Object.keys(byName).length
      },
      statistics,
      bottlenecks: bottlenecks.map(([name, stats]) => ({ name, ...stats })),
      activeSpans: this.activeSpans.size
    };
  }

  /**
   * Export report to file
   */
  async export(format = 'json') {
    if (!this.outputPath) return;
    
    const report = this.getReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `profile-${timestamp}.${format}`;
    const filepath = path.join(this.outputPath, filename);
    
    await fs.mkdir(this.outputPath, { recursive: true });
    
    if (format === 'json') {
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    } else if (format === 'markdown') {
      await fs.writeFile(filepath, this.toMarkdown(report));
    }
    
    return filepath;
  }

  /**
   * Reset all data
   */
  reset() {
    this.spans = [];
    this.activeSpans.clear();
    this.metrics = {
      callCounts: {},
      totalTime: {},
      avgTime: {},
      maxTime: {},
      minTime: {}
    };
  }

  updateMetrics(span) {
    const { name, duration } = span;
    
    this.metrics.callCounts[name] = (this.metrics.callCounts[name] || 0) + 1;
    this.metrics.totalTime[name] = (this.metrics.totalTime[name] || 0) + duration;
    
    const count = this.metrics.callCounts[name];
    this.metrics.avgTime[name] = this.metrics.totalTime[name] / count;
    
    if (!this.metrics.maxTime[name] || duration > this.metrics.maxTime[name]) {
      this.metrics.maxTime[name] = duration;
    }
    
    if (!this.metrics.minTime[name] || duration < this.metrics.minTime[name]) {
      this.metrics.minTime[name] = duration;
    }
  }

  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  toMarkdown(report) {
    const lines = [
      '# Performance Profile Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `- **Total Spans:** ${report.summary.totalSpans}`,
      `- **Total Duration:** ${report.summary.totalDuration}ms`,
      `- **Average Span:** ${report.summary.avgSpanDuration}ms`,
      `- **Unique Operations:** ${report.summary.uniqueOperations}`,
      '',
      '## Top Bottlenecks',
      ''
    ];
    
    for (const b of report.bottlenecks) {
      lines.push(`### ${b.name}`);
      lines.push(`- Calls: ${b.count}`);
      lines.push(`- Total: ${b.total.toFixed(2)}ms`);
      lines.push(`- Average: ${b.avg.toFixed(2)}ms`);
      lines.push(`- P95: ${b.p95.toFixed(2)}ms`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// Singleton instance
let defaultProfiler = null;

function getProfiler(options) {
  if (!defaultProfiler) {
    defaultProfiler = new PerformanceProfiler(options);
  }
  return defaultProfiler;
}

module.exports = { PerformanceProfiler, getProfiler };
