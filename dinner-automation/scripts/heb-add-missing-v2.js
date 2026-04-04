/**
 * HEB Add Missing Items - HIGH PERFORMANCE VERSION
 * 
 * Adds only the items needed to reach 42 total cart items.
 * Resumes from where previous run left off.
 */

const { chromium } = require('playwright');
const http = require('http');
const {
  CONFIG,
  randomDelay,
  CartTracker,
  verifyCartIncreased,
  findAddButton,
  clickButton,
  ALL_ITEMS_FALLBACK,
  warmupSession,
  checkLogin,
  PerformanceMonitor
} = require('./lib/heb-utils');

// ============================================================================
// ALL 42 ITEMS (fallback if file not available)
// ============================================================================

const ALL_ITEMS = ALL_ITEMS_FALLBACK;

// ============================================================================
// STATUS CHECK
// ============================================================================

async function checkCDPStatus() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:9222/json/version', { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200 ? 'connected' : 'error');
    });
    req.on('error', () => resolve('not_running'));
    req.on('timeout', () => { req.destroy(); resolve('timeout'); });
  });
}

async function checkStatus() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart - Status Check');
  console.log('═══════════════════════════════════════════════\n');
  
  const cdpStatus = await checkCDPStatus();
  console.log(`Microsoft Edge (CDP port 9222): ${cdpStatus === 'connected' ? '✅ Connected' : '❌ Not running'}\n`);
  
  if (cdpStatus !== 'connected') {
    console.log('❌ Edge is not running on port 9222');
    console.log('   Run: node dinner-automation/scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (e) {
    console.log('❌ Could not connect to Edge via CDP');
    process.exit(1);
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
  }
  
  const isLoggedIn = await checkLogin(page);
  console.log(`HEB Login Status: ${isLoggedIn ? '✅ Logged in' : '❌ Not logged in'}\n`);
  
  const tracker = new CartTracker();
  const cartCount = await tracker.getCount(page);
  console.log(`🛒 Current Cart: ${cartCount} items\n`);
  
  const targetTotal = 42;
  const pending = Math.max(0, targetTotal - cartCount);
  
  console.log('═══════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`Items in cart:    ${cartCount}`);
  console.log(`Target items:     ${targetTotal}`);
  console.log(`Pending items:    ${pending}`);
  console.log(`Status:           ${pending === 0 ? '✅ Complete' : `🟡 ${pending} items needed`}`);
  
  await browser.close();
  process.exit(0);
}

// ============================================================================
// ADD MISSING ITEMS
// ============================================================================

async function processMissingItem(item, itemNum, totalToAdd, page, tracker, monitor) {
  console.log(`[${itemNum}/${totalToAdd}] ${item.name}...`);
  
  const itemStart = monitor.startItem();
  
  try {
    const countBefore = await tracker.getCount(page);
    
    // Navigate
    await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm)}`, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.navigationTimeout
    });
    
    // Wait for page stability
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 250));
    await randomDelay(400, 800);
    
    // Find and click
    const button = await findAddButton(page);
    
    if (!button) {
      monitor.endItem(itemStart, false);
      console.log(`  ❌ Add button not found`);
      return { success: false, error: 'Button not found' };
    }
    
    const clickResult = await clickButton(page, button);
    
    if (!clickResult.success) {
      monitor.endItem(itemStart, false);
      console.log(`  ❌ Click failed: ${clickResult.error}`);
      return { success: false, error: clickResult.error };
    }
    
    // Verify
    const verification = await verifyCartIncreased(page, countBefore, tracker);
    
    if (verification.success) {
      const duration = monitor.endItem(itemStart, true);
      console.log(`  ✅ Added! (${duration}ms) Cart: ${countBefore} → ${verification.newCount}`);
      return { success: true, verified: true };
    } else {
      monitor.endItem(itemStart, false);
      console.log(`  ❌ Cart did not increase`);
      return { success: false, error: 'Verification failed' };
    }
    
  } catch (err) {
    monitor.endItem(itemStart, false);
    console.log(`  ❌ Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function addMissingItems() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart - Add Missing Items (Optimized)');
  console.log('═══════════════════════════════════════════════\n');
  
  // Connect to Edge
  console.log('🔌 Connecting to Microsoft Edge...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Edge\n');
  } catch (e) {
    console.log('❌ Could not connect to Microsoft Edge on port 9222');
    console.log('   Run: node dinner-automation/scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
  }
  
  // Initialize tracker
  const tracker = new CartTracker();
  const currentCart = await tracker.getCount(page);
  console.log(`🛒 Current cart: ${currentCart} items\n`);
  
  // Calculate what to add
  const targetTotal = 42;
  const alreadyAdded = currentCart;
  const toAdd = targetTotal - alreadyAdded;
  
  console.log(`Target: ${targetTotal} items`);
  console.log(`Already in cart: ${alreadyAdded} items`);
  console.log(`Need to add: ${toAdd} items\n`);
  
  if (toAdd <= 0) {
    console.log('✅ Cart already complete!');
    await browser.close();
    return;
  }
  
  // Check login
  const isLoggedIn = await checkLogin(page);
  if (!isLoggedIn) {
    console.log('❌ Not logged in. Please login first.');
    await browser.close();
    process.exit(1);
  }
  
  // Get items to add
  const startIndex = alreadyAdded;
  const itemsToAdd = ALL_ITEMS.slice(startIndex, startIndex + toAdd);
  
  console.log(`Adding items ${startIndex + 1} to ${startIndex + itemsToAdd.length}:\n`);
  
  const monitor = new PerformanceMonitor();
  const results = { added: [], failed: [] };
  
  // Process items
  for (let i = 0; i < itemsToAdd.length; i++) {
    const item = itemsToAdd[i];
    const globalNum = startIndex + i + 1;
    
    const result = await processMissingItem(item, i + 1, itemsToAdd.length, page, tracker, monitor);
    
    if (result.success) {
      results.added.push(item.name);
    } else {
      results.failed.push({ name: item.name, error: result.error });
    }
    
    // Progress report every 5 items
    if ((i + 1) % 5 === 0 || i === itemsToAdd.length - 1) {
      const currentCount = await tracker.getCount(page, false);
      console.log(`\n📈 PROGRESS: ${results.added.length}/${itemsToAdd.length} added this session`);
      console.log(`🛒 CART TOTAL: ${currentCount} items\n`);
    }
    
    // Inter-item delay (except last)
    if (i < itemsToAdd.length - 1) {
      await randomDelay(CONFIG.delays.min, CONFIG.delays.max);
    }
  }
  
  // Final summary
  const finalCart = await tracker.getCount(page, false);
  const stats = monitor.getStats();
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Started with: ${currentCart} items`);
  console.log(`Added now: ${results.added.length} items`);
  console.log(`Failed: ${results.failed.length} items`);
  console.log(`Final cart: ${finalCart} items`);
  console.log(`⏱️  Total time: ${stats.totalTime}s (${(stats.totalTime/60).toFixed(1)} min)`);
  console.log(`⚡ Avg per item: ${stats.avgItemTime}ms`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed items:');
    results.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
  
  await browser.close();
  console.log('\n👋 Done!');
}

// ============================================================================
// MAIN
// ============================================================================

const isStatusMode = process.argv.includes('--status');

if (isStatusMode) {
  checkStatus().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
} else {
  addMissingItems().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
