/**
 * Performance Monitor
 * Tracks and analyzes automation performance over time
 * 
 * Usage:
 *   node performance-monitor.js --analyze
 *   node performance-monitor.js --report
 *   node performance-monitor.js --optimize
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.baselines = {};
  }

  /**
   * Load all performance data
   */
  async loadData() {
    try {
      // Load result files
      const files = await fs.readdir(DATA_DIR);
      const resultFiles = files.filter(f => 
        f.includes('results') && f.endsWith('.json')
      );

      for (const file of resultFiles) {
        try {
          const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          const data = JSON.parse(content);
          this.metrics.push({
            source: file,
            timestamp: data.timestamp || data.startTime,
            ...data
          });
        } catch (e) {
          // Skip invalid files
        }
      }

      // Sort by timestamp
      this.metrics.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log(`Loaded ${this.metrics.length} performance records`);
      
    } catch (error) {
      console.error('Error loading data:', error.message);
    }
  }

  /**
   * Calculate performance trends
   */
  analyzeTrends() {
    const analysis = {
      totalRuns: this.metrics.length,
      successRate: 0,
      avgDuration: 0,
      avgItemsPerRun: 0,
      failurePatterns: {},
      slowestOperations: [],
      recommendations: []
    };

    if (this.metrics.length === 0) return analysis;

    // Success rate
    const successful = this.metrics.filter(m => m.success);
    analysis.successRate = (successful.length / this.metrics.length * 100).toFixed(1);

    // Average duration
    const durations = this.metrics
      .filter(m => m.endTime && m.startTime)
      .map(m => new Date(m.endTime) - new Date(m.startTime));
    
    if (durations.length > 0) {
      analysis.avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length / 1000).toFixed(1);
    }

    // Items per run
    const itemsAdded = this.metrics.map(m => m.itemsAdded || 0);
    analysis.avgItemsPerRun = (itemsAdded.reduce((a, b) => a + b, 0) / itemsAdded.length).toFixed(1);

    // Failure patterns
    for (const metric of this.metrics) {
      if (metric.itemsFailed) {
        for (const failure of metric.itemsFailed) {
          const key = failure.error || failure.reason || 'Unknown';
          analysis.failurePatterns[key] = (analysis.failurePatterns[key] || 0) + 1;
        }
      }
      if (metric.fatalError) {
        analysis.failurePatterns[metric.fatalError] = 
          (analysis.failurePatterns[metric.fatalError] || 0) + 1;
      }
    }

    // Extract metrics from profiler data
    const operationTimes = {};
    for (const metric of this.metrics) {
      if (metric.metrics) {
        for (const [op, data] of Object.entries(metric.metrics)) {
          if (!operationTimes[op]) operationTimes[op] = [];
          if (data.duration) operationTimes[op].push(data.duration);
        }
      }
    }

    analysis.slowestOperations = Object.entries(operationTimes)
      .map(([op, times]) => ({
        operation: op,
        avgTime: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0),
        maxTime: Math.max(...times),
        count: times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (parseFloat(analysis.successRate) < 90) {
      recommendations.push({
        priority: 'high',
        issue: 'Low success rate',
        suggestion: 'Review failure patterns and implement better error handling',
        action: 'Add circuit breakers and retry logic'
      });
    }

    if (parseFloat(analysis.avgDuration) > 300) {
      recommendations.push({
        priority: 'medium',
        issue: 'Long execution time',
        suggestion: 'Consider parallel processing or reducing delays',
        action: 'Implement batch processing with concurrency'
      });
    }

    // Check for common failures
    const failures = Object.entries(analysis.failurePatterns)
      .sort((a, b) => b[1] - a[1]);
    
    if (failures.length > 0) {
      const [topFailure, count] = failures[0];
      if (count > 3) {
        recommendations.push({
          priority: 'high',
          issue: `Recurring failure: ${topFailure.slice(0, 50)}`,
          suggestion: 'Address root cause of this specific error',
          action: 'Add targeted error handling'
        });
      }
    }

    return recommendations;
  }

  /**
   * Print performance report
   */
  printReport(analysis) {
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('═'.repeat(60));
    
    console.log(`\n📈 Overview:`);
    console.log(`  Total Runs:     ${analysis.totalRuns}`);
    console.log(`  Success Rate:   ${analysis.successRate}%`);
    console.log(`  Avg Duration:   ${analysis.avgDuration}s`);
    console.log(`  Avg Items/Run:  ${analysis.avgItemsPerRun}`);

    if (Object.keys(analysis.failurePatterns).length > 0) {
      console.log(`\n❌ Top Failure Patterns:`);
      Object.entries(analysis.failurePatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([pattern, count]) => {
          console.log(`  ${count}x: ${pattern.slice(0, 60)}`);
        });
    }

    if (analysis.slowestOperations.length > 0) {
      console.log(`\n⏱️  Slowest Operations:`);
      analysis.slowestOperations.forEach(op => {
        console.log(`  ${op.operation.padEnd(25)} ${op.avgTime}ms avg (max: ${op.maxTime}ms)`);
      });
    }

    if (analysis.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      analysis.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`  ${icon} [${rec.priority.toUpperCase()}] ${rec.issue}`);
        console.log(`     → ${rec.suggestion}`);
        console.log(`     → Action: ${rec.action}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
  }

  /**
   * Generate optimization script
   */
  async generateOptimizationScript() {
    const analysis = this.analyzeTrends();
    
    const script = `#!/usr/bin/env node
/**
 * Auto-Generated Optimization Script
 * Generated: ${new Date().toISOString()}
 * Based on analysis of ${analysis.totalRuns} runs
 */

const optimizations = {
  // Retry configuration based on failure patterns
  retryConfig: {
    maxRetries: ${parseFloat(analysis.successRate) < 80 ? 5 : 3},
    delay: 2000,
    backoff: 2
  },
  
  // Batch size based on average items per run
  batchConfig: {
    size: ${Math.min(Math.ceil(parseFloat(analysis.avgItemsPerRun) / 5), 10)},
    delayBetween: { min: 3000, max: 8000 }
  },
  
  // Timeout adjustments
  timeouts: {
    navigation: ${parseFloat(analysis.avgDuration) > 300 ? 45000 : 30000},
    element: 15000,
    operation: 60000
  },
  
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: ${Math.max(3, Math.ceil(10 - parseFloat(analysis.successRate) / 10))},
    resetTimeout: 300000
  }
};

module.exports = optimizations;
`;

    const outputPath = path.join(DATA_DIR, 'auto-optimization-config.js');
    await fs.writeFile(outputPath, script);
    console.log(`Optimization config saved: ${outputPath}`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const monitor = new PerformanceMonitor();

  await monitor.loadData();
  const analysis = monitor.analyzeTrends();

  if (args.includes('--report')) {
    monitor.printReport(analysis);
  }

  if (args.includes('--optimize')) {
    await monitor.generateOptimizationScript();
  }

  if (args.includes('--analyze') || args.length === 0) {
    monitor.printReport(analysis);
    
    if (analysis.recommendations.length > 0) {
      console.log('\nRun with --optimize to generate optimization config');
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PerformanceMonitor };
