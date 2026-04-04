#!/usr/bin/env node
/**
 * Performance Benchmark for Kanban Sync
 * 
 * Compares performance between:
 * - Original kanban-sync.js
 * - Optimized kanban-sync-optimized.js
 * - New high-performance version
 * 
 * Metrics:
 * - Execution time
 * - Memory usage
 * - File I/O operations
 * - Cache hit rate
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

const SCRIPTS = {
  original: path.join(__dirname, 'kanban-sync.js.bak'),
  optimized: path.join(__dirname, 'kanban-sync-optimized.js'),
  highPerf: path.join(__dirname, 'kanban-sync-optimized.js') // Our new version
};

const ITERATIONS = 3;

async function benchmarkScript(name, scriptPath) {
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log('─'.repeat(50));
  
  const times = [];
  const memoryBefore = process.memoryUsage();
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    
    try {
      // Run script as module
      const script = require(scriptPath);
      await script.sync();
      
      const duration = performance.now() - start;
      times.push(duration);
      console.log(`  Run ${i + 1}: ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.log(`  Run ${i + 1}: FAILED - ${error.message}`);
    }
    
    // Clear require cache for fresh run
    delete require.cache[require.resolve(scriptPath)];
  }
  
  const memoryAfter = process.memoryUsage();
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return {
    name,
    avg: avg.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    memoryDelta: (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024
  };
}

async function benchmarkFileOperations() {
  console.log('\n📁 File Operation Benchmarks');
  console.log('─'.repeat(50));
  
  const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');
  
  // Test full read
  const readStart = performance.now();
  for (let i = 0; i < 10; i++) {
    await fs.readFile(TASKS_FILE, 'utf8');
  }
  const readTime = (performance.now() - readStart) / 10;
  console.log(`  Full file read: ${readTime.toFixed(2)}ms`);
  
  // Test stat only (for incremental)
  const statStart = performance.now();
  for (let i = 0; i < 100; i++) {
    await fs.stat(TASKS_FILE);
  }
  const statTime = (performance.now() - statStart) / 100;
  console.log(`  Stat check (for incremental): ${statTime.toFixed(2)}ms`);
  
  console.log(`  \n  💡 Incremental check is ~${(readTime / statTime).toFixed(0)}x faster when file unchanged`);
  
  return { fullRead: readTime, statCheck: statTime };
}

async function measureLogSizes() {
  console.log('\n📋 Current File Sizes');
  console.log('─'.repeat(50));
  
  const files = [
    'data/recovery.log',
    'data/task-log.md',
    'data/tasks.json',
    'data/model-usage.json',
    'data/expenses.json'
  ];
  
  let totalSize = 0;
  
  for (const file of files) {
    try {
      const filePath = path.join(__dirname, '..', file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
      console.log(`  ${file.padEnd(30)} ${formatBytes(stats.size).padStart(10)}`);
    } catch {
      console.log(`  ${file.padEnd(30)} Not found`);
    }
  }
  
  console.log(`  ${'─'.repeat(40)}`);
  console.log(`  ${'TOTAL'.padEnd(30)} ${formatBytes(totalSize).padStart(10)}`);
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function printComparison(results) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('           PERFORMANCE COMPARISON');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('Script               | Avg (ms) | Min (ms) | Max (ms) | Memory (MB)');
  console.log('─────────────────────┼──────────┼──────────┼──────────┼────────────');
  
  for (const r of results) {
    console.log(
      `${r.name.padEnd(20)} | ${r.avg.padStart(8)} | ${r.min.padStart(8)} | ${r.max.padStart(8)} | ${r.memoryDelta.toFixed(2)}`
    );
  }
  
  if (results.length >= 2) {
    const original = parseFloat(results[0].avg);
    const optimized = parseFloat(results[results.length - 1].avg);
    const improvement = ((original - optimized) / original * 100).toFixed(1);
    
    console.log('\n📈 Improvement: ' + improvement + '% faster');
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

async function runBenchmark() {
  console.log('\n🚀 Kanban Sync Performance Benchmark');
  console.log('=====================================\n');
  
  // Measure current file sizes
  const totalSize = await measureLogSizes();
  
  // Benchmark file operations
  const fileBench = await benchmarkFileOperations();
  
  // Benchmark scripts (only the optimized one for now)
  const results = [];
  
  try {
    const result = await benchmarkScript('Optimized', SCRIPTS.optimized);
    results.push(result);
  } catch (error) {
    console.log('Could not benchmark optimized script:', error.message);
  }
  
  printComparison(results);
  
  // Recommendations
  console.log('💡 Recommendations:\n');
  
  if (totalSize > 5 * 1024 * 1024) {
    console.log('  ⚠️  Total data size exceeds 5MB - consider running state-optimizer.js');
  }
  
  if (fileBench.fullRead > 5) {
    console.log('  ⚠️  File reads are slow - incremental sync will provide significant benefit');
  }
  
  console.log('  ✅ Enable file watching for event-driven updates (eliminates polling)');
  console.log('  ✅ Use checksum-based incremental sync to skip unchanged files');
  console.log('  ✅ Run state-optimizer.js weekly to rotate logs and compress old data');
  console.log('');
}

// Run if called directly
if (require.main === module) {
  runBenchmark().catch(console.error);
}

module.exports = { runBenchmark, benchmarkFileOperations };
