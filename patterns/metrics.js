/**
 * Metrics Collection System
 * Tracks performance, reliability, and usage statistics
 */

const fs = require('fs').promises;
const path = require('path');

const METRICS_DIR = path.join(process.cwd(), 'data', 'metrics');
const METRICS_FILE = path.join(METRICS_DIR, 'metrics.jsonl');

/**
 * Initialize metrics storage
 */
async function initMetrics() {
  try {
    await fs.mkdir(METRICS_DIR, { recursive: true });
  } catch (e) {
    // Already exists
  }
}

/**
 * Record a metric event
 */
async function recordMetric(type, data) {
  await initMetrics();
  
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    ...data
  };
  
  try {
    await fs.appendFile(METRICS_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('Failed to record metric:', e.message);
  }
}

/**
 * Record script execution
 */
async function recordExecution(scriptName, duration, success, metadata = {}) {
  await recordMetric('execution', {
    script: scriptName,
    duration_ms: duration,
    success,
    ...metadata
  });
}

/**
 * Record API call
 */
async function recordApiCall(service, endpoint, duration, success, error = null) {
  await recordMetric('api_call', {
    service,
    endpoint,
    duration_ms: duration,
    success,
    error: error?.message || null
  });
}

/**
 * Record error
 */
async function recordError(source, error, context = {}) {
  await recordMetric('error', {
    source,
    error: error.message,
    stack: error.stack,
    ...context
  });
}

/**
 * Get metrics summary
 */
async function getMetricsSummary(days = 7) {
  await initMetrics();
  
  try {
    const data = await fs.readFile(METRICS_FILE, 'utf8');
    const lines = data.split('\n').filter(l => l.trim());
    
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const metrics = {
      executions: [],
      apiCalls: [],
      errors: []
    };
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryDate = new Date(entry.timestamp);
        
        if (entryDate < since) continue;
        
        switch (entry.type) {
          case 'execution':
            metrics.executions.push(entry);
            break;
          case 'api_call':
            metrics.apiCalls.push(entry);
            break;
          case 'error':
            metrics.errors.push(entry);
            break;
        }
      } catch (e) {
        // Skip malformed entries
      }
    }
    
    // Calculate stats
    const summary = {
      period: `${days} days`,
      executions: {
        total: metrics.executions.length,
        successful: metrics.executions.filter(e => e.success).length,
        failed: metrics.executions.filter(e => !e.success).length,
        avgDuration: metrics.executions.reduce((a, e) => a + (e.duration_ms || 0), 0) / metrics.executions.length || 0
      },
      apiCalls: {
        total: metrics.apiCalls.length,
        successful: metrics.apiCalls.filter(e => e.success).length,
        failed: metrics.apiCalls.filter(e => !e.success).length,
        byService: {}
      },
      errors: {
        total: metrics.errors.length,
        bySource: {}
      }
    };
    
    // Group by service
    for (const call of metrics.apiCalls) {
      const service = call.service || 'unknown';
      if (!summary.apiCalls.byService[service]) {
        summary.apiCalls.byService[service] = { count: 0, errors: 0 };
      }
      summary.apiCalls.byService[service].count++;
      if (!call.success) {
        summary.apiCalls.byService[service].errors++;
      }
    }
    
    // Group errors by source
    for (const error of metrics.errors) {
      const source = error.source || 'unknown';
      summary.errors.bySource[source] = (summary.errors.bySource[source] || 0) + 1;
    }
    
    return summary;
    
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Metrics reporter class
 */
class MetricsReporter {
  constructor(name) {
    this.name = name;
    this.startTime = null;
  }
  
  start() {
    this.startTime = Date.now();
  }
  
  async end(success = true, metadata = {}) {
    const duration = Date.now() - this.startTime;
    await recordExecution(this.name, duration, success, metadata);
    return duration;
  }
  
  async error(error, context = {}) {
    await recordError(this.name, error, context);
  }
}

/**
 * API call wrapper with metrics
 */
async function withMetrics(service, endpoint, fn) {
  const start = Date.now();
  
  try {
    const result = await fn();
    await recordApiCall(service, endpoint, Date.now() - start, true);
    return result;
  } catch (error) {
    await recordApiCall(service, endpoint, Date.now() - start, false, error);
    throw error;
  }
}

module.exports = {
  recordMetric,
  recordExecution,
  recordApiCall,
  recordError,
  getMetricsSummary,
  MetricsReporter,
  withMetrics
};
