/**
 * Run all tests script
 * Convenience wrapper to execute the entire test suite
 */

const { execSync } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✓',
    error: '✗',
    warning: '⚠️',
    start: '▶'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function runTest(testFile, description) {
  console.log(`\n${colors.blue}${colors.bold}${description}${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(50)}${colors.reset}`);
  
  try {
    execSync(`node "${path.join(__dirname, testFile)}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(`${colors.bold}`);
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     DINNER AUTOMATION - TEST SUITE RUNNER        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  const startTime = Date.now();
  const results = [];
  
  // Unit Tests
  log('Running Unit Tests...', 'start');
  
  results.push({
    name: 'Cart Verification',
    ...runTest('tests/cart-verification.test.js', 'CART VERIFICATION TESTS')
  });
  
  results.push({
    name: 'Email Parsing',
    ...runTest('tests/email-parsing.test.js', 'EMAIL PARSING TESTS')
  });
  
  results.push({
    name: 'Calendar Sync',
    ...runTest('tests/calendar-sync.test.js', 'CALENDAR SYNC TESTS')
  });
  
  // Failure Mode Tests
  log('Running Failure Mode Tests...', 'start');
  
  results.push({
    name: 'Failure Modes',
    ...runTest('tests/failure-modes.test.js', 'FAILURE MODE TESTS')
  });
  
  // Summary
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n${colors.bold}`);
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                  TEST SUMMARY                    ║');
  console.log('╠══════════════════════════════════════════════════╣');
  
  results.forEach(r => {
    const status = r.success 
      ? `${colors.green}PASS${colors.reset}` 
      : `${colors.red}FAIL${colors.reset}`;
    console.log(`║  ${r.name.padEnd(30)} ${status.padEnd(15)} ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Total: ${String(results.length).padEnd(5)} Passed: ${colors.green}${String(passed).padEnd(5)}${colors.reset} Failed: ${colors.red}${String(failed).padEnd(5)}${colors.reset} ║`);
  console.log(`║  Duration: ${String(duration + 'ms').padEnd(37)} ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);
  
  if (failed > 0) {
    log('Some tests failed. Check output above for details.', 'error');
    process.exit(1);
  } else {
    log('All tests passed! ✅', 'success');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
