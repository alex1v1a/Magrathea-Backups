/**
 * Simple Test Runner - No external dependencies
 * Lightweight testing for cart verification, email parsing, and calendar sync
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = Date.now();
  }

  describe(name, fn) {
    console.log(`\n${colors.blue}▶ ${name}${colors.reset}`);
    fn();
  }

  it(name, fn) {
    this.tests.push({ name, fn });
  }

  skip(name, fn) {
    this.tests.push({ name, fn, skip: true });
  }

  async run() {
    console.log(`${colors.blue}Running ${this.tests.length} tests...${colors.reset}\n`);
    
    for (const test of this.tests) {
      if (test.skip) {
        console.log(`${colors.yellow}⊘ ${test.name}${colors.reset}`);
        this.skipped++;
        continue;
      }

      try {
        await test.fn();
        console.log(`${colors.green}✓ ${test.name}${colors.reset}`);
        this.passed++;
      } catch (error) {
        console.log(`${colors.red}✗ ${test.name}${colors.reset}`);
        console.log(`  ${colors.gray}${error.message}${colors.reset}`);
        this.failed++;
      }
    }

    const duration = Date.now() - this.startTime;
    this.printSummary(duration);
    return this.failed === 0;
  }

  printSummary(duration) {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`Tests: ${this.passed} passed, ${this.failed} failed, ${this.skipped} skipped`);
    console.log(`Time:  ${duration}ms`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  }

  // Assertions
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertTrue(value, message) {
    if (value !== true) {
      throw new Error(message || `Expected true, got ${value}`);
    }
  }

  assertFalse(value, message) {
    if (value !== false) {
      throw new Error(message || `Expected false, got ${value}`);
    }
  }

  assertIncludes(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected "${haystack}" to include "${needle}"`);
    }
  }

  assertArrayLength(arr, length, message) {
    if (arr.length !== length) {
      throw new Error(message || `Expected array length ${length}, got ${arr.length}`);
    }
  }

  assertObjectHas(obj, key, message) {
    if (!(key in obj)) {
      throw new Error(message || `Expected object to have key "${key}"`);
    }
  }

  assertThrows(fn, message) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  }

  assertApprox(actual, expected, tolerance = 0.1, message) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(message || `Expected ${actual} to be within ${tolerance} of ${expected}`);
    }
  }
}

// Export for use in test files
module.exports = { TestRunner };

// CLI: Run specific test file
if (require.main === module) {
  const testFile = process.argv[2];
  if (!testFile) {
    console.log('Usage: node test-runner.js <test-file.js>');
    process.exit(1);
  }
  require(path.resolve(testFile));
}
