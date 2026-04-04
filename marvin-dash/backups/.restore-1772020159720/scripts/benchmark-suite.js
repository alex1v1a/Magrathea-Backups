/**
 * Marvin Performance Benchmark Suite
 * Comprehensive performance testing for automation scripts
 * 
 * Usage: node benchmark-suite.js [--all] [--script=name] [--iterations=10]
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class BenchmarkSuite {
  constructor(options = {}) {
    this.iterations = options.iterations || 10;
    this.results = [];
    this.benchmarks = new Map();
  }

  register(name, fn, options = {}) {
    this.benchmarks.set(name, {
      fn,
      setup: options.setup || (async () => {}),
      teardown: options.teardown || (async () => {}),
      warmup: options.warmup || 1
    });
  }

  async run(name) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark "${name}" not found`);
    }

    console.log(`\n${COLORS.bright}Running: ${name}${COLORS.reset}`);
    console.log(`${COLORS.dim}Iterations: ${this.iterations}${COLORS.reset}\n`);

    // Warmup
    console.log('Warming up...');
    for (let i = 0; i < benchmark.warmup; i++) {
      await benchmark.setup();
      await benchmark.fn();
      await benchmark.teardown();
    }

    // Run benchmarks
    const times = [];
    const memorySnapshots = [];

    for (let i = 0; i < this.iterations; i++) {
      await benchmark.setup();
      
      const startMem = process.memoryUsage();
      const startTime = performance.now();
      
      try {
        await benchmark.fn();
      } catch (error) {
        console.log(`${COLORS.red}✗ Iteration ${i + 1} failed: ${error.message}${COLORS.reset}`);
        times.push(null);
        continue;
      }
      
      const endTime = performance.now();
      const endMem = process.memoryUsage();
      
      await benchmark.teardown();

      const duration = endTime - startTime;
      const memUsed = (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024;
      
      times.push(duration);
      memorySnapshots.push(memUsed);
      
      process.stdout.write(`Iteration ${i + 1}/${this.iterations}: ${duration.toFixed(2)}ms `);
      process.stdout.write(`(${memUsed > 0 ? '+' : ''}${memUsed.toFixed(2)}MB)\n`);
    }

    // Calculate statistics
    const validTimes = times.filter(t => t !== null);
    const stats = this.calculateStats(validTimes, memorySnapshots);
    
    this.results.push({ name, ...stats });
    
    this.printStats(name, stats);
    
    return stats;
  }

  async runAll() {
    console.log(`${COLORS.bright}═══════════════════════════════════════${COLORS.reset}`);
    console.log(`${COLORS.bright}   MARVIN PERFORMANCE BENCHMARK SUITE${COLORS.reset}`);
    console.log(`${COLORS.bright}═══════════════════════════════════════${COLORS.reset}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Node: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`CPU: ${process.env.NUMBER_OF_PROCESSORS || 'unknown'} cores`);
    console.log(`Memory: ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(0)}MB allocated`);
    
    for (const [name] of this.benchmarks) {
      await this.run(name);
    }

    this.printSummary();
    await this.exportResults();
  }

  calculateStats(times, memory) {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const memSum = memory.reduce((a, b) => a + b, 0);
    
    return {
      iterations: times.length,
      total: sum,
      average: sum / times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: this.calculateStdDev(times, sum / times.length),
      avgMemory: memSum / memory.length,
      minMemory: Math.min(...memory),
      maxMemory: Math.max(...memory)
    };
  }

  calculateStdDev(values, mean) {
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  printStats(name, stats) {
    console.log(`\n${COLORS.cyan}Results for ${name}:${COLORS.reset}`);
    console.log(`  ${COLORS.green}Average:${COLORS.reset} ${stats.average.toFixed(2)}ms`);
    console.log(`  ${COLORS.green}Median:${COLORS.reset}  ${stats.median.toFixed(2)}ms`);
    console.log(`  ${COLORS.green}P95:${COLORS.reset}     ${stats.p95.toFixed(2)}ms`);
    console.log(`  ${COLORS.green}P99:${COLORS.reset}     ${stats.p99.toFixed(2)}ms`);
    console.log(`  ${COLORS.yellow}Min:${COLORS.reset}     ${stats.min.toFixed(2)}ms`);
    console.log(`  ${COLORS.yellow}Max:${COLORS.reset}     ${stats.max.toFixed(2)}ms`);
    console.log(`  ${COLORS.yellow}StdDev:${COLORS.reset}  ${stats.stdDev.toFixed(2)}ms`);
    console.log(`  ${COLORS.blue}Memory:${COLORS.reset}  ${stats.avgMemory.toFixed(2)}MB avg`);
  }

  printSummary() {
    console.log(`\n${COLORS.bright}═══════════════════════════════════════${COLORS.reset}`);
    console.log(`${COLORS.bright}           BENCHMARK SUMMARY${COLORS.reset}`);
    console.log(`${COLORS.bright}═══════════════════════════════════════${COLORS.reset}\n`);
    
    // Sort by average time
    const sorted = [...this.results].sort((a, b) => a.average - b.average);
    
    console.log('Rankings (fastest to slowest):\n');
    sorted.forEach((result, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      console.log(`${medal} ${rank}. ${result.name}: ${result.average.toFixed(2)}ms avg`);
    });
    
    // Calculate overall performance score
    const totalTime = this.results.reduce((sum, r) => sum + r.average, 0);
    console.log(`\n${COLORS.cyan}Total benchmark time: ${totalTime.toFixed(2)}ms${COLORS.reset}`);
  }

  async exportResults() {
    const outputPath = path.join(__dirname, '..', 'data', 'benchmark-results.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: this.results
    };
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Results exported to: ${outputPath}`);
  }

  compareWithBaseline() {
    // Future: Compare with historical benchmark data
    console.log('\n📊 Comparison with baseline coming soon...');
  }
}

// Define benchmarks
function createBenchmarks(suite) {
  // JSON parsing benchmark
  suite.register('json-parsing', async () => {
    const data = JSON.stringify({ 
      test: Array(1000).fill('data'),
      nested: { deep: { value: 123 } }
    });
    for (let i = 0; i < 1000; i++) {
      JSON.parse(data);
    }
  });

  // File operations benchmark
  suite.register('file-operations', async () => {
    const testFile = path.join(__dirname, '..', 'temp', 'benchmark-test.json');
    const data = JSON.stringify({ timestamp: Date.now(), data: Array(100).fill('x') });
    
    await fs.mkdir(path.dirname(testFile), { recursive: true });
    await fs.writeFile(testFile, data);
    await fs.readFile(testFile, 'utf8');
    await fs.unlink(testFile);
  }, {
    setup: async () => {},
    teardown: async () => {}
  });

  // String manipulation benchmark
  suite.register('string-manipulation', async () => {
    let result = '';
    const lines = [];
    for (let i = 0; i < 10000; i++) {
      lines.push(`Line ${i}: ${'x'.repeat(100)}`);
    }
    result = lines.join('\n');
    result.split('\n').map(l => l.toUpperCase());
  });

  // Regex operations benchmark
  suite.register('regex-operations', async () => {
    const text = 'Email: test@example.com, Phone: 555-1234, ID: ABC-123-XYZ';
    const patterns = [
      /[\w.-]+@[\w.-]+\.\w+/g,
      /\d{3}-\d{4}/g,
      /[A-Z]{3}-\d{3}-[A-Z]{3}/g
    ];
    
    for (let i = 0; i < 1000; i++) {
      patterns.forEach(p => text.match(p));
    }
  });

  // Array operations benchmark
  suite.register('array-operations', async () => {
    const arr = Array(10000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random()
    }));
    
    arr.filter(x => x.value > 0.5);
    arr.sort((a, b) => a.value - b.value);
    arr.reduce((sum, x) => sum + x.value, 0);
    arr.map(x => ({ ...x, doubled: x.value * 2 }));
  });

  // Date operations benchmark
  suite.register('date-operations', async () => {
    const dates = [];
    for (let i = 0; i < 1000; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    
    dates.sort((a, b) => a - b);
    dates.filter(d => d.getDay() === 0);
    dates.map(d => d.toISOString());
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = {
    all: args.includes('--all'),
    iterations: 10,
    script: null
  };

  // Parse iterations
  const iterArg = args.find(a => a.startsWith('--iterations='));
  if (iterArg) {
    options.iterations = parseInt(iterArg.split('=')[1], 10);
  }

  // Parse script name
  const scriptArg = args.find(a => a.startsWith('--script='));
  if (scriptArg) {
    options.script = scriptArg.split('=')[1];
  }

  const suite = new BenchmarkSuite(options);
  createBenchmarks(suite);

  if (options.script) {
    await suite.run(options.script);
  } else {
    await suite.runAll();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

module.exports = { BenchmarkSuite };
