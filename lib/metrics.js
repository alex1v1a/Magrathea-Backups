/**
 * Marvin Automation Metrics System
 * Tracks performance, reliability, and success rates across all automation tasks
 */

const fs = require('fs').promises;
const path = require('path');

const METRICS_DIR = path.join(__dirname, '..', 'data', 'metrics');
const METRICS_FILE = path.join(METRICS_DIR, 'automation-metrics.jsonl');

// Ensure metrics directory exists
async function ensureDir() {
  try {
    await fs.mkdir(METRICS_DIR, { recursive: true });
  } catch (e) {}
}

/**
 * Record a metric event
 * @param {string} task - Task name (e.g., 'heb-cart', 'facebook-share')
 * @param {string} event - Event type ('start', 'success', 'failure', 'retry')
 * @param {Object} meta - Additional metadata
 */
async function record(task, event, meta = {}) {
  await ensureDir();
  
  const entry = {
    timestamp: new Date().toISOString(),
    task,
    event,
    ...meta
  };
  
  await fs.appendFile(METRICS_FILE, JSON.stringify(entry) + '\n');
}

/**
 * Start timing a task
 * @param {string} task - Task name
 * @returns {Function} Call to record completion
 */
function startTimer(task) {
  const start = Date.now();
  
  return async (success = true, meta = {}) => {
    const duration = Date.now() - start;
    await record(task, success ? 'success' : 'failure', {
      duration,
      ...meta
    });
    return duration;
  };
}

/**
 * Get metrics summary for a time period
 * @param {number} hours - Hours to look back
 */
async function getSummary(hours = 24) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  
  try {
    const data = await fs.readFile(METRICS_FILE, 'utf8');
    const lines = data.trim().split('\n').filter(Boolean);
    
    const entries = lines
      .map(l => JSON.parse(l))
      .filter(e => new Date(e.timestamp).getTime() > cutoff);
    
    const byTask = {};
    
    for (const e of entries) {
      if (!byTask[e.task]) {
        byTask[e.task] = {
          total: 0,
          success: 0,
          failure: 0,
          avgDuration: 0,
          durations: []
        };
      }
      
      byTask[e.task].total++;
      
      if (e.event === 'success') {
        byTask[e.task].success++;
        if (e.duration) byTask[e.task].durations.push(e.duration);
      } else if (e.event === 'failure') {
        byTask[e.task].failure++;
      }
    }
    
    // Calculate averages
    for (const task in byTask) {
      const d = byTask[task].durations;
      byTask[task].avgDuration = d.length > 0 
        ? Math.round(d.reduce((a, b) => a + b, 0) / d.length)
        : 0;
      delete byTask[task].durations;
      byTask[task].successRate = Math.round((byTask[task].success / byTask[task].total) * 100);
    }
    
    return byTask;
  } catch (e) {
    return {};
  }
}

/**
 * Print formatted metrics report
 */
async function printReport(hours = 24) {
  const summary = await getSummary(hours);
  
  console.log('\n📊 AUTOMATION METRICS REPORT');
  console.log('=' .repeat(60));
  console.log(`Period: Last ${hours} hours`);
  console.log(`Generated: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(60));
  
  if (Object.keys(summary).length === 0) {
    console.log('No data recorded in this period.');
    return;
  }
  
  for (const [task, stats] of Object.entries(summary)) {
    const status = stats.successRate >= 95 ? '🟢' : stats.successRate >= 80 ? '🟡' : '🔴';
    console.log(`\n${status} ${task}`);
    console.log(`   Total runs: ${stats.total}`);
    console.log(`   Success: ${stats.success} (${stats.successRate}%)`);
    console.log(`   Failed: ${stats.failure}`);
    if (stats.avgDuration > 0) {
      const mins = Math.floor(stats.avgDuration / 60000);
      const secs = Math.floor((stats.avgDuration % 60000) / 1000);
      console.log(`   Avg duration: ${mins}m ${secs}s`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
}

module.exports = {
  record,
  startTimer,
  getSummary,
  printReport
};

// CLI usage
if (require.main === module) {
  const hours = parseInt(process.argv[2]) || 24;
  printReport(hours).then(() => process.exit(0));
}
