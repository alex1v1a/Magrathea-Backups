/**
 * Marvin Performance Benchmark Suite
 * 
 * Automated performance testing and regression detection
 * for all automation scripts
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = path.join(__dirname, '..', '..');
const BENCHMARK_DIR = path.join(WORKSPACE, 'benchmarks');
const RESULTS_FILE = path.join(BENCHMARK_DIR, 'results.json');

// ============================================================================
// BENCHMARK DEFINITIONS
// ============================================================================

const BENCHMARKS = [
  {
    name: 'HEB Cart - Single Item',
    script: 'dinner-automation/scripts/heb-add-cart-optimized.js',
    type: 'timing',
    iterations: 3,
    timeout: 120000,
    measure: 'per-item',
  },
  {
    name: 'Email System - Parse Reply',
    script: 'dinner-automation/scripts/email-reply-parser.js',
    type: 'timing',
    iterations: 10,
    timeout: 30000,
    setup: async () => {
      // Create test email
      return { testInput: 'Swap Monday to Chicken Alfredo and remove Wednesday' };
    },
  },
  {
    name: 'Dashboard Kanban Sync',
    script: 'marvin-dash/scripts/kanban-sync.js',
    type: 'timing',
    iterations: 5,
    timeout: 60000,
  },
  {
    name: 'Browser Pool Initialization',
    script: 'lib/automation-core.js',
    type: 'memory',
    iterations: 5,
    test: async (AutomationCore) => {
      const start = Date.now();
      const pool = new AutomationCore.BrowserPool();
      await pool.init({ poolSize: 2 });
      const initTime = Date.now() - start;
      
      const memBefore = process.memoryUsage();
      const pages = [];
      for (let i = 0; i < 5; i++) {
        pages.push(await pool.acquire());
      }
      const memAfter = process.memoryUsage();
      
      await pool.close();
      
      return {
        initTime,
        memoryDelta: memAfter.heapUsed - memBefore.heapUsed,
        pagesCreated: pages.length,
      };
    },
  },
  {
    name: 'Anti-Bot Evasion',
    script: 'lib/automation-core.js',
    type: 'correctness',
    test: async (AutomationCore) => {
      const delays = [];
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await AutomationCore.randomDelay(100, 200);
        delays.push(Date.now() - start);
      }
      
      const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
      const variance = delays.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / delays.length;
      
      return {
        averageDelay: avg,
        variance: Math.sqrt(variance),
        minDelay: Math.min(...delays),
        maxDelay: Math.max(...delays),
        withinRange: avg >= 100 && avg <= 200,
      };
    },
  },
];

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

class BenchmarkRunner {
  constructor() {
    this.results = [];
    this.baseline = null;
  }

  async loadBaseline() {
    try {
      const data = await fs.readFile(RESULTS_FILE, 'utf8');
      const all = JSON.parse(data);
      this.baseline = all[all.length - 1];
    } catch (e) {
      this.baseline = null;
    }
  }

  async runBenchmark(benchmark) {
    console.log(`\n🔬 Running: ${benchmark.name}`);
    console.log('=' .repeat(50));

    const iterations = [];
    let errors = 0;

    for (let i = 0; i < benchmark.iterations; i++) {
      process.stdout.write(`  Iteration ${i + 1}/${benchmark.iterations}... `);
      
      try {
        const start = Date.now();
        let result;

        if (benchmark.test) {
          // Custom test function
          const AutomationCore = require(path.join(WORKSPACE, benchmark.script));
          result = await benchmark.test(AutomationCore);
        } else {
          // Script execution
          const output = execSync(`node ${path.join(WORKSPACE, benchmark.script)} --benchmark`, {
            encoding: 'utf8',
            timeout: benchmark.timeout,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          result = JSON.parse(output);
        }

        const duration = Date.now() - start;
        iterations.push({ duration, result });
        process.stdout.write(`✅ ${duration}ms\n`);

      } catch (e) {
        errors++;
        process.stdout.write(`❌ ${e.message}\n`);
        iterations.push({ error: e.message });
      }
    }

    const successful = iterations.filter(i => !i.error);
    const summary = {
      name: benchmark.name,
      type: benchmark.type,
      iterations: benchmark.iterations,
      successful: successful.length,
      failed: errors,
      
      timing: successful.length > 0 ? {
        avg: Math.round(successful.reduce((a, i) => a + i.duration, 0) / successful.length),
        min: Math.min(...successful.map(i => i.duration)),
        max: Math.max(...successful.map(i => i.duration)),
        p95: this._percentile(successful.map(i => i.duration), 0.95),
      } : null,
      
      details: iterations,
      timestamp: new Date().toISOString(),
    };

    this.results.push(summary);
    return summary;
  }

  _percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  compareToBaseline(current) {
    if (!this.baseline) return { status: 'no-baseline', change: null };

    const baselineResult = this.baseline.results.find(r => r.name === current.name);
    if (!baselineResult || !baselineResult.timing || !current.timing) {
      return { status: 'incomparable', change: null };
    }

    const change = ((current.timing.avg - baselineResult.timing.avg) / baselineResult.timing.avg * 100);
    
    return {
      status: change > 10 ? 'regression' : change < -10 ? 'improvement' : 'stable',
      change: change.toFixed(1),
      baseline: baselineResult.timing.avg,
      current: current.timing.avg,
    };
  }

  async saveResults() {
    await fs.mkdir(BENCHMARK_DIR, { recursive: true });
    
    let allResults = [];
    try {
      const existing = await fs.readFile(RESULTS_FILE, 'utf8');
      allResults = JSON.parse(existing);
    } catch (e) {}

    allResults.push({
      timestamp: new Date().toISOString(),
      results: this.results,
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
        memory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB',
      },
    });

    // Keep only last 20 runs
    if (allResults.length > 20) {
      allResults = allResults.slice(-20);
    }

    await fs.writeFile(RESULTS_FILE, JSON.stringify(allResults, null, 2));
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 BENCHMARK REPORT');
    console.log('='.repeat(70));

    for (const result of this.results) {
      console.log(`\n${result.name}`);
      console.log('-'.repeat(50));
      
      if (result.failed > 0) {
        console.log(`  ⚠️  ${result.failed}/${result.iterations} iterations failed`);
      }

      if (result.timing) {
        const comparison = this.compareToBaseline(result);
        const changeIcon = comparison.status === 'regression' ? '🔴' : 
                          comparison.status === 'improvement' ? '🟢' : '⚪';
        
        console.log(`  ⏱️  Average: ${result.timing.avg}ms`);
        console.log(`  📈 Range: ${result.timing.min}-${result.timing.max}ms`);
        console.log(`  📊 P95: ${result.timing.p95}ms`);
        
        if (comparison.change) {
          console.log(`  ${changeIcon} Change: ${comparison.change}% vs baseline`);
        }
      }
    }

    const totalTests = this.results.reduce((a, r) => a + r.iterations, 0);
    const totalPassed = this.results.reduce((a, r) => a + r.successful, 0);
    
    console.log('\n' + '='.repeat(70));
    console.log(`Overall: ${totalPassed}/${totalTests} tests passed`);
    console.log('='.repeat(70));
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const runner = new BenchmarkRunner();
  await runner.loadBaseline();

  console.log('🏁 Marvin Performance Benchmark Suite');
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`🎯 ${BENCHMARKS.length} benchmarks to run\n`);

  for (const benchmark of BENCHMARKS) {
    await runner.runBenchmark(benchmark);
  }

  runner.generateReport();
  await runner.saveResults();

  // Exit with error code if any benchmarks failed significantly
  const failures = runner.results.filter(r => r.failed > r.iterations / 2);
  process.exit(failures.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(e => {
    console.error('Benchmark failed:', e);
    process.exit(1);
  });
}

module.exports = { BenchmarkRunner, BENCHMARKS };
