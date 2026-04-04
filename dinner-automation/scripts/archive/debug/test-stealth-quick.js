/**
 * Quick stealth verification test
 * Tests the stealth script injection without opening browser windows
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Stealth scripts (same as in heb-cart-stealth.js)
const STEALTH_SCRIPTS = {
  webdriver: () => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
      enumerable: true
    });
    delete navigator.__proto__.webdriver;
    
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

  languages: () => {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
      configurable: true,
      enumerable: true
    });
  },

  automation: () => {
    delete window.callPhantom;
    delete window._phantom;
    delete window.__phantomas;
    delete window.Buffer;
    delete window.emit;
    delete window.spawn;
    
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true
    });
    
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true
    });
  }
};

function injectScript(fn) {
  return `(${fn.toString()})();`;
}

async function runQuickTest() {
  console.log('🔬 Quick Stealth Verification Test\n');
  
  const browser = await chromium.launch({ headless: true });
  
  // Test WITHOUT stealth
  console.log('─'.repeat(50));
  console.log('Without Stealth:');
  console.log('─'.repeat(50));
  
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  
  await page1.goto('data:text/html,<html><body>Test</body></html>');
  
  const withoutStealth = await page1.evaluate(() => ({
    webdriver: navigator.webdriver,
    pluginsLength: navigator.plugins?.length,
    languages: navigator.languages,
    userAgent: navigator.userAgent
  }));
  
  console.log(`  navigator.webdriver: ${withoutStealth.webdriver}`);
  console.log(`  navigator.plugins.length: ${withoutStealth.pluginsLength}`);
  console.log(`  navigator.languages: [${withoutStealth.languages?.join(', ')}]`);
  
  await context1.close();
  
  // Test WITH stealth
  console.log('\n' + '─'.repeat(50));
  console.log('With Stealth:');
  console.log('─'.repeat(50));
  
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  
  // Inject stealth scripts
  for (const script of Object.values(STEALTH_SCRIPTS)) {
    await page2.addInitScript(injectScript(script));
  }
  
  await page2.goto('data:text/html,<html><body>Test</body></html>');
  
  const withStealth = await page2.evaluate(() => ({
    webdriver: navigator.webdriver,
    pluginsLength: navigator.plugins?.length,
    firstPlugin: navigator.plugins?.[0]?.name,
    languages: navigator.languages,
    userAgent: navigator.userAgent
  }));
  
  console.log(`  navigator.webdriver: ${withStealth.webdriver}`);
  console.log(`  navigator.plugins.length: ${withStealth.pluginsLength}`);
  console.log(`  navigator.plugins[0].name: ${withStealth.firstPlugin}`);
  console.log(`  navigator.languages: [${withStealth.languages?.join(', ')}]`);
  
  await context2.close();
  await browser.close();
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 COMPARISON RESULTS');
  console.log('═'.repeat(50));
  
  const results = [
    ['navigator.webdriver', withoutStealth.webdriver, withStealth.webdriver, withStealth.webdriver === undefined],
    ['navigator.plugins.length', withoutStealth.pluginsLength, withStealth.pluginsLength, withStealth.pluginsLength > 0],
    ['navigator.languages', withoutStealth.languages?.join(', '), withStealth.languages?.join(', '), withStealth.languages?.length >= 2]
  ];
  
  results.forEach(([prop, before, after, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${prop}`);
    console.log(`   Before: ${before}`);
    console.log(`   After:  ${after}`);
  });
  
  const allPassed = results.every(r => r[3]);
  
  console.log('\n' + '═'.repeat(50));
  if (allPassed) {
    console.log('✅ ALL STEALTH MEASURES WORKING CORRECTLY!');
  } else {
    console.log('⚠️  Some stealth measures may need adjustment');
  }
  console.log('═'.repeat(50));
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    withoutStealth,
    withStealth,
    results: results.map(([prop, before, after, passed]) => ({ property: prop, before, after, passed })),
    allPassed
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'stealth-verification.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  
  console.log(`\n📝 Report saved to: data/stealth-verification.json`);
}

runQuickTest().catch(console.error);
