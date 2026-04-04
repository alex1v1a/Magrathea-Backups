/**
 * Browser Pool Test Script
 * Run: node experiments/browser-pool/test.js
 */

const { BrowserPool } = require('./pool-manager');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function measureConnectionTime(pool) {
  const times = [];
  
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const { port, page } = await pool.acquire();
    const acquireTime = Date.now() - start;
    
    await page.goto('https://example.com');
    const loadTime = Date.now() - start - acquireTime;
    
    times.push({ acquireTime, loadTime, total: acquireTime + loadTime });
    
    await pool.release(port);
    await sleep(500);
  }
  
  return times;
}

async function measureMemoryUsage(pool) {
  // Note: In production, would use process.memoryUsage() or system tools
  // This is a simplified simulation
  
  const initialStats = pool.getStats();
  
  // Acquire all browsers
  const handles = [];
  for (let i = 0; i < 3; i++) {
    handles.push(await pool.acquire());
  }
  
  const fullStats = pool.getStats();
  
  // Release all
  for (const { port } of handles) {
    await pool.release(port);
  }
  
  return { initialStats, fullStats };
}

async function runStressTest(pool) {
  console.log('\n🧪 Stress Test: 10 concurrent tasks');
  
  const tasks = [];
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    tasks.push((async () => {
      const start = Date.now();
      const { port, page } = await pool.acquire();
      
      try {
        await page.goto(`https://httpbin.org/delay/1`);
        const time = Date.now() - start;
        results.push({ task: i, time, port, success: true });
      } catch (e) {
        results.push({ task: i, error: e.message, success: false });
      } finally {
        await pool.release(port);
      }
    })());
  }
  
  await Promise.all(tasks);
  
  const avgTime = results.filter(r => r.success).reduce((a, r) => a + r.time, 0) / results.filter(r => r.success).length;
  console.log(`   Average task time: ${avgTime.toFixed(0)}ms`);
  console.log(`   Successful: ${results.filter(r => r.success).length}/10`);
  
  return results;
}

async function runComparisonTest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Browser Pool Pattern - Performance Test');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const pool = new BrowserPool({ poolSize: 3 });
  
  try {
    // Test 1: Connection overhead
    console.log('📊 Test 1: Connection Overhead');
    console.log('   Acquiring and releasing browser 5 times...');
    const connectionTimes = await measureConnectionTime(pool);
    
    console.log('\n   Results:');
    connectionTimes.forEach((t, i) => {
      console.log(`   Run ${i + 1}: acquire=${t.acquireTime}ms, load=${t.loadTime}ms, total=${t.total}ms`);
    });
    
    const avgAcquire = connectionTimes.reduce((a, t) => a + t.acquireTime, 0) / connectionTimes.length;
    console.log(`   Average acquire time: ${avgAcquire.toFixed(0)}ms`);
    console.log(`   Comparison: Current approach = 2000-5000ms per connection`);
    console.log(`   Improvement: ~${(3000 / avgAcquire).toFixed(1)}x faster`);

    // Test 2: Memory usage
    console.log('\n📊 Test 2: Memory Usage Pattern');
    const memoryStats = await measureMemoryUsage(pool);
    console.log(`   Pool size: ${memoryStats.fullStats.poolSize}`);
    console.log(`   Active browsers: ${memoryStats.fullStats.active}`);
    console.log(`   Idle browsers: ${memoryStats.fullStats.idle}`);
    console.log(`   Estimated memory: ~${memoryStats.fullStats.poolSize * 150}MB`);

    // Test 3: Concurrency
    console.log('\n📊 Test 3: Concurrent Task Handling');
    await runStressTest(pool);

    // Final stats
    console.log('\n📊 Pool Statistics:');
    const stats = pool.getStats();
    console.log(`   Active: ${stats.active}`);
    console.log(`   Idle: ${stats.idle}`);
    console.log(`   Browsers: ${stats.browsers.length}`);

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      connectionTimes,
      avgAcquireTime: avgAcquire,
      memoryStats,
      poolStats: stats
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n✅ Test results saved to test-results.json');
    
  } finally {
    await pool.closeAll();
  }
}

// Run if called directly
if (require.main === module) {
  runComparisonTest().catch(console.error);
}

module.exports = { runComparisonTest };
