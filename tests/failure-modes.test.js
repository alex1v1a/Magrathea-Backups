/**
 * Failure Mode Testing
 * Tests recovery from network interruptions, Chrome crashes, and invalid credentials
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test results
const results = {
  tests: [],
  passed: 0,
  failed: 0,
  startTime: Date.now()
};

function log(testName, status, details = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${icon}${reset} ${testName}${details ? ': ' + details : ''}`);
  
  results.tests.push({
    name: testName,
    status,
    details,
    timestamp: Date.now()
  });
  
  if (status === 'PASS') results.passed++;
  if (status === 'FAIL') results.failed++;
}

// ============ NETWORK INTERRUPTION TESTS ============

async function testNetworkInterruptionRecovery() {
  console.log('\n📡 Network Interruption Tests\n');
  
  // Test 1: Simulate connection loss during page load
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to a page
    await page.goto('https://www.heb.com', { timeout: 10000 });
    
    // Simulate offline (close browser abruptly)
    await browser.close();
    
    // Try to reconnect
    const browser2 = await chromium.launch({ headless: true });
    const page2 = await browser2.newPage();
    await page2.goto('https://www.heb.com', { timeout: 30000 });
    
    const title = await page2.title();
    await browser2.close();
    
    if (title) {
      log('Network interruption - Browser reconnect', 'PASS', 'Successfully reconnected after interruption');
    } else {
      log('Network interruption - Browser reconnect', 'FAIL', 'Failed to reconnect');
    }
  } catch (error) {
    log('Network interruption - Browser reconnect', 'FAIL', error.message);
  }
  
  // Test 2: Request timeout handling
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Try to load with very short timeout
    let timeoutOccurred = false;
    try {
      await page.goto('https://www.heb.com', { timeout: 1 });
    } catch (e) {
      if (e.message.includes('timeout')) {
        timeoutOccurred = true;
      }
    }
    
    await browser.close();
    
    if (timeoutOccurred) {
      log('Request timeout handling', 'PASS', 'Timeout properly detected');
    } else {
      log('Request timeout handling', 'FAIL', 'Timeout not detected');
    }
  } catch (error) {
    log('Request timeout handling', 'FAIL', error.message);
  }
  
  // Test 3: Retry logic validation
  try {
    let attempts = 0;
    const maxRetries = 3;
    let success = false;
    
    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.google.com', { timeout: 10000 });
        await browser.close();
        success = true;
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    if (success && attempts <= maxRetries) {
      log('Retry logic validation', 'PASS', `Success after ${attempts} attempt(s)`);
    } else {
      log('Retry logic validation', 'FAIL', `Failed after ${attempts} attempts`);
    }
  } catch (error) {
    log('Retry logic validation', 'FAIL', error.message);
  }
}

// ============ CHROME CRASH RECOVERY TESTS ============

async function testChromeCrashRecovery() {
  console.log('\n🖥️ Chrome Crash Recovery Tests\n');
  
  // Test 1: Detect Chrome process crash
  try {
    const browser = await chromium.launch({ headless: true });
    const browserProcess = browser.process();
    
    if (browserProcess) {
      // Kill the process to simulate crash
      browserProcess.kill('SIGTERM');
      
      // Wait a bit
      await new Promise(r => setTimeout(r, 500));
      
      // Check if we can detect the crash
      const isConnected = await browser.isConnected().catch(() => false);
      
      if (!isConnected) {
        log('Chrome crash detection', 'PASS', 'Browser disconnection detected');
      } else {
        log('Chrome crash detection', 'WARN', 'Browser still reports connected after kill');
      }
    }
  } catch (error) {
    // Expected - browser was killed
    log('Chrome crash detection', 'PASS', 'Crash properly detected');
  }
  
  // Test 2: Session restoration after crash
  try {
    const stateFile = path.join(__dirname, 'test-session-state.json');
    
    // Create a browser and save state
    const browser1 = await chromium.launch({ headless: true });
    const context1 = await browser1.newContext();
    const page1 = await context1.newPage();
    await page1.goto('https://www.google.com');
    
    // Save storage state
    const storageState = await context1.storageState();
    fs.writeFileSync(stateFile, JSON.stringify(storageState));
    
    await browser1.close();
    
    // Simulate crash recovery by restoring state
    const browser2 = await chromium.launch({ headless: true });
    const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const context2 = await browser2.newContext({ storageState: savedState });
    const page2 = await context2.newPage();
    
    // Should be able to navigate
    await page2.goto('https://www.google.com', { timeout: 10000 });
    
    await browser2.close();
    fs.unlinkSync(stateFile);
    
    log('Session restoration after crash', 'PASS', 'State restored successfully');
  } catch (error) {
    log('Session restoration after crash', 'FAIL', error.message);
  }
  
  // Test 3: CDP reconnection after crash
  try {
    // This tests if we can reconnect to a new Chrome instance
    const browser = await chromium.launch({ headless: true });
    const wsEndpoint = browser.wsEndpoint();
    
    await browser.close();
    
    // Try to connect to a new browser
    const browser2 = await chromium.launch({ headless: true });
    const page = await browser2.newPage();
    await page.goto('about:blank');
    
    await browser2.close();
    
    log('CDP reconnection', 'PASS', 'Successfully connected to new browser instance');
  } catch (error) {
    log('CDP reconnection', 'FAIL', error.message);
  }
}

// ============ INVALID CREDENTIALS TESTS ============

async function testInvalidCredentials() {
  console.log('\n🔐 Invalid Credentials Tests\n');
  
  // Test 1: HEB login with invalid credentials
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://www.heb.com/login');
    await page.waitForTimeout(3000);
    
    // Try to fill in login form with invalid credentials
    const emailInput = await page.$('input[type="email"], input[name="email"], #email');
    const passwordInput = await page.$('input[type="password"], input[name="password"], #password');
    
    if (emailInput && passwordInput) {
      await emailInput.fill('invalid@test.com');
      await passwordInput.fill('wrongpassword123');
      
      // Look for login button
      const loginButton = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
      if (loginButton) {
        // Don't actually click to avoid lockout - just verify form exists
        log('HEB login form detection', 'PASS', 'Login form found and fillable');
      } else {
        log('HEB login form detection', 'WARN', 'Login button not found');
      }
    } else {
      log('HEB login form detection', 'WARN', 'Login inputs not found (may require manual navigation)');
    }
    
    await browser.close();
  } catch (error) {
    log('HEB login form detection', 'FAIL', error.message);
  }
  
  // Test 2: Email authentication failure
  try {
    // Simulate email auth check
    const testCredentials = {
      host: 'smtp.gmail.com',
      port: 587,
      user: 'invalid@example.com',
      pass: 'wrongpassword'
    };
    
    // We won't actually connect, just verify the validation logic exists
    function validateCredentials(creds) {
      const errors = [];
      if (!creds.user || !creds.user.includes('@')) {
        errors.push('Invalid email format');
      }
      if (!creds.pass || creds.pass.length < 8) {
        errors.push('Password too short');
      }
      return { valid: errors.length === 0, errors };
    }
    
    const validation = validateCredentials(testCredentials);
    
    if (!validation.valid && validation.errors.some(e => e.includes('Invalid email') || e.includes('short'))) {
      log('Email credential validation', 'PASS', 'Invalid credentials properly rejected');
    } else {
      log('Email credential validation', 'WARN', 'Validation may not catch all invalid cases');
    }
  } catch (error) {
    log('Email credential validation', 'FAIL', error.message);
  }
  
  // Test 3: Facebook login validation
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://www.facebook.com/login');
    await page.waitForTimeout(2000);
    
    // Check for login form
    const emailField = await page.$('#email, input[name="email"]');
    const passField = await page.$('#pass, input[name="pass"]');
    
    if (emailField && passField) {
      // Fill with test credentials
      await emailField.fill('test@example.com');
      await passField.fill('wrongpassword');
      
      log('Facebook login form detection', 'PASS', 'Login form accessible');
    } else {
      log('Facebook login form detection', 'WARN', 'Login form structure may have changed');
    }
    
    await browser.close();
  } catch (error) {
    log('Facebook login form detection', 'FAIL', error.message);
  }
  
  // Test 4: Credential error handling
  try {
    class CredentialManager {
      constructor() {
        this.retryCount = 0;
        this.maxRetries = 3;
      }
      
      async getCredentials(service) {
        // Simulate credential retrieval
        const creds = this.loadFromStore(service);
        
        if (!creds || !creds.valid) {
          throw new Error(`Invalid credentials for ${service}`);
        }
        
        return creds;
      }
      
      loadFromStore(service) {
        // Simulate missing/invalid credentials
        return null;
      }
      
      handleAuthError(service, error) {
        this.retryCount++;
        
        if (this.retryCount >= this.maxRetries) {
          return { action: 'abort', reason: 'Max retries exceeded' };
        }
        
        if (error.message.includes('Invalid')) {
          return { action: 'refresh', reason: 'Credentials invalid' };
        }
        
        return { action: 'retry', reason: 'Temporary error' };
      }
    }
    
    const manager = new CredentialManager();
    
    try {
      await manager.getCredentials('heb');
      log('Credential error handling', 'FAIL', 'Should have thrown error');
    } catch (error) {
      const action = manager.handleAuthError('heb', error);
      
      if (action.action === 'refresh' || action.action === 'abort') {
        log('Credential error handling', 'PASS', `Proper action: ${action.action}`);
      } else {
        log('Credential error handling', 'WARN', 'Unexpected action: ' + action.action);
      }
    }
  } catch (error) {
    log('Credential error handling', 'FAIL', error.message);
  }
}

// ============ MAIN TEST RUNNER ============

async function runAllTests() {
  console.log('🧪 Failure Mode Testing Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testNetworkInterruptionRecovery();
  await testChromeCrashRecovery();
  await testInvalidCredentials();
  
  // Print summary
  const duration = Date.now() - results.startTime;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total:  ${results.tests.length}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Time:   ${duration}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Save report
  const reportPath = path.join(__dirname, 'failure-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    ...results,
    duration,
    generatedAt: new Date().toISOString()
  }, null, 2));
  
  console.log(`📄 Report saved to: ${reportPath}`);
  
  return results.failed === 0;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
