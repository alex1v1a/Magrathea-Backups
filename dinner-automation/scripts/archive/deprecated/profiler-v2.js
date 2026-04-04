#!/usr/bin/env node
/**
 * Performance Profiler for Dinner Automation
 * Measures execution times, memory usage, and bottlenecks
 * 
 * Usage:
 *   node profiler.js --script heb-cart-shared.js
 *   node profiler.js --script sync-dinner-to-icloud.js
 *   node profiler.js --all
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { performance } = require('perf_hooks');

const RESULTS_FILE = path.join(__dirname, '..', 'data', 'performance-results.json');

class PerformanceProfiler {
  constructor() {
    this.results = [];
  }

  /**
   * Profile a single script execution
   */
  async profileScript(scriptPath, iterations = 3) {
    const scriptName = path.basename(scriptPath);
    console.log(`\n🔍 Profiling: ${scriptName}`);
    console.log('=' .repeat(50));

    const times = [];
    const memorySnapshots = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      try {
        // Use --dry-run flag if available to avoid side effects
        execSync(`node "${scriptPath}" --dry-run 2>&1 || true`, {
          cwd: __dirname,
          timeout: 60000,
          stdio: 'pipe'
        });
      } catch (e) {
        // Expected for scripts without dry-run
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      times.push(duration);

      const endMemory = process.memoryUsage();
      memorySnapshots.push({
        rss: (endMemory.rss - startMemory.rss) / 1024 / 1024, // MB
        heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024 // MB
      });

      process.stdout.write(`   Iteration ${i + 1}: ${duration.toFixed(0)}ms\r`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const avgMemory = memorySnapshots.reduce((a, b) => a + b.heapUsed, 0) / memorySnapshots.length;

    const result = {
      script: scriptName,
      avgTimeMs: Math.round(avgTime),
      minTimeMs: Math.round(minTime),
      maxTimeMs: Math.round(maxTime),
      avgMemoryMB: Math.round(avgMemory * 100) / 100,
      iterations,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);

    console.log(`\n   ✅ Average: ${avgTime.toFixed(0)}ms (${avgMemory.toFixed(1)}MB)`);
    console.log(`   📊 Range: ${minTime.toFixed(0)}ms - ${maxTime.toFixed(0)}ms`);

    return result;
  }

  /**
   * Profile specific automation components
   */
  async profileComponents() {
    const components = [
      { name: 'Chrome Connector Init', fn: () => this.profileChromeConnector() },
      { name: 'File I/O Operations', fn: () => this.profileFileIO() },
      { name: 'JSON Parsing', fn: () => this.profileJsonParsing() },
      { name: 'Memory Leak Check', fn: () => this.profileMemoryLeaks() }
    ];

    console.log('\n📦 Component Profiling');
    console.log('=' .repeat(50));

    for (const component of components) {
      const start = performance.now();
      await component.fn();
      const duration = performance.now() - start;
      console.log(`   ${component.name}: ${duration.toFixed(0)}ms`);
    }
  }

  async profileChromeConnector() {
    // Simulate connection overhead
    const { chromium } = require('playwright');
    const start = performance.now();
    
    // Check if browser is already running (fast path)
    const http = require('http');
    await new Promise((resolve) => {
      const req = http.get('http://localhost:9222/json/version', { timeout: 500 }, () => resolve());
      req.on('error', () => resolve());
    });

    return performance.now() - start;
  }

  async profileFileIO() {
    const testFile = path.join(__dirname, 'test-io.tmp');
    const data = JSON.stringify({ test: 'x'.repeat(10000) });

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      fs.writeFileSync(testFile, data);
      fs.readFileSync(testFile, 'utf8');
    }
    const duration = performance.now() - start;
    
    fs.unlinkSync(testFile);
    return duration;
  }

  async profileJsonParsing() {
    const dataDir = path.join(__dirname, '..', 'data');
    const files = ['recipe-database.json', 'weekly-plan.json', 'youtube-cache.json'];
    
    const start = performance.now();
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
        JSON.parse(content);
      } catch (e) {}
    }
    return performance.now() - start;
  }

  async profileMemoryLeaks() {
    // Check for potential memory leaks in long-running scripts
    const initialMemory = process.memoryUsage();
    
    // Simulate repeated operations
    const cache = [];
    for (let i = 0; i < 1000; i++) {
      cache.push({ id: i, data: 'x'.repeat(100) });
    }
    
    // Clear and check
    cache.length = 0;
    global.gc && global.gc();
    
    const finalMemory = process.memoryUsage();
    return finalMemory.heapUsed - initialMemory.heapUsed;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    console.log('\n💡 Optimization Recommendations');
    console.log('=' .repeat(50));

    const recommendations = [];

    // Check for slow scripts
    const slowScripts = this.results.filter(r => r.avgTimeMs > 10000);
    if (slowScripts.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Slow script execution',
        scripts: slowScripts.map(s => s.script),
        suggestion: 'Consider caching, parallelization, or async/await optimization'
      });
    }

    // Check memory usage
    const highMemory = this.results.filter(r => r.avgMemoryMB > 50);
    if (highMemory.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'High memory usage',
        scripts: highMemory.map(s => s.script),
        suggestion: 'Implement streaming for large files, clear unused variables'
      });
    }

    // General recommendations
    recommendations.push(
      {
        priority: 'HIGH',
        issue: 'Chrome Connection Overhead',
        suggestion: 'Keep Chrome running 24/7 via Task Scheduler. Use connection pooling.'
      },
      {
        priority: 'MEDIUM', 
        issue: 'File I/O Bottlenecks',
        suggestion: 'Batch file operations, use memory-mapped files for large JSON'
      },
      {
        priority: 'LOW',
        issue: 'JSON Parsing',
        suggestion: 'Consider MessagePack or protobuf for better performance'
      }
    );

    recommendations.forEach((rec, i) => {
      console.log(`\n${i + 1}. [${rec.priority}] ${rec.issue}`);
      if (rec.scripts) {
        console.log(`   Affected: ${rec.scripts.join(', ')}`);
      }
      console.log(`   💭 ${rec.suggestion}`);
    });

    return recommendations;
  }

  /**
   * Save results to file
   */
  saveResults() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalScripts: this.results.length,
        avgTime: this.results.reduce((a, r) => a + r.avgTimeMs, 0) / this.results.length,
        slowest: this.results.reduce((a, b) => a.avgTimeMs > b.avgTimeMs ? a : b, this.results[0]),
        fastest: this.results.reduce((a, b) => a.avgTimeMs < b.avgTimeMs ? a : b, this.results[0])
      }
    };

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📝 Results saved to: ${RESULTS_FILE}`);
    return report;
  }

  /**
   * Run full profiling suite
   */
  async runFullProfile() {
    console.log('🚀 Starting Performance Profiling Suite');
    console.log(new Date().toLocaleString());
    console.log('=' .repeat(50));

    // Profile key scripts
    const scriptsToProfile = [
      'shared-chrome-connector.js',
      'sync-dinner-to-icloud.js',
      'dinner-email-system.js'
    ];

    for (const script of scriptsToProfile) {
      const scriptPath = path.join(__dirname, script);
      if (fs.existsSync(scriptPath)) {
        await this.profileScript(scriptPath, 3);
      }
    }

    // Profile components
    await this.profileComponents();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Save results
    const report = this.saveResults();

    console.log('\n📊 Summary');
    console.log('=' .repeat(50));
    console.log(`Total scripts profiled: ${report.summary.totalScripts}`);
    console.log(`Average execution time: ${Math.round(report.summary.avgTime)}ms`);
    if (report.summary.slowest) {
      console.log(`Slowest script: ${report.summary.slowest.script} (${report.summary.slowest.avgTimeMs}ms)`);
    }

    return report;
  }
}

// CLI
if (require.main === module) {
  const profiler = new PerformanceProfiler();
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    profiler.runFullProfile().catch(console.error);
  } else if (args.includes('--script')) {
    const scriptIndex = args.indexOf('--script') + 1;
    if (args[scriptIndex]) {
      profiler.profileScript(args[scriptIndex]).catch(console.error);
    }
  } else {
    profiler.runFullProfile().catch(console.error);
  }
}

module.exports = PerformanceProfiler;
