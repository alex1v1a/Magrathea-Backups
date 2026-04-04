/**
 * Load Testing - HEB Search Simulation
 * Simulates 50 rapid HEB searches to test rate limiting and memory growth
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  totalSearches: 50,
  delayBetweenMs: 2000, // 2 seconds between requests
  maxMemoryMB: 500,     // Alert if memory exceeds this
  hebBaseUrl: 'https://www.heb.com',
  searchTerms: [
    'milk', 'eggs', 'bread', 'chicken', 'rice', 'pasta', 'tomatoes',
    'onions', 'garlic', 'butter', 'cheese', 'yogurt', 'apples', 'bananas',
    'carrots', 'potatoes', 'lettuce', 'spinach', 'beef', 'pork'
  ]
};

// Metrics storage
const metrics = {
  startTime: null,
  endTime: null,
  searches: [],
  memorySnapshots: [],
  errors: [],
  warnings: []
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    timestamp: Date.now(),
    rss: Math.round(usage.rss / 1024 / 1024),      // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),  // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024)    // MB
  };
}

async function recordMemory(label) {
  const mem = getMemoryUsage();
  metrics.memorySnapshots.push({ label, ...mem });
  
  if (mem.heapUsed > CONFIG.maxMemoryMB) {
    const warning = `⚠️ Memory usage high at ${label}: ${mem.heapUsed}MB heap`;
    console.warn(warning);
    metrics.warnings.push(warning);
  }
  
  return mem;
}

async function performSearch(page, searchTerm, index) {
  const startTime = Date.now();
  
  try {
    // Navigate to search page
    const searchUrl = `${CONFIG.hebBaseUrl}/search/?q=${encodeURIComponent(searchTerm)}`;
    
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for results to load
    await page.waitForTimeout(1500);
    
    // Check for rate limiting indicators
    const pageContent = await page.content();
    const isRateLimited = pageContent.includes('rate limit') || 
                         pageContent.includes('too many requests') ||
                         pageContent.includes('please wait') ||
                         pageContent.includes('captcha');
    
    const loadTime = Date.now() - startTime;
    
    // Record results
    const searchResult = {
      index: index + 1,
      term: searchTerm,
      success: !isRateLimited,
      loadTimeMs: loadTime,
      rateLimited: isRateLimited,
      timestamp: new Date().toISOString()
    };
    
    metrics.searches.push(searchResult);
    
    const status = isRateLimited ? '❌ RATE LIMITED' : '✓';
    console.log(`  Search ${index + 1}/${CONFIG.totalSearches}: "${searchTerm}" - ${loadTime}ms ${status}`);
    
    return searchResult;
    
  } catch (error) {
    const errorResult = {
      index: index + 1,
      term: searchTerm,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    metrics.searches.push(errorResult);
    metrics.errors.push(errorResult);
    
    console.error(`  Search ${index + 1}/${CONFIG.totalSearches}: "${searchTerm}" - ERROR: ${error.message}`);
    
    return errorResult;
  }
}

function calculateStats() {
  const successful = metrics.searches.filter(s => s.success);
  const failed = metrics.searches.filter(s => !s.success);
  const loadTimes = successful.map(s => s.loadTimeMs);
  
  const mean = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
  const sorted = [...loadTimes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Standard deviation
  const variance = loadTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / loadTimes.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    total: metrics.searches.length,
    successful: successful.length,
    failed: failed.length,
    successRate: (successful.length / metrics.searches.length * 100).toFixed(1),
    meanLoadTime: Math.round(mean),
    medianLoadTime: median,
    stdDev: Math.round(stdDev),
    minLoadTime: Math.min(...loadTimes),
    maxLoadTime: Math.max(...loadTimes)
  };
}

function analyzeMemoryGrowth() {
  if (metrics.memorySnapshots.length < 2) return null;
  
  const first = metrics.memorySnapshots[0];
  const last = metrics.memorySnapshots[metrics.memorySnapshots.length - 1];
  
  const growth = {
    startHeapMB: first.heapUsed,
    endHeapMB: last.heapUsed,
    growthMB: last.heapUsed - first.heapUsed,
    growthPercent: ((last.heapUsed - first.heapUsed) / first.heapUsed * 100).toFixed(1),
    peakHeapMB: Math.max(...metrics.memorySnapshots.map(m => m.heapUsed)),
    leakDetected: (last.heapUsed - first.heapUsed) > (first.heapUsed * 0.5) // >50% growth suggests leak
  };
  
  return growth;
}

function findBreakingPoints() {
  const breakingPoints = [];
  
  // Find first rate limit
  const firstRateLimit = metrics.searches.find(s => s.rateLimited);
  if (firstRateLimit) {
    breakingPoints.push({
      type: 'rate_limit',
      searchNumber: firstRateLimit.index,
      description: `Rate limiting detected at search #${firstRateLimit.index}`
    });
  }
  
  // Find first error
  const firstError = metrics.errors[0];
  if (firstError) {
    breakingPoints.push({
      type: 'error',
      searchNumber: firstError.index,
      description: `First error at search #${firstError.index}: ${firstError.error}`
    });
  }
  
  // Find memory spike
  const memoryGrowth = analyzeMemoryGrowth();
  if (memoryGrowth && memoryGrowth.leakDetected) {
    breakingPoints.push({
      type: 'memory',
      description: `Memory growth exceeded threshold: ${memoryGrowth.growthMB}MB (${memoryGrowth.growthPercent}%)`
    });
  }
  
  // Find slowdown threshold (3x median load time)
  const stats = calculateStats();
  const slowdownThreshold = stats.medianLoadTime * 3;
  const firstSlowdown = metrics.searches.find(s => s.loadTimeMs > slowdownThreshold);
  if (firstSlowdown) {
    breakingPoints.push({
      type: 'slowdown',
      searchNumber: firstSlowdown.index,
      description: `Significant slowdown at search #${firstSlowdown.index}: ${firstSlowdown.loadTimeMs}ms (threshold: ${slowdownThreshold}ms)`
    });
  }
  
  return breakingPoints;
}

async function runLoadTest() {
  console.log('🚀 Starting HEB Load Test');
  console.log(`   Target: ${CONFIG.totalSearches} searches`);
  console.log(`   Delay: ${CONFIG.delayBetweenMs}ms between requests`);
  console.log('');
  
  metrics.startTime = Date.now();
  
  // Record initial memory
  await recordMemory('start');
  
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // Perform searches
    for (let i = 0; i < CONFIG.totalSearches; i++) {
      const searchTerm = CONFIG.searchTerms[i % CONFIG.searchTerms.length];
      
      await performSearch(page, searchTerm, i);
      
      // Record memory every 10 searches
      if ((i + 1) % 10 === 0) {
        await recordMemory(`after_${i + 1}_searches`);
      }
      
      // Delay between searches
      if (i < CONFIG.totalSearches - 1) {
        await sleep(CONFIG.delayBetweenMs);
      }
      
      // Check for rate limiting - back off if detected
      const lastSearch = metrics.searches[metrics.searches.length - 1];
      if (lastSearch.rateLimited) {
        console.log('  ⏸️ Rate limit detected, backing off for 10 seconds...');
        await sleep(10000);
      }
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Browser error:', error.message);
    metrics.errors.push({ type: 'browser', error: error.message });
    if (browser) await browser.close();
  }
  
  // Record final memory
  await recordMemory('end');
  metrics.endTime = Date.now();
  
  // Generate report
  generateReport();
}

function generateReport() {
  const stats = calculateStats();
  const memoryAnalysis = analyzeMemoryGrowth();
  const breakingPoints = findBreakingPoints();
  const duration = metrics.endTime - metrics.startTime;
  
  console.log('\n📊 Load Test Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Searches: ${stats.total} total, ${stats.successful} successful, ${stats.failed} failed`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log('');
  console.log('Load Times:');
  console.log(`  Mean:   ${stats.meanLoadTime}ms`);
  console.log(`  Median: ${stats.medianLoadTime}ms`);
  console.log(`  StdDev: ${stats.stdDev}ms`);
  console.log(`  Range:  ${stats.minLoadTime}ms - ${stats.maxLoadTime}ms`);
  console.log('');
  
  if (memoryAnalysis) {
    console.log('Memory Analysis:');
    console.log(`  Start: ${memoryAnalysis.startHeapMB}MB`);
    console.log(`  End:   ${memoryAnalysis.endHeapMB}MB`);
    console.log(`  Peak:  ${memoryAnalysis.peakHeapMB}MB`);
    console.log(`  Growth: ${memoryAnalysis.growthMB}MB (${memoryAnalysis.growthPercent}%)`);
    console.log(`  Leak Detected: ${memoryAnalysis.leakDetected ? 'YES ⚠️' : 'No'}`);
    console.log('');
  }
  
  if (breakingPoints.length > 0) {
    console.log('⚠️ Breaking Points Detected:');
    breakingPoints.forEach(bp => {
      console.log(`  - ${bp.description}`);
    });
  } else {
    console.log('✅ No breaking points detected');
  }
  
  if (metrics.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    metrics.warnings.forEach(w => console.log(`  ${w}`));
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'load-test-results.json');
  const report = {
    config: CONFIG,
    summary: {
      duration,
      ...stats,
      memory: memoryAnalysis,
      breakingPoints
    },
    metrics,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Run the test
runLoadTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
