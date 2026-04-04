const { chromium } = require('playwright');

/**
 * HEB Cart with Browser Fingerprint Randomization
 * 
 * Anti-detection measures for HEB automation:
 * - User-Agent rotation
 * - Viewport randomization
 * - Timezone/locale matching
 * - Device memory/CPU core randomization
 * - Webdriver detection evasion
 * - Plugin/language spoofing
 * 
 * Usage: node heb-cart-fingerprint.js
 */

// Common Chrome/Edge User-Agent strings (Windows)
const USER_AGENTS = [
  // Chrome 120-130 (Windows 10/11)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Edge versions
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
];

// Random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random item from array
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate random User-Agent
function randomUserAgent() {
  return randomChoice(USER_AGENTS);
}

// Generate random viewport dimensions (1920x1080 ± 50px)
function randomViewport() {
  const baseWidth = 1920;
  const baseHeight = 1080;
  const variance = 50;
  
  return {
    width: baseWidth + randomInt(-variance, variance),
    height: baseHeight + randomInt(-variance, variance)
  };
}

// Generate random device memory (4-16 GB, Chrome standard values)
function randomDeviceMemory() {
  const values = [4, 8, 16];
  return randomChoice(values);
}

// Generate random CPU cores (4-8)
function randomHardwareConcurrency() {
  return randomInt(4, 8);
}

// Create realistic plugin array
function getPlugins() {
  return [
    {
      name: "Chrome PDF Plugin",
      filename: "internal-pdf-viewer",
      description: "Portable Document Format",
      version: undefined,
      length: 1,
      item: () => null,
      namedItem: () => null
    },
    {
      name: "Native Client",
      filename: "native-client.nmf",
      description: "Native Client module",
      version: undefined,
      length: 2,
      item: () => null,
      namedItem: () => null
    }
  ];
}

// Anti-detection script to run in page context
function getAntiDetectionScript(deviceMemory, hardwareConcurrency) {
  return `
    // Disable webdriver detection - must run before any page scripts
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      enumerable: false,
      configurable: true
    });
    
    // Also try to delete it
    try {
      delete navigator.webdriver;
    } catch(e) {}
    
    // Override chrome automation
    if (window.navigator.webdriver !== undefined) {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        enumerable: false,
        configurable: true
      });
    }
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: function() {
        return [
          {
            name: "Chrome PDF Plugin",
            filename: "internal-pdf-viewer",
            description: "Portable Document Format",
            length: 1,
            item: function(idx) { return this[idx]; },
            namedItem: function(name) { return null; }
          },
          {
            name: "Native Client",
            filename: "native-client.nmf",
            description: "Native Client module",
            length: 2,
            item: function(idx) { return this[idx]; },
            namedItem: function(name) { return null; }
          }
        ];
      },
      configurable: true
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: function() {
        return ['en-US', 'en'];
      },
      configurable: true
    });
    
    // Set device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: function() {
        return ${deviceMemory};
      },
      configurable: true
    });
    
    // Set hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: function() {
        return ${hardwareConcurrency};
      },
      configurable: true
    });
    
    // Chrome runtime checks
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || {};
    
    // Permission denial simulation
    const originalQuery = window.navigator.permissions.query;
    if (originalQuery) {
      window.navigator.permissions.query = function(parameters) {
        return Promise.resolve({
          state: 'prompt',
          onchange: null
        });
      };
    }
    
    // Override notification permission
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default'
    });
  `;
}

// Sleep utility
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Test fingerprint on httpbin.org/headers
async function testFingerprintOnHttpbin(browser, fingerprint) {
  console.log('\n📡 Testing fingerprint on httpbin.org/headers...\n');
  
  const context = await browser.newContext({
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive'
    }
  });
  
  const page = await context.newPage();
  
  // Inject anti-detection script
  await page.addInitScript(getAntiDetectionScript(fingerprint.deviceMemory, fingerprint.hardwareConcurrency));
  
  // Navigate to httpbin
  await page.goto('https://httpbin.org/headers');
  await sleep(2000);
  
  // Extract headers
  const responseText = await page.locator('body pre').textContent();
  const headers = JSON.parse(responseText);
  
  console.log('✅ Headers received from httpbin.org:');
  console.log('─'.repeat(60));
  for (const [key, value] of Object.entries(headers.headers)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('─'.repeat(60));
  
  // Verify key headers
  const checks = {
    'User-Agent': headers.headers['User-Agent'] === fingerprint.userAgent,
    'Accept-Language': headers.headers['Accept-Language'].includes('en-US'),
    'Accept': headers.headers['Accept'].includes('text/html'),
  };
  
  console.log('\n✅ Header verification:');
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✓' : '✗'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
  }
  
  await context.close();
  
  return checks;
}

// Test on HEB.com
async function testOnHEB(browser, fingerprint) {
  console.log('\n🛒 Testing fingerprint on HEB.com...\n');
  
  const context = await browser.newContext({
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive'
    }
  });
  
  const page = await context.newPage();
  
  // Inject anti-detection script
  await page.addInitScript(getAntiDetectionScript(fingerprint.deviceMemory, fingerprint.hardwareConcurrency));
  
  // Additional CDP-based anti-detection for HEB test
  try {
    const client = await page.context().newCDPSession(page);
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          enumerable: false,
          configurable: true
        });
      `
    });
  } catch(e) {
    // CDP not available, init script should still work
  }
  
  // Suppress CORS/analytics errors - they're expected
  page.on('console', msg => {
    const text = msg.text();
    // Only log relevant errors (bot detection, etc)
    if ((msg.type() === 'error' && (text.includes('bot') || text.includes('detect') || text.includes('captcha'))) ||
        text.includes('challenge')) {
      console.log(`   [Page Console] ${msg.type()}: ${text.substring(0, 100)}`);
    }
  });
  
  // Navigate to HEB
  console.log('   Navigating to HEB.com...');
  try {
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
  } catch (e) {
    console.log(`   Navigation warning: ${e.message}`);
  }
  
  // Check for bot detection indicators
  let pageContent = '';
  try {
    pageContent = await page.content();
  } catch (e) {
    console.log('   Could not get page content');
  }
  
  const botIndicators = [
    'captcha',
    'robot',
    'bot detected',
    'access denied',
    'blocked',
    'challenge'
  ];
  
  const detectedBotTerms = botIndicators.filter(term => 
    pageContent.toLowerCase().includes(term.toLowerCase())
  );
  
  // Get page title
  let title = '';
  try {
    title = await page.title();
    console.log(`   Page title: ${title}`);
  } catch (e) {
    console.log('   Could not get page title');
  }
  
  // Verify navigator properties via page.evaluate with timeout
  let navigatorInfo = {};
  try {
    navigatorInfo = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        webdriver: navigator.webdriver,
        deviceMemory: navigator.deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
        languages: Array.from(navigator.languages || []),
        pluginsLength: navigator.plugins ? navigator.plugins.length : 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    });
    
    console.log('\n   Navigator properties detected:');
    console.log(`     - User-Agent: ${navigatorInfo.userAgent ? navigatorInfo.userAgent.substring(0, 70) + '...' : 'N/A'}`);
    console.log(`     - Webdriver: ${navigatorInfo.webdriver}`);
    console.log(`     - Device Memory: ${navigatorInfo.deviceMemory} GB`);
    console.log(`     - Hardware Concurrency: ${navigatorInfo.hardwareConcurrency} cores`);
    console.log(`     - Languages: ${navigatorInfo.languages ? navigatorInfo.languages.join(', ') : 'N/A'}`);
    console.log(`     - Plugins: ${navigatorInfo.pluginsLength}`);
    console.log(`     - Timezone: ${navigatorInfo.timezone}`);
  } catch (e) {
    console.log(`   Could not get navigator info: ${e.message}`);
  }
  
  // Success criteria
  const success = (
    !navigatorInfo.webdriver &&
    navigatorInfo.deviceMemory === fingerprint.deviceMemory &&
    navigatorInfo.hardwareConcurrency === fingerprint.hardwareConcurrency &&
    detectedBotTerms.length === 0 &&
    title.toLowerCase().includes('heb')
  );
  
  console.log('\n' + (success ? '✅ HEB Test PASSED' : '❌ HEB Test FAILED'));
  
  if (detectedBotTerms.length > 0) {
    console.log(`   Bot detection terms found: ${detectedBotTerms.join(', ')}`);
  }
  
  await context.close();
  
  return { success, navigatorInfo, detectedBotTerms };
}

// Main function
async function main() {
  console.log('🔒 HEB Browser Fingerprint Randomization');
  console.log('═'.repeat(60));
  
  // Generate fingerprint
  const fingerprint = {
    userAgent: randomUserAgent(),
    viewport: randomViewport(),
    deviceMemory: randomDeviceMemory(),
    hardwareConcurrency: randomHardwareConcurrency(),
    timezoneId: 'America/Chicago',
    locale: 'en-US'
  };
  
  console.log('\n🎲 Generated Fingerprint:');
  console.log('─'.repeat(40));
  console.log(`   User-Agent: ${fingerprint.userAgent.substring(0, 70)}...`);
  console.log(`   Viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
  console.log(`   Device Memory: ${fingerprint.deviceMemory} GB`);
  console.log(`   CPU Cores: ${fingerprint.hardwareConcurrency}`);
  console.log(`   Timezone: ${fingerprint.timezoneId}`);
  console.log(`   Locale: ${fingerprint.locale}`);
  console.log('─'.repeat(40));
  
  // Launch browser
  console.log('\n🚀 Launching Edge browser...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-features=AutomationControlled'
    ]
  });
  
  try {
    // Test 1: httpbin.org/headers
    const httpbinResults = await testFingerprintOnHttpbin(browser, fingerprint);
    
    // Test 2: HEB.com
    const hebResults = await testOnHEB(browser, fingerprint);
    
    // Final report
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL REPORT');
    console.log('═'.repeat(60));
    console.log('\n🎲 Fingerprint Used:');
    console.log(`   User-Agent: ${fingerprint.userAgent}`);
    console.log(`   Viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
    console.log(`   Device Memory: ${fingerprint.deviceMemory} GB`);
    console.log(`   Hardware Concurrency: ${fingerprint.hardwareConcurrency}`);
    console.log(`   Timezone: ${fingerprint.timezoneId}`);
    console.log(`   Locale: ${fingerprint.locale}`);
    
    console.log('\n✅ httpbin.org/headers Test:');
    const httpbinPass = Object.values(httpbinResults).every(v => v);
    console.log(`   Status: ${httpbinPass ? 'PASS ✓' : 'PARTIAL ⚠'}`);
    
    console.log('\n🛒 HEB.com Test:');
    console.log(`   Status: ${hebResults.success ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`   Webdriver detected: ${hebResults.navigatorInfo.webdriver === undefined ? 'No' : 'Yes'}`);
    console.log(`   Device memory spoofed: ${hebResults.navigatorInfo.deviceMemory === fingerprint.deviceMemory ? 'Yes' : 'No'}`);
    console.log(`   Bot terms found: ${hebResults.detectedBotTerms.length > 0 ? hebResults.detectedBotTerms.join(', ') : 'None'}`);
    
    const overallSuccess = httpbinPass && hebResults.success;
    console.log('\n' + '═'.repeat(60));
    console.log(`🎯 OVERALL: ${overallSuccess ? 'SUCCESS ✓' : 'FAILED ✗'}`);
    console.log('═'.repeat(60));
    
    return { success: overallSuccess, fingerprint, hebResults };
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    return { success: false, error: error.message, fingerprint };
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { 
  randomUserAgent, 
  randomViewport, 
  randomDeviceMemory, 
  randomHardwareConcurrency,
  getAntiDetectionScript,
  main 
};
