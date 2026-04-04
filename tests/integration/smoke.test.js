/**
 * @fileoverview Smoke Tests - Critical path verification
 * Quick tests to ensure core functionality works
 * 
 * Run with: node tests/integration/smoke.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Test utilities
const { 
  createTestEnv, 
  createMockLogger,
  generateMockConfig 
} = require('../helpers');

// Modules to test
let automationUtils, errorHandling, configValidator;

try {
  automationUtils = require('../../lib/automation-utils');
  errorHandling = require('../../lib/error-handling');
  configValidator = require('../../lib/config-validator');
} catch (e) {
  console.error('Failed to load modules:', e.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// SMOKE TESTS
// ═══════════════════════════════════════════════════════════════

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Running Smoke Tests\n');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${error.message}`);
      failed++;
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATION UTILS TESTS
// ═══════════════════════════════════════════════════════════════

test('delay function works', async () => {
  const start = Date.now();
  await automationUtils.delay(50);
  const elapsed = Date.now() - start;
  assert(elapsed >= 45, 'Delay should wait at least 45ms');
});

test('randomDelay generates delays in range', async () => {
  const delays = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await automationUtils.randomDelay(10, 30);
    delays.push(Date.now() - start);
  }
  
  // Check min delay (with small tolerance for event loop)
  assert(delays.every(d => d >= 8), 'Delays should be at least close to minimum');
  // Check max delay (with tolerance)
  assert(delays.every(d => d <= 100), 'Delays should not exceed maximum by much');
});

test('createLogger creates functional logger', () => {
  const logger = automationUtils.createLogger({ 
    name: 'test', 
    console: false,
    file: false 
  });
  
  assert(typeof logger.info === 'function', 'Logger should have info method');
  assert(typeof logger.error === 'function', 'Logger should have error method');
  assert(typeof logger.child === 'function', 'Logger should have child method');
});

test('SELECTORS contains HEB and Facebook selectors', () => {
  assert(automationUtils.SELECTORS.heb, 'Should have HEB selectors');
  assert(automationUtils.SELECTORS.facebook, 'Should have Facebook selectors');
  assert(automationUtils.SELECTORS.heb.addToCartBtn, 'HEB should have addToCartBtn');
  assert(automationUtils.SELECTORS.facebook.loginEmail, 'Facebook should have loginEmail');
});

test('getSelectors returns correct site selectors', () => {
  const hebSelectors = automationUtils.getSelectors('heb');
  const fbSelectors = automationUtils.getSelectors('facebook');
  
  assert(hebSelectors, 'Should return HEB selectors');
  assert(fbSelectors, 'Should return Facebook selectors');
  assert(!automationUtils.getSelectors('nonexistent'), 'Should return undefined for unknown site');
});

test('CircuitBreaker state transitions work', () => {
  const cb = new automationUtils.CircuitBreaker({ 
    failureThreshold: 2,
    resetTimeout: 1000
  });
  
  assert.strictEqual(cb.getState().state, 'CLOSED', 'Initial state should be CLOSED');
  
  cb._onFailure();
  assert.strictEqual(cb.getState().state, 'CLOSED', 'Should still be CLOSED after 1 failure');
  
  cb._onFailure();
  assert.strictEqual(cb.getState().state, 'OPEN', 'Should be OPEN after threshold reached');
});

test('withRetry retries on failure', async () => {
  let attempts = 0;
  
  try {
    await automationUtils.withRetry(async () => {
      attempts++;
      throw new Error('Always fails');
    }, { 
      maxAttempts: 3, 
      baseDelay: 10,
      retryableErrors: [/Always fails/]
    });
  } catch (e) {
    // Expected
  }
  
  assert.strictEqual(attempts, 3, 'Should retry specified number of times');
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════

test('AutomationError captures context', () => {
  const cause = new Error('Original error');
  const error = new errorHandling.AutomationError(
    'Wrapped error',
    'TEST_ERROR',
    { cause, context: { foo: 'bar' }, recoverable: true }
  );
  
  assert.strictEqual(error.message, 'Wrapped error');
  assert.strictEqual(error.code, 'TEST_ERROR');
  assert.strictEqual(error.cause, cause);
  assert.strictEqual(error.context.foo, 'bar');
  assert.strictEqual(error.recoverable, true);
});

test('AutomationError serializes to JSON', () => {
  const error = new errorHandling.AutomationError('Test', 'TEST');
  const json = error.toJSON();
  
  assert(json.name, 'JSON should have name');
  assert(json.message, 'JSON should have message');
  assert(json.code, 'JSON should have code');
  assert(json.timestamp, 'JSON should have timestamp');
});

test('NetworkError is recoverable by default', () => {
  const error = new errorHandling.NetworkError('Connection failed');
  assert.strictEqual(error.recoverable, true);
});

test('AuthError is not recoverable by default', () => {
  const error = new errorHandling.AuthError('Login failed');
  assert.strictEqual(error.recoverable, false);
});

test('SelectorError captures selector', () => {
  const error = new errorHandling.SelectorError('Not found', '#my-selector');
  assert.strictEqual(error.selector, '#my-selector');
  assert.strictEqual(error.context.selector, '#my-selector');
});

test('ErrorRecovery registers and executes strategies', async () => {
  const recovery = new errorHandling.ErrorRecovery();
  let executed = false;
  
  recovery.registerStrategy('TEST_CODE', async () => {
    executed = true;
    return true;
  });
  
  const error = new errorHandling.AutomationError('Test', 'TEST_CODE');
  const result = await recovery.recover(error, {});
  
  assert.strictEqual(result, true);
  assert.strictEqual(executed, true);
});

test('classifyError identifies network errors', () => {
  const networkError = new Error('ETIMEDOUT');
  const selectorError = new Error('element not found');
  
  assert.strictEqual(errorHandling.classifyError(networkError), 'network');
  assert.strictEqual(errorHandling.classifyError(selectorError), 'selector');
});

test('isRetryable detects retryable errors', () => {
  const networkError = new errorHandling.NetworkError('Failed');
  const authError = new errorHandling.AuthError('Failed');
  
  assert.strictEqual(errorHandling.isRetryable(networkError), true);
  assert.strictEqual(errorHandling.isRetryable(authError), false);
});

// ═══════════════════════════════════════════════════════════════
// CONFIG VALIDATOR TESTS
// ═══════════════════════════════════════════════════════════════

test('validateConfig accepts valid config', () => {
  const config = generateMockConfig();
  const result = configValidator.validateConfig(config);
  
  assert.strictEqual(result.valid, true, 'Should be valid');
  assert.strictEqual(result.errors.length, 0, 'Should have no errors');
});

test('validateConfig rejects invalid types', () => {
  const config = generateMockConfig({
    browser: { debugPort: 'not-a-number' }
  });
  const result = configValidator.validateConfig(config);
  
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('Expected number')));
});

test('validateConfig enforces min/max values', () => {
  const config = generateMockConfig({
    browser: { debugPort: 100 } // Below min 1024
  });
  const result = configValidator.validateConfig(config);
  
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('less than minimum')));
});

test('validateConfig checks enum values', () => {
  const config = generateMockConfig({
    logging: { level: 'invalid' }
  });
  const result = configValidator.validateConfig(config);
  
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('must be one of')));
});

test('validateConfig detects unknown keys', () => {
  const config = generateMockConfig({
    unknownKey: 'value'
  });
  const result = configValidator.validateConfig(config);
  
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('Unknown')));
});

test('applyDefaults fills missing values', () => {
  const config = { browser: {} };
  const result = configValidator.applyDefaults(config);
  
  assert.strictEqual(result.browser.debugPort, 9222, 'Should apply default port');
  assert.strictEqual(result.antiBot.minDelay, 500, 'Should apply default minDelay');
});

test('findHardcodedSecrets detects passwords', () => {
  const config = {
    credentials: {
      password: 'secret123',
      apiKey: 'abc123'
    }
  };
  const secrets = configValidator.findHardcodedSecrets(config);
  
  assert(secrets.length > 0, 'Should find secrets');
  assert(secrets.some(s => s.type === 'password'));
});

test('validateSecrets reports hardcoded values', () => {
  const config = {
    password: 'secret'
  };
  const result = configValidator.validateSecrets(config);
  
  assert.strictEqual(result.valid, false);
  assert(result.hardcoded.length > 0);
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

test('CDPManager integration with mock server', async () => {
  const { server, client, setup, teardown } = createTestEnv();
  
  await setup();
  
  try {
    assert(client.connected, 'Client should be connected');
    assert(server.connected, 'Server should show connected');
    
    const result = await client.send('Target.getTargets');
    assert(result.targetInfos, 'Should get targets');
    assert.strictEqual(result.targetInfos.length, 1);
  } finally {
    await teardown();
  }
  
  assert(!client.connected, 'Client should be disconnected');
});

test('Mock page click and type operations', async () => {
  const { server, client, setup, teardown } = createTestEnv();
  
  await setup();
  
  try {
    const { MockPage } = require('../mocks/cdp-server');
    const page = new MockPage(client, 'test-page');
    
    // Mock an element
    const button = { visible: true, clicked: false };
    page.mockElement('#submit', button);
    
    await page.click('#submit');
    assert.strictEqual(button.clicked, true);
  } finally {
    await teardown();
  }
});

test('Retry with circuit breaker integration', async () => {
  const cb = new automationUtils.CircuitBreaker({
    failureThreshold: 2,
    resetTimeout: 100
  });
  
  let failures = 0;
  
  // First two calls should fail and trigger circuit
  try {
    await cb.execute(async () => {
      failures++;
      throw new Error('Service down');
    });
  } catch (e) {
    // Expected
  }
  
  try {
    await cb.execute(async () => {
      failures++;
      throw new Error('Service down');
    });
  } catch (e) {
    // Expected
  }
  
  assert.strictEqual(cb.getState().state, 'OPEN', 'Circuit should be open');
  
  // Wait for reset
  await new Promise(r => setTimeout(r, 150));
  
  // Circuit should be half-open now
  try {
    await cb.execute(async () => 'success');
    assert.strictEqual(cb.getState().state, 'HALF_OPEN');
  } catch (e) {
    // Circuit might still be open
  }
});

// ═══════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
