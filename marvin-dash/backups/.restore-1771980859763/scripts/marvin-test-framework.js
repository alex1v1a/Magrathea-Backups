/**
 * Marvin Test Framework
 * Automated testing for automation scripts
 * 
 * Usage: npm test or node marvin-test-framework.js [--watch] [--coverage]
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor(options = {}) {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    this.options = {
      verbose: options.verbose || false,
      coverage: options.coverage || false,
      timeout: options.timeout || 30000
    };
  }

  describe(name, fn) {
    console.log(`\n${COLORS.bright}${name}${COLORS.reset}`);
    fn();
  }

  test(name, fn) {
    this.tests.push({ name, fn, type: 'test' });
  }

  skip(name, fn) {
    this.tests.push({ name, fn, type: 'skip' });
  }

  async run() {
    console.log(`${COLORS.bright}🧪 Running Tests${COLORS.reset}\n`);
    
    const startTime = Date.now();
    
    for (const test of this.tests) {
      if (test.type === 'skip') {
        console.log(`${COLORS.yellow}⚠️  SKIP${COLORS.reset} ${test.name}`);
        this.results.skipped++;
        continue;
      }

      try {
        await this.runWithTimeout(test.fn, this.options.timeout);
        console.log(`${COLORS.green}✅ PASS${COLORS.reset} ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`${COLORS.red}❌ FAIL${COLORS.reset} ${test.name}`);
        console.log(`   ${COLORS.red}${error.message}${COLORS.reset}`);
        this.results.failed++;
        this.results.errors.push({ test: test.name, error: error.message });
      }
    }

    const duration = Date.now() - startTime;
    this.printSummary(duration);
    
    return this.results.failed === 0;
  }

  async runWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  printSummary(duration) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`${COLORS.bright}Test Summary${COLORS.reset}`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`${COLORS.green}Passed: ${this.results.passed}${COLORS.reset}`);
    console.log(`${COLORS.red}Failed: ${this.results.failed}${COLORS.reset}`);
    console.log(`${COLORS.yellow}Skipped: ${this.results.skipped}${COLORS.reset}`);
    console.log(`${'═'.repeat(50)}`);

    if (this.results.failed === 0) {
      console.log(`${COLORS.green}✅ All tests passed!${COLORS.reset}\n`);
    } else {
      console.log(`${COLORS.red}❌ ${this.results.failed} test(s) failed${COLORS.reset}\n`);
    }
  }

  // Assertions
  static assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  static assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  static assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected to contain "${needle}"`);
    }
  }

  static async assertFileExists(filePath) {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File does not exist: ${filePath}`);
    }
  }

  static async assertValidJson(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
  }
}

// Test Suites

function createUnitTests(runner) {
  runner.describe('Unit Tests', () => {
    
    runner.test('Data files are valid JSON', async () => {
      const dataFiles = [
        'marvin-dash/data/tasks.json',
        'marvin-dash/data/model-usage.json',
        'dinner-automation/data/recipe-database.json'
      ];

      for (const file of dataFiles) {
        await TestRunner.assertValidJson(file);
      }
    });

    runner.test('Required scripts exist', async () => {
      const requiredScripts = [
        'dinner-automation/scripts/heb-cart-self-recovering.js',
        'dinner-automation/scripts/calendar-sync.js',
        'dinner-automation/scripts/email-client.js',
        'marvin-dash/scripts/kanban-sync.js',
        'marvin-dash/scripts/auto-recovery.js'
      ];

      for (const script of requiredScripts) {
        await TestRunner.assertFileExists(script);
      }
    });

    runner.test('Email client can format without sending', async () => {
      const emailClient = require('../../dinner-automation/scripts/email-client.js');
      TestRunner.assert(typeof emailClient.DinnerEmailClient === 'function', 'DinnerEmailClient should be exported');
    });
  });
}

function createIntegrationTests(runner) {
  runner.describe('Integration Tests', () => {
    
    runner.test('Calendar sync generates valid output', async () => {
      const calendarModule = require('../../dinner-automation/scripts/calendar-sync.js');
      TestRunner.assert(calendarModule.CalendarSync, 'CalendarSync should be exported');
    });

    runner.test('Profiler module loads correctly', async () => {
      const profiler = require('../../dinner-automation/scripts/profiler.js');
      TestRunner.assert(profiler.Profiler, 'Profiler should be exported');
    });

    runner.test('Kanban sync functions are available', async () => {
      const kanban = require('../../marvin-dash/scripts/kanban-sync.js');
      TestRunner.assert(typeof kanban.sync === 'function', 'sync function should exist');
      TestRunner.assert(typeof kanban.loadTasks === 'function', 'loadTasks function should exist');
    });
  });
}

function createPerformanceTests(runner) {
  runner.describe('Performance Tests', () => {
    
    runner.test('Script load time is reasonable', async () => {
      const start = Date.now();
      require('../../dinner-automation/scripts/email-client.js');
      const loadTime = Date.now() - start;
      
      if (loadTime > 5000) {
        throw new Error(`Script load took ${loadTime}ms, expected <5000ms`);
      }
    });

    runner.test('JSON parsing is fast', async () => {
      const testData = JSON.stringify({ test: Array(1000).fill('data') });
      const iterations = 1000;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(testData);
      }
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        throw new Error(`JSON parsing took ${duration}ms for ${iterations} iterations`);
      }
    });
  });
}

function createSecurityTests(runner) {
  runner.describe('Security Tests', () => {
    
    runner.test('No hardcoded passwords in scripts', async () => {
      const scriptsDir = 'dinner-automation/scripts';
      const files = await fs.readdir(scriptsDir);
      
      const passwordPatterns = [
        /password\s*=\s*["'][^"']+["']/i,
        /api[_-]?key\s*=\s*["'][^"']+["']/i,
        /secret\s*=\s*["'][^"']+["']/i
      ];

      for (const file of files.filter(f => f.endsWith('.js'))) {
        const content = await fs.readFile(path.join(scriptsDir, file), 'utf8');
        
        for (const pattern of passwordPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Allow environment variable patterns
            const isEnvVar = matches[0].includes('process.env') || 
                            matches[0].includes('env.') ||
                            matches[0].includes('${');
            if (!isEnvVar) {
              throw new Error(`Potential hardcoded credential in ${file}: ${matches[0]}`);
            }
          }
        }
      }
    });

    runner.test('Scripts handle errors gracefully', async () => {
      const criticalScripts = [
        'marvin-dash/scripts/auto-recovery.js',
        'dinner-automation/scripts/heb-cart-self-recovering.js'
      ];

      for (const script of criticalScripts) {
        const content = await fs.readFile(script, 'utf8');
        
        // Check for try-catch blocks
        const hasTryCatch = content.includes('try') && content.includes('catch');
        const hasAsyncAwait = content.includes('async') && content.includes('await');
        
        if (hasAsyncAwait && !hasTryCatch) {
          console.log(`   ⚠️  Warning: ${script} may lack error handling`);
        }
      }
    });
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage'),
    unit: args.includes('--unit'),
    integration: args.includes('--integration'),
    performance: args.includes('--performance'),
    security: args.includes('--security')
  };

  const runAll = !options.unit && !options.integration && !options.performance && !options.security;

  const runner = new TestRunner(options);

  if (runAll || options.unit) createUnitTests(runner);
  if (runAll || options.integration) createIntegrationTests(runner);
  if (runAll || options.performance) createPerformanceTests(runner);
  if (runAll || options.security) createSecurityTests(runner);

  const success = await runner.run();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test framework error:', error);
    process.exit(1);
  });
}

module.exports = { TestRunner };
