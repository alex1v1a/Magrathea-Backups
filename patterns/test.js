#!/usr/bin/env node
/**
 * Patterns Library Test Suite
 * Verifies all modules work correctly
 */

const patterns = require('./index');
const { logger } = patterns;

async function runTests() {
  logger.section('PATTERNS LIBRARY TEST SUITE');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function test(name, fn) {
    return async () => {
      try {
        await fn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        logger.success(`✓ ${name}`);
      } catch (e) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: e.message });
        logger.failure(`✗ ${name}: ${e.message}`);
      }
    };
  }
  
  // Test 1: Credentials module
  await test('Credentials module loads', async () => {
    if (!patterns.getCredentials) throw new Error('getCredentials not exported');
  })();
  
  // Test 2: Retry utilities
  await test('Retry with success', async () => {
    let count = 0;
    const result = await patterns.withRetry(async () => {
      count++;
      if (count < 2) throw new Error('Retry me');
      return 'success';
    }, { maxRetries: 3 });
    if (result !== 'success') throw new Error('Wrong result');
    if (count !== 2) throw new Error('Did not retry');
  })();
  
  // Test 3: Sleep function
  await test('Sleep works', async () => {
    const start = Date.now();
    await patterns.sleep(100);
    const elapsed = Date.now() - start;
    if (elapsed < 80) throw new Error('Sleep too short');
  })();
  
  // Test 4: Batch processing
  await test('Batch processing', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await patterns.batchProcess(items, async (x) => x * 2, { 
      batchSize: 2,
      concurrency: 2 
    });
    if (results.length !== 5) throw new Error('Wrong count');
    if (!results.every(r => r.success)) throw new Error('Some failed');
  })();
  
  // Test 5: Logger
  await test('Logger functions exist', async () => {
    if (!patterns.logger.info) throw new Error('logger.info missing');
    if (!patterns.log.success) throw new Error('log.success missing');
  })();
  
  // Test 6: Browser patterns
  await test('Browser patterns exported', async () => {
    if (!patterns.SessionManager) throw new Error('SessionManager missing');
    if (!patterns.smartClick) throw new Error('smartClick missing');
    if (!patterns.RateLimiter) throw new Error('RateLimiter missing');
  })();
  
  // Test 7: Rate limiter
  await test('RateLimiter works', async () => {
    const limiter = new patterns.RateLimiter({ minDelay: 50 });
    const start = Date.now();
    await limiter.wait();
    await limiter.wait();
    const elapsed = Date.now() - start;
    if (elapsed < 50) throw new Error('Rate limit not enforced');
  })();
  
  // Test 8: Metrics
  await test('Metrics module loads', async () => {
    if (!patterns.recordMetric) throw new Error('recordMetric missing');
    if (!patterns.MetricsReporter) throw new Error('MetricsReporter missing');
  })();
  
  // Test 9: Calendar utilities
  await test('Calendar utils exported', async () => {
    if (!patterns.incrementalSync) throw new Error('incrementalSync missing');
    if (!patterns.parseICal) throw new Error('parseICal missing');
  })();
  
  // Test 10: Email utilities
  await test('Email utils exported', async () => {
    if (!patterns.sendEmail) throw new Error('sendEmail missing');
    if (!patterns.findVerificationCode) throw new Error('findVerificationCode missing');
  })();
  
  // Summary
  logger.section('TEST SUMMARY');
  logger.info(`Total: ${results.passed + results.failed}`);
  logger.success(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logger.failure(`Failed: ${results.failed}`);
  }
  
  return results.failed === 0;
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.failure('Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runTests };
