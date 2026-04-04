/**
 * Smart Retry Test Script
 * Run: node experiments/smart-retry/test.js
 */

const { SmartRetry, FixedRetry, LinearRetry } = require('./retry');
const fs = require('fs');
const path = require('path');

// Simulate operations with configurable failure rates
class SimulatedOperation {
  constructor(failureRate = 0.3) {
    this.failureRate = failureRate;
    this.attemptCount = 0;
  }

  async execute() {
    this.attemptCount++;
    await this.sleep(100);
    
    if (Math.random() < this.failureRate) {
      const errors = [
        'Network timeout',
        'Connection reset',
        'Service temporarily unavailable',
        'Rate limit exceeded'
      ];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
    
    return { data: 'success', attemptsNeeded: this.attemptCount };
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  reset() {
    this.attemptCount = 0;
  }
}

async function runComparison() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Smart Retry with Jitter - Comparison Test');
  console.log('═══════════════════════════════════════════════════════\n');

  const failureRates = [0.1, 0.3, 0.5, 0.7];
  const iterations = 100;

  const results = {
    noRetry: {},
    fixed: {},
    linear: {},
    smart: {}
  };

  for (const failureRate of failureRates) {
    console.log(`\n📊 Testing with ${(failureRate * 100).toFixed(0)}% failure rate (${iterations} iterations)`);

    // No retry
    results.noRetry[failureRate] = await testStrategy('none', failureRate, iterations);
    
    // Fixed delay
    results.fixed[failureRate] = await testStrategy('fixed', failureRate, iterations);
    
    // Linear backoff
    results.linear[failureRate] = await testStrategy('linear', failureRate, iterations);
    
    // Smart retry (exponential + jitter)
    results.smart[failureRate] = await testStrategy('smart', failureRate, iterations);
  }

  // Print summary table
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SUMMARY: Success Rates by Strategy');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Failure Rate │ No Retry │ Fixed    │ Linear   │ Smart    │');
  console.log('─────────────┼──────────┼──────────┼──────────┼──────────┤');
  
  for (const failureRate of failureRates) {
    const nr = (results.noRetry[failureRate].successRate * 100).toFixed(1);
    const fx = (results.fixed[failureRate].successRate * 100).toFixed(1);
    const ln = (results.linear[failureRate].successRate * 100).toFixed(1);
    const sm = (results.smart[failureRate].successRate * 100).toFixed(1);
    const fr = (failureRate * 100).toFixed(0).padStart(3);
    console.log(`    ${fr}%     │  ${nr.padStart(5)}%  │  ${fx.padStart(5)}%  │  ${ln.padStart(5)}%  │  ${sm.padStart(5)}%  │`);
  }

  // Print average time table
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SUMMARY: Average Time (successful operations)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Failure Rate │ No Retry │ Fixed    │ Linear   │ Smart    │');
  console.log('─────────────┼──────────┼──────────┼──────────┼──────────┤');
  
  for (const failureRate of failureRates) {
    const nr = results.noRetry[failureRate].avgTime.toFixed(0);
    const fx = results.fixed[failureRate].avgTime.toFixed(0);
    const ln = results.linear[failureRate].avgTime.toFixed(0);
    const sm = results.smart[failureRate].avgTime.toFixed(0);
    const fr = (failureRate * 100).toFixed(0).padStart(3);
    console.log(`    ${fr}%     │ ${nr.padStart(5)}ms  │ ${fx.padStart(5)}ms  │ ${ln.padStart(5)}ms  │ ${sm.padStart(5)}ms  │`);
  }

  // Test jitter effectiveness for bot detection
  console.log('\n📊 Testing Jitter Effectiveness (Pattern Analysis)');
  await testJitterEffectiveness();

  // Delay schedule comparison
  console.log('\n📊 Delay Schedule Comparison');
  printDelaySchedules();

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\n✅ Test results saved to test-results.json');
}

async function testStrategy(strategy, failureRate, iterations) {
  const successes = [];
  const failures = [];
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const operation = new SimulatedOperation(failureRate);
    const start = Date.now();

    try {
      let result;
      
      switch (strategy) {
        case 'none':
          result = await operation.execute();
          break;
        case 'fixed':
          const fixedRetry = new FixedRetry({ maxRetries: 3, fixedDelay: 2000 });
          result = await fixedRetry.execute(() => operation.execute(), 'test');
          break;
        case 'linear':
          const linearRetry = new LinearRetry({ maxRetries: 3, baseDelay: 1000, increment: 1000 });
          result = await linearRetry.execute(() => operation.execute(), 'test');
          break;
        case 'smart':
          const smartRetry = new SmartRetry({ 
            maxRetries: 3, 
            baseDelay: 1000, 
            maxDelay: 15000,
            jitterFactor: 0.3 
          });
          result = await smartRetry.execute(() => operation.execute(), 'test');
          break;
      }

      successes.push(result);
      times.push(Date.now() - start);
    } catch (error) {
      failures.push(error.message);
    }
  }

  return {
    successRate: successes.length / iterations,
    failureRate: failures.length / iterations,
    avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    avgAttempts: successes.length > 0 
      ? successes.reduce((a, s) => a + (s.attempts || 1), 0) / successes.length 
      : 0
  };
}

async function testJitterEffectiveness() {
  const smartRetry = new SmartRetry({ maxRetries: 5, baseDelay: 1000, jitterFactor: 0.3 });
  const fixedRetry = new FixedRetry({ maxRetries: 5, fixedDelay: 2000 });

  // Generate timing patterns
  const smartDelays = [];
  const fixedDelays = [];

  for (let i = 0; i < 20; i++) {
    const smartSchedule = smartRetry.getDelaySchedule();
    const smartTotal = smartSchedule.reduce((a, s) => a + s.max, 0);
    smartDelays.push(smartTotal);

    fixedDelays.push(2000 * 3); // 3 retries at 2000ms
  }

  // Calculate variance (predictability)
  const smartVariance = calculateVariance(smartDelays);
  const fixedVariance = calculateVariance(fixedDelays);

  console.log(`   Smart retry delay variance: ${smartVariance.toFixed(0)}ms`);
  console.log(`   Fixed retry delay variance: ${fixedVariance.toFixed(0)}ms`);
  console.log(`   Randomness factor: ${(smartVariance / Math.max(fixedVariance, 1)).toFixed(1)}x`);
  console.log(`   → Higher variance = less predictable = harder to detect as bot`);
}

function calculateVariance(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

function printDelaySchedules() {
  const strategies = [
    { name: 'Fixed (2000ms)', instance: new FixedRetry({ maxRetries: 3, fixedDelay: 2000 }) },
    { name: 'Linear (1000ms + 1000ms)', instance: new LinearRetry({ maxRetries: 3, baseDelay: 1000, increment: 1000 }) },
    { name: 'Smart (exp + 30% jitter)', instance: new SmartRetry({ maxRetries: 3, baseDelay: 1000, jitterFactor: 0.3 }) }
  ];

  console.log('   Strategy          │ Attempt 1 │ Attempt 2 │ Attempt 3 │ Total Range │');
  console.log('   ──────────────────┼───────────┼───────────┼───────────┼─────────────┤');

  for (const { name, instance } of strategies) {
    if (instance instanceof SmartRetry) {
      const schedule = instance.getDelaySchedule();
      const ranges = schedule.map(s => `${s.min}-${s.max}ms`);
      const totalMin = schedule.reduce((a, s) => a + s.min, 0);
      const totalMax = schedule.reduce((a, s) => a + s.max, 0);
      console.log(`   ${name.padEnd(18)}│ ${ranges[0].padEnd(9)}│ ${ranges[1].padEnd(9)}│ ${ranges[2].padEnd(9)}│ ${totalMin}-${totalMax}ms │`);
    } else if (instance instanceof FixedRetry) {
      const d = instance.fixedDelay;
      console.log(`   ${name.padEnd(18)}│ ${d}ms      │ ${d}ms      │ ${d}ms      │ ${d * 3}ms       │`);
    } else if (instance instanceof LinearRetry) {
      const d1 = instance.baseDelay;
      const d2 = d1 + instance.increment;
      const d3 = d2 + instance.increment;
      console.log(`   ${name.padEnd(18)}│ ${d1}ms      │ ${d2}ms      │ ${d3}ms      │ ${d1 + d2 + d3}ms      │`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  runComparison().catch(console.error);
}

module.exports = { runComparison, SimulatedOperation };
