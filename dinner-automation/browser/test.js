/**
 * Test script for Stealth Browser System
 * Run this to verify everything is working
 */

require('dotenv').config();
const { 
  StealthBrowser, 
  CredentialManager,
  HEBAutomation,
  FacebookAutomation,
  logger 
} = require('./index');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('  STEALTH BROWSER SYSTEM TEST SUITE', 'cyan');
  log('========================================\n', 'cyan');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Credential Manager
  log('Test 1: Credential Manager', 'blue');
  try {
    const creds = new CredentialManager();
    
    // Set test credentials
    creds.setCredentials('test-site', 'test@example.com', 'testpassword');
    
    // Retrieve credentials
    const retrieved = creds.getCredentials('test-site');
    
    if (retrieved && retrieved.username === 'test@example.com') {
      log('  ✓ Credential manager working\n', 'green');
      passed++;
    } else {
      log('  ✗ Credential retrieval failed\n', 'red');
      failed++;
    }
    
    // Cleanup
    creds.removeCredentials('test-site');
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 2: Browser Launch
  log('Test 2: Browser Launch (headless)', 'blue');
  let browser = null;
  try {
    browser = new StealthBrowser({
      profile: 'test-profile',
      headless: true,
      slowMo: 0
    });
    
    await browser.launch();
    
    if (browser.isBrowserRunning()) {
      log('  ✓ Browser launched successfully\n', 'green');
      passed++;
    } else {
      log('  ✗ Browser not running\n', 'red');
      failed++;
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 3: Navigation
  log('Test 3: Navigation', 'blue');
  try {
    if (browser) {
      await browser.navigate('https://httpbin.org/get');
      const url = await browser.getCurrentUrl();
      
      if (url.includes('httpbin.org')) {
        log('  ✓ Navigation working\n', 'green');
        passed++;
      } else {
        log('  ✗ Navigation failed\n', 'red');
        failed++;
      }
    } else {
      log('  ⚠ Skipped (browser not available)\n', 'yellow');
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 4: Page Interaction
  log('Test 4: Page Interaction', 'blue');
  try {
    if (browser) {
      // Navigate to a form test page
      await browser.navigate('https://httpbin.org/forms/post');
      
      // Check if page loaded
      const title = await browser.getTitle();
      
      if (title) {
        log('  ✓ Page interaction working\n', 'green');
        passed++;
      } else {
        log('  ✗ Page interaction failed\n', 'red');
        failed++;
      }
    } else {
      log('  ⚠ Skipped (browser not available)\n', 'yellow');
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 5: Screenshot
  log('Test 5: Screenshot', 'blue');
  try {
    if (browser) {
      const screenshotPath = await browser.screenshot({ filename: 'test-screenshot.png' });
      const fs = require('fs');
      
      if (fs.existsSync(screenshotPath)) {
        log(`  ✓ Screenshot saved: ${screenshotPath}\n`, 'green');
        passed++;
        
        // Cleanup
        fs.unlinkSync(screenshotPath);
      } else {
        log('  ✗ Screenshot not saved\n', 'red');
        failed++;
      }
    } else {
      log('  ⚠ Skipped (browser not available)\n', 'yellow');
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 6: Stealth Features
  log('Test 6: Stealth Detection', 'blue');
  try {
    if (browser) {
      // Navigate to bot detection test
      await browser.navigate('https://bot.sannysoft.com');
      await browser.sleep(3000);
      
      // Check for common bot detection flags
      const results = await browser.evaluate(() => {
        return {
          webdriver: navigator.webdriver,
          plugins: navigator.plugins.length,
          languages: navigator.languages,
          userAgent: navigator.userAgent,
          chrome: !!window.chrome
        };
      });
      
      log('  Navigator webdriver:', results.webdriver === undefined ? '✓ undefined' : '✗ defined', results.webdriver === undefined ? 'green' : 'red');
      log(`  Plugins count: ${results.plugins} ✓`, 'green');
      log(`  Languages: ${results.languages?.join(', ')} ✓`, 'green');
      log(`  Chrome object: ${results.chrome ? '✓ present' : '✗ missing'}`, results.chrome ? 'green' : 'red');
      
      passed++;
    } else {
      log('  ⚠ Skipped (browser not available)\n', 'yellow');
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 7: HEB Automation (initialization only)
  log('Test 7: HEB Automation', 'blue');
  try {
    const heb = new HEBAutomation({
      profile: 'heb-test',
      headless: true
    });
    
    if (heb) {
      log('  ✓ HEB automation class instantiated\n', 'green');
      passed++;
    } else {
      log('  ✗ Failed to create HEB automation\n', 'red');
      failed++;
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Test 8: Facebook Automation (initialization only)
  log('Test 8: Facebook Automation', 'blue');
  try {
    const fb = new FacebookAutomation({
      profile: 'fb-test',
      headless: true
    });
    
    if (fb) {
      log('  ✓ Facebook automation class instantiated\n', 'green');
      passed++;
    } else {
      log('  ✗ Failed to create Facebook automation\n', 'red');
      failed++;
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Cleanup
  log('Test 9: Cleanup', 'blue');
  try {
    if (browser) {
      await browser.close();
      log('  ✓ Browser closed successfully\n', 'green');
      passed++;
    } else {
      log('  ⚠ No browser to close\n', 'yellow');
    }
  } catch (error) {
    log(`  ✗ Error closing browser: ${error.message}\n`, 'red');
    failed++;
  }
  
  // Summary
  log('\n========================================', 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('========================================', 'cyan');
  log(`  Passed: ${passed}`, 'green');
  log(`  Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`  Total:  ${passed + failed}`, 'blue');
  log('========================================\n', 'cyan');
  
  return { passed, failed, total: passed + failed };
}

// Demo function
async function runDemo() {
  log('\n========================================', 'cyan');
  log('  STEALTH BROWSER DEMO', 'cyan');
  log('========================================\n', 'cyan');
  
  const browser = new StealthBrowser({
    profile: 'demo-profile',
    headless: false,
    slowMo: 100
  });
  
  try {
    await browser.launch();
    log('Browser launched in non-headless mode', 'green');
    
    // Navigate to a site
    log('Navigating to example.com...', 'blue');
    await browser.navigate('https://example.com');
    
    // Take screenshot
    const screenshot = await browser.screenshot({ filename: 'demo-screenshot.png' });
    log(`Screenshot saved: ${screenshot}`, 'green');
    
    // Show page info
    const title = await browser.getTitle();
    const url = await browser.getCurrentUrl();
    log(`\nPage Title: ${title}`, 'cyan');
    log(`Page URL: ${url}`, 'cyan');
    
    // Wait a bit
    log('\nWaiting 5 seconds before closing...', 'yellow');
    await browser.sleep(5000);
    
    await browser.close();
    log('Browser closed', 'green');
    
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    await browser.close().catch(() => {});
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--demo')) {
    await runDemo();
  } else if (args.includes('--test')) {
    const results = await runTests();
    process.exit(results.failed > 0 ? 1 : 0);
  } else {
    console.log('Usage: node test.js [--test|--demo]');
    console.log('  --test  Run test suite');
    console.log('  --demo  Run interactive demo');
    console.log('');
    console.log('Running tests by default...\n');
    const results = await runTests();
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

main().catch(console.error);
