#!/usr/bin/env node
/**
 * HEB Cart Automation v3 - Optimized Edition
 * 
 * Improvements:
 * - Batch item processing with concurrent limits
 * - Intelligent caching of search results
 * - Retry with exponential backoff
 * - Memory-efficient item processing
 * - Progress tracking and resume capability
 */

const fs = require('fs').promises;
const path = require('path');
const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector-v2');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const PROGRESS_FILE = path.join(CACHE_DIR, 'heb-progress.json');
const SEARCH_CACHE_FILE = path.join(CACHE_DIR, 'heb-search-cache.json');

// Ensure cache directory exists
async function ensureCache() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {}
}

// Concurrency limiter
class ConcurrencyLimiter {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

/**
 * Load items with progress tracking
 */
async function loadItems() {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8');
    const { items } = JSON.parse(data);
    
    // Load progress
    let progress = { completed: [], failed: [] };
    try {
      const progressData = await fs.readFile(PROGRESS_FILE, 'utf8');
      progress = JSON.parse(progressData);
    } catch (e) {}
    
    // Filter out completed items
    const pendingItems = items.filter(item => 
      !progress.completed.includes(item.name) && 
      !progress.failed.includes(item.name)
    );
    
    return { items: pendingItems, allItems: items, progress };
  } catch (error) {
    console.error('❌ Could not load items:', error.message);
    return { items: [], allItems: [], progress: { completed: [], failed: [] } };
  }
}

/**
 * Save progress
 */
async function saveProgress(progress) {
  await ensureCache();
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Load search cache
 */
async function loadSearchCache() {
  try {
    const data = await fs.readFile(SEARCH_CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * Save search cache
 */
async function saveSearchCache(cache) {
  await ensureCache();
  await fs.writeFile(SEARCH_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Clear cart with progress tracking
 */
async function clearCart(page) {
  console.log('\n🗑️  Clearing cart...');
  
  const startTime = Date.now();
  
  try {
    await page.goto('https://www.heb.com/cart', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    await page.waitForTimeout(2000);
    
    // Find all remove buttons efficiently
    const removeButtons = await page.locator(
      'button[data-automation-id*="remove"], button:has-text("Remove"), button[aria-label*="Remove"]'
    ).all();
    
    console.log(`   Found ${removeButtons.length} items to remove`);
    
    // Remove items with concurrency limit
    const limiter = new ConcurrencyLimiter(3);
    let removed = 0;
    
    await Promise.all(removeButtons.map(btn => 
      limiter.execute(async () => {
        try {
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(500);
          removed++;
        } catch (e) {}
      })
    ));
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Removed ${removed} items (${duration}ms)`);
    
    return true;
  } catch (error) {
    console.log(`   ⚠️  Clear cart issue: ${error.message}`);
    return false;
  }
}

/**
 * Optimized auto-login to HEB
 */
async function handleHEBLogin(page) {
  const url = page.url();
  if (!url.includes('login') && !url.includes('signin')) {
    return true;
  }
  
  console.log('\n🔐 HEB login required...');
  
  try {
    // Load credentials from secure store
    const credentials = await loadCredentials();
    if (!credentials) {
      console.log('   ⚠️  No credentials found');
      return false;
    }
    
    // Fill email with retry
    await fillFieldWithRetry(page, 'input[type="email"], input[name="email"]', credentials.email);
    await clickWithRetry(page, 'button[type="submit"], button:has-text("Continue")');
    await page.waitForTimeout(1500);
    
    // Fill password with retry
    await fillFieldWithRetry(page, 'input[type="password"]', credentials.password);
    await clickWithRetry(page, 'button[type="submit"], button:has-text("Sign In")');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const success = !currentUrl.includes('login') && !currentUrl.includes('signin');
    
    console.log(success ? '   ✅ Login successful' : '   ⚠️  Login may have failed');
    return success;
    
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return false;
  }
}

/**
 * Retry wrapper for field filling
 */
async function fillFieldWithRetry(page, selector, value, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const field = page.locator(selector).first();
      await field.fill(value, { timeout: 3000 });
      return;
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await page.waitForTimeout(500 * (i + 1));
    }
  }
}

/**
 * Retry wrapper for clicking
 */
async function clickWithRetry(page, selector, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const btn = page.locator(selector).first();
      await btn.click({ timeout: 3000 });
      return;
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await page.waitForTimeout(500 * (i + 1));
    }
  }
}

/**
 * Add item to cart with caching and retry
 */
async function addItemToCart(page, item, index, searchCache) {
  const cacheKey = item.searchTerm || item.name;
  
  // Check cache for search URL
  if (searchCache[cacheKey]) {
    console.log(`   📋 Using cached search for: ${item.name}`);
    try {
      await page.goto(searchCache[cacheKey], { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
    } catch (e) {
      // Fall through to search
    }
  } else {
    // Perform search
    console.log(`\n${index + 1}. Adding: ${item.name}`);
    
    try {
      const searchBox = page.locator('input[placeholder*="Search"], input[name="q"]').first();
      await searchBox.fill('');
      await searchBox.fill(item.searchTerm || item.name);
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
      
      // Cache the search URL
      searchCache[cacheKey] = page.url();
    } catch (error) {
      console.log(`   ⚠️  Search failed: ${error.message}`);
      return false;
    }
  }
  
  // Try to add to cart with retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Multiple strategies for finding add button
      const addButton = await page.locator(
        'button[data-automation-id*="add"], ' +
        'button:has-text("Add to Cart"), ' +
        'button:has-text("Add"), ' +
        '[data-testid*="add-to-cart"]'
      ).first();
      
      if (addButton) {
        await addButton.click({ timeout: 3000 });
        await page.waitForTimeout(1000);
        console.log('   ✅ Added to cart');
        return true;
      }
    } catch (e) {
      if (attempt === 1) {
        console.log(`   ⚠️  Add button not found`);
        return false;
      }
      await page.waitForTimeout(1000);
    }
  }
  
  return false;
}

/**
 * Load credentials securely
 */
async function loadCredentials() {
  try {
    const secretsFile = path.join(__dirname, '..', '..', '.secrets', 'heb-credentials.json');
    const data = await fs.readFile(secretsFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    // Fallback to hardcoded (for backward compatibility)
    return {
      email: 'alex@1v1a.com',
      password: '$Tandal0ne'
    };
  }
}

/**
 * Main automation with progress tracking
 */
async function runAutomation(options = {}) {
  const { resume = false, maxItems = null } = options;
  
  const { items, allItems, progress } = await loadItems();
  
  if (items.length === 0) {
    if (progress.completed.length > 0) {
      console.log('✅ All items already processed!');
      return { completed: progress.completed.length, failed: progress.failed.length };
    }
    console.log('❌ No items to add');
    return { completed: 0, failed: 0 };
  }
  
  const targetItems = maxItems ? items.slice(0, maxItems) : items;
  
  console.log('🛒 HEB Auto-Add v3 (Optimized)');
  console.log(`📦 ${targetItems.length} items to add (${allItems.length} total)`);
  console.log(`✅ ${progress.completed.length} already done`);
  console.log(`❌ ${progress.failed.length} previously failed`);
  
  if (resume) {
    console.log('🔄 Resuming from previous run');
  }
  
  const searchCache = await loadSearchCache();
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.heb.com');
  
  const startTime = Date.now();
  
  try {
    await page.waitForTimeout(3000);
    
    // Handle login
    const loggedIn = await handleHEBLogin(page);
    if (!loggedIn) {
      console.log('\n⚠️  Login failed');
      await releaseBrowser(browser);
      return { completed: 0, failed: items.length };
    }
    
    // Clear cart
    await clearCart(page);
    
    // Process items with concurrency limit
    const limiter = new ConcurrencyLimiter(1); // HEB needs sequential for cart
    
    for (let i = 0; i < targetItems.length; i++) {
      const item = targetItems[i];
      
      const success = await limiter.execute(async () => {
        return await addItemToCart(page, item, i, searchCache);
      });
      
      if (success) {
        progress.completed.push(item.name);
      } else {
        progress.failed.push(item.name);
      }
      
      // Save progress every 3 items
      if ((i + 1) % 3 === 0) {
        await saveProgress(progress);
        await saveSearchCache(searchCache);
        console.log(`   💾 Progress saved (${i + 1}/${targetItems.length})`);
      }
      
      // Brief pause between items
      await page.waitForTimeout(500);
    }
    
    // Final save
    await saveProgress(progress);
    await saveSearchCache(searchCache);
    
    const duration = Date.now() - startTime;
    const added = progress.completed.length;
    const failed = progress.failed.length;
    
    console.log(`\n📊 Results: ${added} added, ${failed} failed, ${duration}ms`);
    
    // Screenshot
    await page.screenshot({ path: 'heb-cart-final.png', fullPage: true });
    console.log('📸 Screenshot saved');
    
    return { completed: added, failed, duration };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    // Save progress on error
    await saveProgress(progress);
    throw error;
  } finally {
    await releaseBrowser(browser);
  }
}

/**
 * Reset progress for fresh run
 */
async function resetProgress() {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify({ completed: [], failed: [] }));
  console.log('🔄 Progress reset');
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset')) {
    await resetProgress();
    return;
  }
  
  if (args.includes('--status')) {
    const { progress, allItems } = await loadItems();
    console.log('📊 HEB Cart Status');
    console.log(`   Total items: ${allItems.length}`);
    console.log(`   Completed: ${progress.completed.length}`);
    console.log(`   Failed: ${progress.failed.length}`);
    console.log(`   Remaining: ${allItems.length - progress.completed.length - progress.failed.length}`);
    return;
  }
  
  const resume = args.includes('--resume');
  const maxArg = args.find(a => a.startsWith('--max='));
  const maxItems = maxArg ? parseInt(maxArg.split('=')[1]) : null;
  
  await runAutomation({ resume, maxItems });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAutomation, resetProgress };
