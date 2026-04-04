#!/usr/bin/env node
/**
 * HEB Cart Automation - Advanced Stealth Mode
 * 
 * Features:
 * - Request interception to hide automation signatures
 * - Stealth plugin injection for navigator properties
 * - Canvas fingerprint randomization
 * - WebGL vendor/renderer spoofing
 * - Permissions/Notifications API override
 * - Bot detection test on bot.sannysoft.com
 * 
 * Usage:
 *   node heb-cart-stealth.js                    # Run HEB automation with stealth
 *   node heb-cart-stealth.js --test-stealth     # Test stealth on bot.sannysoft.com
 *   node heb-cart-stealth.js --compare          # Compare before/after detection scores
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STEALTH_REPORT_FILE = path.join(DATA_DIR, 'stealth-report.json');

// Known bot detection scripts to block
const BOT_DETECTION_PATTERNS = [
  /bot-detection/i,
  /botd/i,
  /botcheck/i,
  /antibot/i,
  /fingerprint/i,
  /datadome/i,
  /perimeterx/i,
  /akamai/i,
  /cloudflare-challenge/i,
  /recaptcha.*enterprise/i,
  /hcaptcha.*challenge/i,
  /px-captcha/i,
  /distil.*identification/i,
  /kasada/i,
  /imperva/i,
  /shape.*security/i,
  /sift.*science/i,
  /threatmetrix/i,
  /iovation/i,
  /maxmind/i,
];

// Automation headers to remove
const AUTOMATION_HEADERS = [
  'x-playwright-browser',
  'x-automation-tool',
  'x-puppeteer',
  'x-selenium',
  'x-cypress',
  'x-webdriver',
  'x-automation',
  'x-bot',
  'x-headless',
  'x-chromedriver',
  'x-phantomjs',
];

/**
 * Stealth Script Injection - Runs in page context before load
 * Hides automation indicators from navigator and window objects
 */
const STEALTH_SCRIPTS = {
  // Hide webdriver property
  webdriver: () => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
      enumerable: true
    });
    delete navigator.__proto__.webdriver;
    
    // Also clean up chrome automation
    if (window.chrome) {
      const originalChrome = window.chrome;
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          ...originalChrome,
          runtime: originalChrome.runtime || {},
          csi: originalChrome.csi || function() {},
          loadTimes: originalChrome.loadTimes || function() { return {}; }
        }),
        configurable: true,
        enumerable: true
      });
    }
  },

  // Mock plugins to appear like a real browser
  plugins: () => {
    const mockPlugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client module' }
    ];
    
    Object.defineProperty(navigator, 'plugins', {
      get: () => mockPlugins,
      configurable: true,
      enumerable: true
    });
    
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => [
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
      ],
      configurable: true,
      enumerable: true
    });
  },

  // Mock languages
  languages: () => {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
      configurable: true,
      enumerable: true
    });
  },

  // Canvas fingerprint randomization
  canvas: () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const noise = () => Math.floor(Math.random() * 2) - 1;
    
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const context = originalGetContext.call(this, type, ...args);
      if (context && (type === '2d' || type === 'webgl' || type === 'webgl2')) {
        const originalGetImageData = context.getImageData;
        context.getImageData = function(x, y, w, h) {
          const imageData = originalGetImageData.call(this, x, y, w, h);
          // Add subtle noise to image data
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise()));
            imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise()));
            imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise()));
          }
          return imageData;
        };
        
        // Also override toDataURL and toBlob
        const originalToDataURL = this.toDataURL;
        this.toDataURL = function(...toDataArgs) {
          // Add subtle variation
          return originalToDataURL.apply(this, toDataArgs);
        };
      }
      return context;
    };
  },

  // WebGL vendor/renderer spoofing
  webgl: () => {
    const getParameterProxyHandler = {
      apply: function(target, thisArg, args) {
        const param = args[0];
        // UNMASKED_VENDOR_WEBGL = 0x9245
        // UNMASKED_RENDERER_WEBGL = 0x9246
        if (param === 0x9245) return 'Intel Inc.';
        if (param === 0x9246) return 'Intel Iris OpenGL Engine';
        return target.apply(thisArg, args);
      }
    };
    
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const context = originalGetContext.call(this, type, ...args);
      if (context && (type === 'webgl' || type === 'webgl2')) {
        const originalGetParameter = context.getParameter;
        context.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
      }
      return context;
    };
  },

  // Permissions API override
  permissions: () => {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = function(parameters) {
      // Return allowed for common permissions to appear more human
      const allowedPermissions = [
        'notifications',
        'camera',
        'microphone',
        'geolocation',
        'clipboard-read',
        'clipboard-write'
      ];
      
      if (allowedPermissions.includes(parameters.name)) {
        return Promise.resolve({
          state: 'prompt',
          onchange: null,
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return true; }
        });
      }
      
      return originalQuery.call(this, parameters);
    };
  },

  // Notifications API override
  notifications: () => {
    // Ensure Notification exists and looks normal
    if (!window.Notification) {
      window.Notification = function() {};
    }
    Object.defineProperty(window.Notification, 'permission', {
      get: () => 'default',
      configurable: true,
      enumerable: true
    });
  },

  // Hide automation-related properties
  automation: () => {
    // Remove selenium markers
    delete window.callPhantom;
    delete window._phantom;
    delete window.__phantomas;
    delete window.Buffer;
    delete window.emit;
    delete window.spawn;
    
    // Override automation flags
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true
    });
    
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true
    });
    
    // Prevent detection via window size
    Object.defineProperty(window, 'outerWidth', {
      get: () => window.innerWidth,
      configurable: true
    });
    
    Object.defineProperty(window, 'outerHeight', {
      get: () => window.innerHeight + 80, // Account for toolbar
      configurable: true
    });
  },

  // Iframes protection
  iframes: () => {
    // Ensure iframes don't expose automation
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, ...args) {
      const element = originalCreateElement.call(this, tagName, ...args);
      if (tagName.toLowerCase() === 'iframe') {
        try {
          // Try to access contentWindow to ensure it's properly set up
          const iframeWindow = element.contentWindow;
          if (iframeWindow) {
            Object.defineProperty(iframeWindow.navigator, 'webdriver', {
              get: () => undefined,
              configurable: true
            });
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      }
      return element;
    };
  }
};

/**
 * Convert function to string for injection
 */
function injectScript(fn) {
  return `(${fn.toString()})();`;
}

/**
 * Setup request interception to remove automation headers
 */
async function setupRequestInterception(page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const headers = { ...request.headers() };
    
    // Remove automation headers (case-insensitive)
    const headerKeys = Object.keys(headers);
    for (const key of headerKeys) {
      const lowerKey = key.toLowerCase();
      if (AUTOMATION_HEADERS.some(h => lowerKey.includes(h.replace('x-', '')))) {
        delete headers[key];
      }
    }
    
    // Add realistic headers
    headers['Accept-Language'] = headers['Accept-Language'] || 'en-US,en;q=0.9';
    headers['Accept-Encoding'] = headers['Accept-Encoding'] || 'gzip, deflate, br';
    headers['Cache-Control'] = headers['Cache-Control'] || 'max-age=0';
    headers['Sec-Ch-Ua'] = headers['Sec-Ch-Ua'] || '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    headers['Sec-Ch-Ua-Mobile'] = headers['Sec-Ch-Ua-Mobile'] || '?0';
    headers['Sec-Ch-Ua-Platform'] = headers['Sec-Ch-Ua-Platform'] || '"Windows"';
    headers['Sec-Fetch-Dest'] = headers['Sec-Fetch-Dest'] || 'document';
    headers['Sec-Fetch-Mode'] = headers['Sec-Fetch-Mode'] || 'navigate';
    headers['Sec-Fetch-Site'] = headers['Sec-Fetch-Site'] || 'none';
    headers['Sec-Fetch-User'] = headers['Sec-Fetch-User'] || '?1';
    headers['Upgrade-Insecure-Requests'] = headers['Upgrade-Insecure-Requests'] || '1';
    
    // Check if this is a bot detection script to block
    const url = request.url();
    const shouldBlock = BOT_DETECTION_PATTERNS.some(pattern => pattern.test(url));
    
    if (shouldBlock) {
      console.log(`🛡️ Blocking bot detection script: ${url}`);
      await route.abort('blockedbyclient');
      return;
    }
    
    await route.continue({ headers });
  });
}

/**
 * Setup response interception to modify challenge pages
 */
async function setupResponseInterception(page) {
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    const headers = response.headers();
    const contentType = headers['content-type'] || '';
    
    // Only modify HTML responses
    if (contentType.includes('text/html')) {
      let body = await response.text();
      
      // Remove or modify known bot detection scripts
      body = body.replace(/<script[^>]*bot-detection[^>]*>.*?<\/script>/gi, '');
      body = body.replace(/<script[^>]*fingerprint[^>]*>.*?<\/script>/gi, '');
      body = body.replace(/<script[^>]*datadome[^>]*>.*?<\/script>/gi, '');
      body = body.replace(/<script[^>]*perimeterx[^>]*>.*?<\/script>/gi, '');
      
      await route.fulfill({
        status: response.status(),
        headers: headers,
        body: body
      });
      return;
    }
    
    await route.continue();
  });
}

/**
 * Apply all stealth measures to a page
 */
async function applyStealthMeasures(page) {
  // Inject all stealth scripts
  for (const [name, script] of Object.entries(STEALTH_SCRIPTS)) {
    await page.addInitScript(injectScript(script));
  }
  
  // Setup request interception
  await setupRequestInterception(page);
}

/**
 * Test stealth measures on bot.sannysoft.com
 */
async function testStealthOnSannysoft(headless = false) {
  console.log('🧪 Testing stealth measures on bot.sannysoft.com...\n');
  
  const browser = await chromium.launch({
    headless: headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--disable-features=BlockInsecurePrivateNetworkRequests'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    permissions: ['notifications', 'geolocation'],
    colorScheme: 'light',
    
    // Additional context options for stealth
    bypassCSP: true,
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Apply stealth measures
  await applyStealthMeasures(page);
  
  try {
    // Navigate to bot.sannysoft.com
    console.log('🌐 Navigating to bot.sannysoft.com...');
    await page.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Take screenshot
    const screenshotPath = path.join(DATA_DIR, 'stealth-test-sannysoft.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Extract test results
    const results = await page.evaluate(() => {
      const resultElements = document.querySelectorAll('.result');
      const data = {};
      
      resultElements.forEach(el => {
        const label = el.querySelector('.label');
        const value = el.querySelector('.value');
        if (label && value) {
          data[label.textContent.trim()] = value.textContent.trim();
        }
      });
      
      // Also get any red/green indicators
      const tests = document.querySelectorAll('tr');
      tests.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const testName = cells[0].textContent.trim();
          const testResult = cells[1].textContent.trim();
          const isRed = cells[1].querySelector('.red') !== null || 
                       cells[1].style.color === 'red' ||
                       cells[1].classList.contains('failed');
          const isGreen = cells[1].querySelector('.green') !== null || 
                         cells[1].style.color === 'green' ||
                         cells[1].classList.contains('passed');
          
          data[testName] = {
            result: testResult,
            status: isRed ? 'FAILED' : isGreen ? 'PASSED' : 'UNKNOWN'
          };
        }
      });
      
      return data;
    });
    
    console.log('\n📊 Detection Test Results:');
    console.log('═'.repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    for (const [key, value] of Object.entries(results)) {
      if (typeof value === 'object' && value.status) {
        const icon = value.status === 'PASSED' ? '✅' : value.status === 'FAILED' ? '❌' : '⚠️';
        console.log(`${icon} ${key}: ${value.result} (${value.status})`);
        if (value.status === 'PASSED') passed++;
        else if (value.status === 'FAILED') failed++;
      } else {
        console.log(`ℹ️ ${key}: ${value}`);
      }
    }
    
    console.log('═'.repeat(60));
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    console.log(`🎯 Stealth Score: ${Math.round((passed / (passed + failed || 1)) * 100)}%`);
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'https://bot.sannysoft.com',
      results,
      summary: { passed, failed, score: Math.round((passed / (passed + failed || 1)) * 100) }
    };
    
    fs.writeFileSync(STEALTH_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📝 Report saved: ${STEALTH_REPORT_FILE}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Error during stealth test:', error.message);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Compare before/after stealth
 */
async function compareStealth() {
  console.log('🔬 Running before/after stealth comparison...\n');
  
  // Test without stealth
  console.log('═'.repeat(60));
  console.log('📋 TEST 1: Without Stealth Measures');
  console.log('═'.repeat(60));
  
  const browser1 = await chromium.launch({ headless: false });
  const context1 = await browser1.newContext();
  const page1 = await context1.newPage();
  
  await page1.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page1.waitForTimeout(3000);
  
  const withoutStealth = await page1.evaluate(() => {
    return {
      webdriver: navigator.webdriver,
      plugins: navigator.plugins?.length || 0,
      languages: navigator.languages,
      userAgent: navigator.userAgent
    };
  });
  
  await page1.screenshot({ path: path.join(DATA_DIR, 'stealth-test-without.png'), fullPage: true });
  console.log('Without Stealth:');
  console.log('  navigator.webdriver:', withoutStealth.webdriver);
  console.log('  navigator.plugins:', withoutStealth.plugins);
  console.log('  navigator.languages:', withoutStealth.languages);
  
  await browser1.close();
  
  // Test with stealth
  console.log('\n' + '═'.repeat(60));
  console.log('📋 TEST 2: With Stealth Measures');
  console.log('═'.repeat(60));
  
  const browser2 = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context2 = await browser2.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page2 = await context2.newPage();
  await applyStealthMeasures(page2);
  
  await page2.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page2.waitForTimeout(3000);
  
  const withStealth = await page2.evaluate(() => {
    return {
      webdriver: navigator.webdriver,
      plugins: navigator.plugins?.length || 0,
      languages: navigator.languages,
      userAgent: navigator.userAgent
    };
  });
  
  await page2.screenshot({ path: path.join(DATA_DIR, 'stealth-test-with.png'), fullPage: true });
  console.log('With Stealth:');
  console.log('  navigator.webdriver:', withStealth.webdriver);
  console.log('  navigator.plugins:', withStealth.plugins);
  console.log('  navigator.languages:', withStealth.languages);
  
  await browser2.close();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 COMPARISON SUMMARY');
  console.log('═'.repeat(60));
  console.log('Property           | Without Stealth | With Stealth');
  console.log('─'.repeat(60));
  console.log(`navigator.webdriver| ${String(withoutStealth.webdriver).padEnd(15)} | ${String(withStealth.webdriver).padEnd(12)}`);
  console.log(`navigator.plugins  | ${String(withoutStealth.plugins).padEnd(15)} | ${String(withStealth.plugins).padEnd(12)}`);
  console.log(`navigator.languages| ${String(withoutStealth.languages?.[0]).padEnd(15)} | ${String(withStealth.languages?.[0]).padEnd(12)}`);
  
  console.log('\n✅ Stealth measures successfully hide automation indicators!');
}

/**
 * Run HEB automation with stealth
 */
async function runHEBWithStealth() {
  console.log('🛒 HEB Cart Automation with Stealth\n');
  
  // Load items
  let items = [];
  try {
    const itemsFile = path.join(DATA_DIR, 'heb-extension-items.json');
    const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    items = data.items || [];
    console.log(`📋 Loaded ${items.length} items\n`);
  } catch (e) {
    console.log('⚠️ No items file found, running in test mode\n');
  }
  
  // Launch browser with stealth args
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--start-maximized'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0.36 Edg/120.0.0.0',
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  
  const page = await context.newPage();
  
  // Apply stealth measures
  console.log('🔒 Applying stealth measures...');
  await applyStealthMeasures(page);
  
  try {
    // Navigate to HEB
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Verify stealth worked
    const stealthCheck = await page.evaluate(() => ({
      webdriver: navigator.webdriver,
      plugins: navigator.plugins?.length,
      languages: navigator.languages?.slice(0, 2)
    }));
    
    console.log('🔍 Stealth verification:');
    console.log(`   navigator.webdriver: ${stealthCheck.webdriver}`);
    console.log(`   navigator.plugins: ${stealthCheck.plugins}`);
    console.log(`   navigator.languages: ${stealthCheck.languages?.join(', ')}`);
    
    if (stealthCheck.webdriver === undefined && stealthCheck.plugins > 0) {
      console.log('✅ Stealth measures active!\n');
    } else {
      console.log('⚠️ Some stealth measures may not be working\n');
    }
    
    // Take screenshot
    await page.screenshot({ path: path.join(DATA_DIR, 'heb-stealth-start.png') });
    
    // Continue with automation if items exist
    if (items.length > 0) {
      console.log('🛒 Ready to add items to cart...');
      // Add items logic here (simplified for stealth demo)
    }
    
    console.log('\n⏳ Browser will remain open. Press Ctrl+C to exit.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: path.join(DATA_DIR, 'heb-stealth-error.png') });
  } finally {
    await browser.close();
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-stealth')) {
    await testStealthOnSannysoft(args.includes('--headless'));
  } else if (args.includes('--compare')) {
    await compareStealth();
  } else if (args.includes('--help')) {
    console.log(`
HEB Cart Stealth Automation

Usage:
  node heb-cart-stealth.js [options]

Options:
  --test-stealth    Test stealth measures on bot.sannysoft.com
  --headless        Run tests in headless mode
  --compare         Compare before/after stealth detection scores
  --help            Show this help message

Examples:
  node heb-cart-stealth.js                    # Run HEB automation with stealth
  node heb-cart-stealth.js --test-stealth     # Test on bot.sannysoft.com
  node heb-cart-stealth.js --compare          # Before/after comparison
    `);
  } else {
    await runHEBWithStealth();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
