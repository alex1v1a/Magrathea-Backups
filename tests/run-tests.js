#!/usr/bin/env node
/**
 * Marvin Automation Framework - Test Runner
 * 
 * Comprehensive test runner supporting unit, integration, e2e tests and benchmarks.
 * 
 * Usage:
 *   node tests/run-tests.js
 *   node tests/run-tests.js --unit
 *   node tests/run-tests.js --integration
 *   node tests/run-tests.js --e2e
 *   node tests/run-tests.js --benchmark
 *   node tests/run-tests.js --file=unit/utils.test.js
 *   node tests/run-tests.js --coverage
 *   node tests/run-tests.js --verbose
 *   node tests/run-tests.js --grep="cart"
 *   node tests/run-tests.js --bail
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test state
const state = {
  tests: [],
  currentSuite: null,
  stats: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  },
  config: {
    bail: false,
    verbose: false,
    coverage: false,
    grep: null,
    reporter: 'console'
  }
};

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

/**
 * Define a test suite
 */
function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
    parent: state.currentSuite
  };

  const previousSuite = state.currentSuite;
  state.currentSuite = suite;
  
  try {
    fn();
  } catch (error) {
    console.error(`Error in suite "${name}":`, error.message);
  }
  
  state.currentSuite = previousSuite;
  
  if (previousSuite) {
    previousSuite.tests.push(suite);
  } else {
    state.tests.push(suite);
  }
}

/**
 * Define a test case
 */
function it(name, fn) {
  const test = {
    name,
    fn,
    suite: state.currentSuite,
    skip: false,
    only: false
  };
  
  if (state.currentSuite) {
    state.currentSuite.tests.push(test);
  } else {
    state.tests.push(test);
  }
}

/**
 * Skip a test
 */
function it.skip(name, fn) {
  const test = {
    name,
    fn,
    suite: state.currentSuite,
    skip: true,
    only: false
  };
  
  if (state.currentSuite) {
    state.currentSuite.tests.push(test);
  } else {
    state.tests.push(test);
  }
}

/**
 * Run only this test
 */
function it.only(name, fn) {
  const test = {
    name,
    fn,
    suite: state.currentSuite,
    skip: false,
    only: true
  };
  
  if (state.currentSuite) {
    state.currentSuite.tests.push(test);
  } else {
    state.tests.push(test);
  }
}

/**
 * Hook: Run before all tests in suite
 */
function beforeAll(fn) {
  if (state.currentSuite) {
    state.currentSuite.beforeAll.push(fn);
  }
}

/**
 * Hook: Run after all tests in suite
 */
function afterAll(fn) {
  if (state.currentSuite) {
    state.currentSuite.afterAll.push(fn);
  }
}

/**
 * Hook: Run before each test in suite
 */
function beforeEach(fn) {
  if (state.currentSuite) {
    state.currentSuite.beforeEach.push(fn);
  }
}

/**
 * Hook: Run after each test in suite
 */
function afterEach(fn) {
  if (state.currentSuite) {
    state.currentSuite.afterEach.push(fn);
  }
}

/**
 * Assertion utilities
 */
const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  toEqual(expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  toBeTruthy() {
    if (!actual) {
      throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
    }
  },
  toBeFalsy() {
    if (actual) {
      throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
    }
  },
  toBeDefined() {
    if (actual === undefined) {
      throw new Error(`Expected defined value, got undefined`);
    }
  },
  toBeUndefined() {
    if (actual !== undefined) {
      throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    }
  },
  toBeNull() {
    if (actual !== null) {
      throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    }
  },
  toBeGreaterThan(expected) {
    if (!(actual > expected)) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeLessThan(expected) {
    if (!(actual < expected)) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toContain(expected) {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
    }
  },
  toMatch(pattern) {
    if (!pattern.test(actual)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to match ${pattern}`);
    }
  },
  toThrow(expectedPattern) {
    let threw = false;
    let thrownError = null;
    try {
      actual();
    } catch (error) {
      threw = true;
      thrownError = error;
    }
    if (!threw) {
      throw new Error(`Expected function to throw`);
    }
    if (expectedPattern && !expectedPattern.test(thrownError.message)) {
      throw new Error(`Expected error to match ${expectedPattern}, got: ${thrownError.message}`);
    }
  },
  toHaveLength(expected) {
    if (actual.length !== expected) {
      throw new Error(`Expected length ${expected}, got ${actual.length}`);
    }
  },
  toBeInstanceOf(expected) {
    if (!(actual instanceof expected)) {
      throw new Error(`Expected instance of ${expected.name}`);
    }
  }
});

// ============================================================================
// TEST EXECUTION
// ============================================================================

/**
 * Run a single test
 */
async function runTest(test, suite) {
  // Check grep filter
  if (state.config.grep && !test.name.includes(state.config.grep)) {
    state.stats.skipped++;
    return { status: 'skipped', duration: 0 };
  }
  
  if (test.skip) {
    state.stats.skipped++;
    return { status: 'skipped', duration: 0 };
  }

  state.stats.total++;
  const startTime = performance.now();
  
  try {
    // Run beforeEach hooks
    if (suite) {
      for (const hook of suite.beforeEach) {
        await hook();
      }
    }
    
    // Run test
    await test.fn();
    
    // Run afterEach hooks
    if (suite) {
      for (const hook of suite.afterEach) {
        await hook();
      }
    }
    
    const duration = performance.now() - startTime;
    state.stats.passed++;
    return { status: 'passed', duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    state.stats.failed++;
    return { status: 'failed', duration, error };
  }
}

/**
 * Run a test suite
 */
async function runSuite(suite, depth = 0) {
  const results = [];
  const indent = '  '.repeat(depth);
  
  // Print suite name
  if (depth === 0) {
    console.log(`\n${indent}${colors.bright}${suite.name}${colors.reset}`);
    console.log(`${indent}${colors.dim}${'─'.repeat(60)}${colors.reset}`);
  } else {
    console.log(`${indent}${colors.cyan}▼ ${suite.name}${colors.reset}`);
  }
  
  // Run beforeAll hooks
  for (const hook of suite.beforeAll) {
    try {
      await hook();
    } catch (error) {
      console.log(`${indent}  ${colors.red}✗ beforeAll failed: ${error.message}${colors.reset}`);
      return [{ status: 'failed', error }];
    }
  }
  
  // Run tests and nested suites
  for (const item of suite.tests) {
    if (item.tests) {
      // It's a nested suite
      const nestedResults = await runSuite(item, depth + 1);
      results.push(...nestedResults);
    } else {
      // It's a test
      const result = await runTest(item, suite);
      results.push(result);
      
      // Print result
      const statusIcon = {
        passed: `${colors.green}✓${colors.reset}`,
        failed: `${colors.red}✗${colors.reset}`,
        skipped: `${colors.yellow}○${colors.reset}`
      }[result.status];
      
      const duration = result.duration ? ` (${Math.round(result.duration)}ms)` : '';
      const name = item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name;
      
      if (result.status === 'failed') {
        console.log(`${indent}  ${statusIcon} ${name}${colors.dim}${duration}${colors.reset}`);
        if (state.config.verbose) {
          console.log(`${indent}     ${colors.red}${result.error.message}${colors.reset}`);
        }
      } else if (state.config.verbose || result.status === 'failed') {
        console.log(`${indent}  ${statusIcon} ${name}${colors.dim}${duration}${colors.reset}`);
      }
      
      // Bail on first failure if configured
      if (state.config.bail && result.status === 'failed') {
        return results;
      }
    }
  }
  
  // Run afterAll hooks
  for (const hook of suite.afterAll) {
    try {
      await hook();
    } catch (error) {
      console.log(`${indent}  ${colors.red}✗ afterAll failed: ${error.message}${colors.reset}`);
    }
  }
  
  return results;
}

/**
 * Load and run test file
 */
async function runTestFile(filePath) {
  // Reset test state for this file
  const previousTests = state.tests;
  state.tests = [];
  
  try {
    // Load test file
    delete require.cache[require.resolve(filePath)];
    require(filePath);
    
    // Run all suites
    const results = [];
    for (const suite of state.tests) {
      const suiteResults = await runSuite(suite);
      results.push(...suiteResults);
    }
    
    return results;
  } catch (error) {
    console.error(`${colors.red}Error loading ${filePath}:${colors.reset}`, error.message);
    return [{ status: 'failed', error }];
  } finally {
    state.tests = previousTests;
  }
}

// ============================================================================
// DISCOVERY
// ============================================================================

/**
 * Discover test files
 */
async function discoverTests(type = 'all') {
  const testDir = path.join(__dirname);
  const files = [];
  
  const patterns = {
    unit: ['unit/**/*.test.js'],
    integration: ['integration/**/*.test.js'],
    e2e: ['e2e/**/*.test.js'],
    benchmark: ['benchmarks/**/*.bench.js'],
    all: ['unit/**/*.test.js', 'integration/**/*.test.js', 'e2e/**/*.test.js']
  }[type] || ['**/*.test.js'];
  
  for (const pattern of patterns) {
    const glob = require('glob');
    const matches = glob.sync(pattern, { cwd: testDir });
    files.push(...matches.map(f => path.join(testDir, f)));
  }
  
  return [...new Set(files)];
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Print test summary
 */
function printSummary(startTime) {
  const duration = Date.now() - startTime;
  const { total, passed, failed, skipped } = state.stats;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.bright}Test Summary${colors.reset}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`Total:   ${total}`);
  console.log(`${colors.green}Passed:  ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed:  ${failed}${colors.reset}`);
  }
  if (skipped > 0) {
    console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);
  }
  
  console.log(`Duration: ${duration}ms`);
  console.log(`${'='.repeat(60)}\n`);
  
  return failed === 0;
}

/**
 * Print help
 */
function printHelp() {
  console.log(`
${colors.bright}Marvin Automation Framework - Test Runner${colors.reset}

Usage:
  node tests/run-tests.js [options]

Options:
  --unit           Run unit tests only
  --integration    Run integration tests only
  --e2e            Run end-to-end tests only
  --benchmark      Run benchmarks only
  --file=<path>    Run specific test file
  --coverage       Generate coverage report
  --verbose        Verbose output
  --grep=<pattern> Filter tests by pattern
  --bail           Stop on first failure
  --reporter=<r>   Reporter: console, json, junit
  --help           Show this help

Examples:
  node tests/run-tests.js
  node tests/run-tests.js --unit
  node tests/run-tests.js --integration --verbose
  node tests/run-tests.js --file=unit/utils.test.js
  node tests/run-tests.js --grep="cart"
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let testType = 'all';
  let specificFile = null;
  
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--unit') {
      testType = 'unit';
    } else if (arg === '--integration') {
      testType = 'integration';
    } else if (arg === '--e2e') {
      testType = 'e2e';
    } else if (arg === '--benchmark') {
      testType = 'benchmark';
    } else if (arg === '--verbose' || arg === '-v') {
      state.config.verbose = true;
    } else if (arg === '--bail') {
      state.config.bail = true;
    } else if (arg === '--coverage') {
      state.config.coverage = true;
    } else if (arg.startsWith('--file=')) {
      specificFile = arg.substring(7);
    } else if (arg.startsWith('--grep=')) {
      state.config.grep = arg.substring(7);
    } else if (arg.startsWith('--reporter=')) {
      state.config.reporter = arg.substring(11);
    }
  }
  
  // Print header
  console.log(`\n${colors.bright}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}  Marvin Automation Framework - Test Runner${colors.reset}`);
  console.log(`${colors.bright}${'═'.repeat(60)}${colors.reset}`);
  console.log(`Mode: ${colors.cyan}${testType}${colors.reset}`);
  if (state.config.grep) {
    console.log(`Filter: ${colors.cyan}${state.config.grep}${colors.reset}`);
  }
  
  const startTime = Date.now();
  
  // Discover test files
  let testFiles;
  if (specificFile) {
    testFiles = [path.join(__dirname, specificFile)];
  } else {
    testFiles = await discoverTests(testType);
  }
  
  if (testFiles.length === 0) {
    console.log(`\n${colors.yellow}No test files found.${colors.reset}`);
    process.exit(0);
  }
  
  console.log(`Files: ${colors.cyan}${testFiles.length}${colors.reset}\n`);
  
  // Run tests
  for (const file of testFiles) {
    const relativePath = path.relative(__dirname, file);
    if (state.config.verbose) {
      console.log(`${colors.dim}Loading: ${relativePath}${colors.reset}`);
    }
    await runTestFile(file);
  }
  
  // Print summary
  const success = printSummary(startTime);
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Export test framework globals
module.exports = {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect
};

// Make globals available to test files
global.describe = describe;
global.it = it;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.expect = expect;

// Run main if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
