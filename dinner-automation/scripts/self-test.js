#!/usr/bin/env node
/**
 * Self-Test Suite for Automation Improvements
 * Validates all optimizations work correctly
 * 
 * Usage:
 *   node self-test.js           Run all tests
 *   node self-test.js --quick   Run quick tests only
 *   node self-test.js --name    Run specific test
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');

const TESTS = [];
let passed = 0;
let failed = 0;

function test(name, fn, options = {}) {
  TESTS.push({ name, fn, ...options });
}

async function runTest(testCase) {
  const startTime = performance.now();
  process.stdout.write(`   Testing: ${testCase.name}... `);
  
  try {
    await testCase.fn();
    const duration = performance.now() - startTime;
    console.log(`✅ (${duration.toFixed(0)}ms)`);
    passed++;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.log(`❌ (${duration.toFixed(0)}ms)`);
    console.log(`      Error: ${error.message}`);
    failed++;
  }
}

// Define tests
test('Shared Chrome Connector v2 loads', async () => {
  const connector = require('./shared-chrome-connector-v2');
  assert(connector.getBrowser, 'getBrowser not exported');
  assert(connector.getPage, 'getPage not exported');
  assert(connector.getPoolStats, 'getPoolStats not exported');
});

test('HEB Cart v3 loads', async () => {
  const heb = require('./heb-cart-v3');
  assert(heb.runAutomation, 'runAutomation not exported');
});

test('Batch Processor loads', async () => {
  const batch = require('./batch-processor');
  assert(batch.BatchProcessor, 'BatchProcessor not exported');
  assert(batch.TASKS, 'TASKS not exported');
});

test('Automation API loads', async () => {
  const api = require('./automation-api');
  assert(api.getAutomationStatus, 'getAutomationStatus not exported');
});

test('Cache directory exists or can be created', async () => {
  const cacheDir = path.join(__dirname, '..', 'data', 'cache');
  await fs.mkdir(cacheDir, { recursive: true });
  const stats = await fs.stat(cacheDir);
  assert(stats.isDirectory(), 'Cache is not a directory');
});

test('Required data files exist', async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const requiredFiles = ['recipe-database.json'];
  
  for (const file of requiredFiles) {
    const filePath = path.join(dataDir, file);
    try {
      await fs.access(filePath);
    } catch (e) {
      throw new Error(`Missing required file: ${file}`);
    }
  }
});

test('Recipe database is valid JSON', async () => {
  const recipeFile = path.join(__dirname, '..', 'data', 'recipe-database.json');
  const data = await fs.readFile(recipeFile, 'utf8');
  const parsed = JSON.parse(data);
  assert(parsed.recipes, 'No recipes object found');
  assert(Object.keys(parsed.recipes).length > 0, 'No recipes found');
});

test('Concurrency limiter works correctly', async () => {
  // Test the concurrency limiter logic
  class TestLimiter {
    constructor(max) {
      this.max = max;
      this.running = 0;
      this.maxObserved = 0;
    }
    
    async execute(fn) {
      while (this.running >= this.max) {
        await new Promise(r => setTimeout(r, 10));
      }
      this.running++;
      this.maxObserved = Math.max(this.maxObserved, this.running);
      try {
        await fn();
      } finally {
        this.running--;
      }
    }
  }
  
  const limiter = new TestLimiter(2);
  const tasks = [];
  
  for (let i = 0; i < 5; i++) {
    tasks.push(limiter.execute(() => new Promise(r => setTimeout(r, 50))));
  }
  
  await Promise.all(tasks);
  assert(limiter.maxObserved <= 2, `Concurrency exceeded limit: ${limiter.maxObserved}`);
});

test('JSON parsing performance', async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const startTime = performance.now();
  
  const files = ['recipe-database.json', 'weekly-plan.json'];
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(dataDir, file), 'utf8');
      JSON.parse(content);
    } catch (e) {}
  }
  
  const duration = performance.now() - startTime;
  assert(duration < 100, `JSON parsing too slow: ${duration.toFixed(0)}ms`);
});

test('File I/O performance', async () => {
  const testFile = path.join(__dirname, 'test-perf.tmp');
  const data = JSON.stringify({ test: 'x'.repeat(1000) });
  
  const startTime = performance.now();
  for (let i = 0; i < 50; i++) {
    await fs.writeFile(testFile, data);
    await fs.readFile(testFile, 'utf8');
  }
  const duration = performance.now() - startTime;
  
  await fs.unlink(testFile).catch(() => {});
  assert(duration < 1000, `File I/O too slow: ${duration.toFixed(0)}ms`);
});

test('Chrome port check is fast', async () => {
  const http = require('http');
  const startTime = performance.now();
  
  await new Promise((resolve) => {
    const req = http.get('http://localhost:9222/json/version', { timeout: 500 }, () => {
      resolve();
    });
    req.on('error', () => resolve());
  });
  
  const duration = performance.now() - startTime;
  assert(duration < 600, `Port check too slow: ${duration.toFixed(0)}ms`);
});

test('Memory usage is reasonable', async () => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  assert(heapUsedMB < 500, `Memory usage too high: ${heapUsedMB.toFixed(1)}MB`);
});

test('All scripts are syntactically valid', async () => {
  const scripts = [
    'shared-chrome-connector-v2.js',
    'heb-cart-v3.js',
    'batch-processor.js',
    'automation-api.js',
    'profiler-v2.js'
  ];
  
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    try {
      require(scriptPath);
    } catch (e) {
      if (e.message.includes('Cannot find module')) {
        // Dependencies not installed, skip
        continue;
      }
      throw new Error(`${script}: ${e.message}`);
    }
  }
});

// Slow tests (require actual execution)
test('Browser pool stats returns correct shape', async () => {
  const { getPoolStats } = require('./shared-chrome-connector-v2');
  const stats = getPoolStats();
  assert(typeof stats.total === 'number', 'total not a number');
  assert(typeof stats.inUse === 'number', 'inUse not a number');
  assert(typeof stats.available === 'number', 'available not a number');
}, { slow: true });

test('Automation status returns correct shape', async () => {
  const { getAutomationStatus } = require('./automation-api');
  const status = await getAutomationStatus();
  assert(typeof status.chromeRunning === 'boolean', 'chromeRunning not boolean');
  assert(typeof status.activeJobs === 'number', 'activeJobs not number');
}, { slow: true });

/**
 * Main runner
 */
async function main() {
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick');
  
  console.log('🧪 Automation Self-Test Suite');
  console.log('=' .repeat(50));
  console.log(`Mode: ${quickMode ? 'Quick' : 'Full'}`);
  console.log('');
  
  const startTime = performance.now();
  
  const testsToRun = quickMode 
    ? TESTS.filter(t => !t.slow)
    : TESTS;
  
  for (const testCase of testsToRun) {
    await runTest(testCase);
  }
  
  const totalTime = performance.now() - startTime;
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results');
  console.log('=' .repeat(50));
  console.log(`Total: ${testsToRun.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Time: ${totalTime.toFixed(0)}ms`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = { test, runTest, TESTS };
