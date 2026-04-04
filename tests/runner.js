/**
 * @fileoverview Test Runner - Run all tests with reporting
 * 
 * Usage:
 *   node tests/runner.js                    # Run all tests
 *   node tests/runner.js --smoke            # Run smoke tests only
 *   node tests/runner.js --unit             # Run unit tests only
 *   node tests/runner.js --integration      # Run integration tests only
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

// Test result tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: []
};

/**
 * Run a test file
 * @param {string} testFile - Path to test file
 * @returns {Promise<Object>} Test results
 */
async function runTestFile(testFile) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const startTime = Date.now();
    
    const child = exec(`node "${testFile}"`, {
      timeout: 60000,
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      resolve({
        file: path.basename(testFile),
        path: testFile,
        success: code === 0,
        duration,
        stdout,
        stderr
      });
    });
  });
}

/**
 * Find all test files
 * @param {string} dir - Directory to search
 * @param {string} pattern - File pattern
 * @returns {Array<string>} Test files
 */
function findTestFiles(dir, pattern = '.test.js') {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath, pattern));
    } else if (item.endsWith(pattern)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Print test header
 */
function printHeader() {
  console.log(`
${colors.blue}╔══════════════════════════════════════════════════════════════╗${colors.reset}
${colors.blue}║${colors.reset}           🧪 Marvin Automation Test Suite                    ${colors.blue}║${colors.reset}
${colors.blue}╚══════════════════════════════════════════════════════════════╝${colors.reset}
  `);
}

/**
 * Print test results
 */
function printResults() {
  console.log(`\n${colors.blue}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                      Test Summary${colors.reset}`);
  console.log(`${colors.blue}══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  for (const suite of results.suites) {
    const status = suite.success 
      ? `${colors.green}✅ PASS${colors.reset}` 
      : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`  ${status} ${suite.file} ${colors.gray}(${suite.duration}ms)${colors.reset}`);
    
    if (!suite.success && suite.stderr) {
      console.log(`     ${colors.red}${suite.stderr.split('\n')[0]}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.blue}──────────────────────────────────────────────────────────────${colors.reset}`);
  
  const totalStr = `${colors.blue}Total:${colors.reset}  ${results.total}`;
  const passedStr = `${colors.green}Passed:${colors.reset} ${results.passed}`;
  const failedStr = results.failed > 0 
    ? `${colors.red}Failed:${colors.reset} ${results.failed}` 
    : `${colors.gray}Failed:${colors.reset} 0`;
  
  console.log(`  ${totalStr}  |  ${passedStr}  |  ${failedStr}`);
  
  console.log(`${colors.blue}──────────────────────────────────────────────────────────────${colors.reset}\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}❌ Tests failed${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

/**
 * Main test runner
 */
async function main() {
  const args = process.argv.slice(2);
  const smokeOnly = args.includes('--smoke');
  const unitOnly = args.includes('--unit');
  const integrationOnly = args.includes('--integration');
  
  printHeader();
  
  let testFiles = [];
  
  if (smokeOnly) {
    console.log(`${colors.yellow}Running smoke tests only...${colors.reset}\n`);
    testFiles = findTestFiles(path.join(__dirname, 'integration'))
      .filter(f => f.includes('smoke'));
  } else if (unitOnly) {
    console.log(`${colors.yellow}Running unit tests only...${colors.reset}\n`);
    testFiles = findTestFiles(path.join(__dirname, 'unit'));
  } else if (integrationOnly) {
    console.log(`${colors.yellow}Running integration tests only...${colors.reset}\n`);
    testFiles = findTestFiles(path.join(__dirname, 'integration'));
  } else {
    console.log(`${colors.yellow}Running all tests...${colors.reset}\n`);
    testFiles = [
      ...findTestFiles(path.join(__dirname, 'unit')),
      ...findTestFiles(path.join(__dirname, 'integration'))
    ];
  }
  
  if (testFiles.length === 0) {
    console.log(`${colors.yellow}No test files found${colors.reset}\n`);
    return;
  }
  
  console.log(`Found ${testFiles.length} test file(s)\n`);
  
  // Run tests sequentially to avoid conflicts
  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);
    results.suites.push(result);
    results.total++;
    
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  printResults();
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
