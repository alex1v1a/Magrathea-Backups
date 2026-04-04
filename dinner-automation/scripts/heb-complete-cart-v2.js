#!/usr/bin/env node
/**
 * HEB Complete Cart Automation v2.0
 * 
 * Improvements over v1:
 * - Circuit breaker pattern for HEB API calls
 * - Exponential backoff with jitter for retries
 * - Structured error logging with context
 * - Proper cleanup using finally blocks
 * - Rate limiting protection
 * - Graceful degradation when HEB site changes
 * - Comprehensive health checks
 * 
 * Usage:
 *   node scripts/heb-complete-cart-v2.js
 *   node scripts/heb-complete-cart-v2.js --dry-run
 *   node scripts/heb-complete-cart-v2.js --max-items 10
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Timeouts (ms)
  NAVIGATION_TIMEOUT: parseInt(process.env.HEB_NAVIGATION_TIMEOUT) || 30000,
  ELEMENT_TIMEOUT: parseInt(process.env.HEB_ELEMENT_TIMEOUT) || 15000,
  VERIFICATION_TIMEOUT: 5000,
  
  // Retry configuration
  MAX_RETRIES: parseInt(process.env.HEB_MAX_RETRIES) || 3,
  RETRY_BASE_DELAY: 2000,
  RETRY_MAX_DELAY: 30000,
  
  // Circuit breaker configuration
  CIRCUIT_FAILURE_THRESHOLD: parseInt(process.env.HEB_CIRCUIT_FAILURE_THRESHOLD) || 5,
  CIRCUIT_RESET_TIMEOUT: parseInt(process.env.HEB_CIRCUIT_RESET_TIMEOUT) || 60000,
  
  // Rate limiting
  REQUEST_DELAY_MIN: 3000,
  REQUEST_DELAY_MAX: 8000,
  BATCH_SIZE: 5,
  BATCH_PAUSE_MIN: 10000,
  BATCH_PAUSE_MAX: 15000,
  
  // Paths
  EXTENSION_PATH: path.join(__dirname, '..', 'heb-extension'),
  DATA_DIR: path.join(__dirname, '..', 'data'),
  LOGS_DIR: path.join(__dirname, '..', 'logs'),
  
  // Credentials (load from env or credentials module)
  getCredentials: () => {
    try {
      const { getHEBCredentials } = require('./credentials');
      return getHEBCredentials();
    } catch {
      return {
        email: process.env.HEB_EMAIL || 'alex@1v1a.com',
        password: process.env.HEB_PASSWORD
      };
    }
  }
};

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

class StructuredLogger {
  constructor(context = {}) {
    this.context = context;
    this.logs = [];
  }

  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta
    };
    
    this.logs.push(entry);
    
    // Console output with appropriate prefix
    const prefix = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅',
      debug: '🔍'
    }[level] || '•';
    
    const metaStr = Object.keys(meta).length > 0 
      ? ' | ' + JSON.stringify(meta, null, 0).slice(1, -1).replace(/"/g, '')
      : '';
    
    console.log(`${prefix} [${entry.timestamp}] ${message}${metaStr}`);
  }

  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  success(message, meta) { this.log('success', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }

  async saveToFile() {
    const logFile = path.join(CONFIG.LOGS_DIR, `heb-cart-v2-${Date.now()}.json`);
    try {
      await fs.mkdir(CONFIG.LOGS_DIR, { recursive: true });
      await fs.writeFile(logFile, JSON.stringify(this.logs, null, 2));
      return logFile;
    } catch (err) {
      console.error('Failed to save logs:', err.message);
      return null;
    }
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || CONFIG.CIRCUIT_FAILURE_THRESHOLD;
    this.resetTimeout = options.resetTimeout || CONFIG.CIRCUIT_RESET_TIMEOUT;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.totalCalls = 0;
    this.totalFailures = 0;
  }

  async execute(fn, ...args) {
    this.totalCalls++;
    
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
      } else {
        const remainingMs = this.resetTimeout - timeSinceLastFailure;
        throw new CircuitBreakerOpenError(
          `Circuit breaker '${this.name}' is OPEN. Try again in ${Math.ceil(remainingMs / 1000)}s`,
          { name: this.name, remainingMs }
        );
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker '${this.name}' HALF_OPEN limit reached`,
        { name: this.name, halfOpenCalls: this.halfOpenCalls }
      );
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.successes++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.halfOpenCalls = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      failureRate: this.totalCalls > 0 ? (this.totalFailures / this.totalCalls) : 0
    };
  }
}

class CircuitBreakerOpenError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.meta = meta;
  }
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

function isRetryableError(error) {
  // Network errors
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ENOTFOUND') return true;
  
  // HTTP status codes
  if (error.status === 429) return true; // Rate limited
  if (error.status === 503) return true; // Service unavailable
  if (error.status === 502) return true; // Bad gateway
  if (error.status === 504) return true; // Gateway timeout
  
  // Playwright-specific
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('net::')) return true;
  
  // Circuit breaker (don't retry if circuit is open)
  if (error.name === 'CircuitBreakerOpenError') return false;
  
  return false;
}

function calculateBackoffDelay(attempt, baseDelay = CONFIG.RETRY_BASE_DELAY, maxDelay = CONFIG.RETRY_MAX_DELAY) {
  // Exponential backoff with jitter
  const exponential = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 1000;
  return Math.min(exponential + jitter, maxDelay);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, options = {}) {
  const { 
    maxRetries = CONFIG.MAX_RETRIES, 
    baseDelay = CONFIG.RETRY_BASE_DELAY,
    maxDelay = CONFIG.RETRY_MAX_DELAY,
    onRetry = null,
    context = {}
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new AggregateError(
          [error],
          `Failed after ${maxRetries} attempts: ${error.message}`,
          { context, attempts: attempt }
        );
      }

      if (!isRetryableError(error)) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      
      if (onRetry) {
        onRetry({ attempt, maxRetries, delay, error, context });
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================================================
// HEB AUTOMATION CLASS
// ============================================================================

class HEBCompleteCartV2 {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      maxItems: options.maxItems || null,
      headless: options.headless !== false,
      ...options
    };
    
    this.logger = new StructuredLogger({ 
      operation: 'heb-cart-v2',
      dryRun: this.options.dryRun 
    });
    
    this.circuitBreakers = {
      navigation: new CircuitBreaker('heb-navigation'),
      search: new CircuitBreaker('heb-search'),
      addToCart: new CircuitBreaker('heb-add-to-cart'),
      verification: new CircuitBreaker('heb-verification')
    };
    
    this.browser = null;
    this.page = null;
    this.results = {
      success: false,
      itemsAdded: 0,
      itemsFailed: [],
      itemsVerified: [],
      errors: [],
      startTime: null,
      endTime: null,
      circuitBreakerStats: {}
    };
  }

  /**
   * Load meal plan from various sources
   */
  async loadMealPlan() {
    this.logger.info('Loading meal plan...');
    
    const sources = [
      { file: 'heb-extension-items.json', parser: this.parseExtensionItems },
      { file: 'weekly-plan.json', parser: this.parseWeeklyPlan }
    ];

    for (const source of sources) {
      const filePath = path.join(CONFIG.DATA_DIR, source.file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        const items = await source.parser.call(this, data);
        
        if (items.length > 0) {
          this.logger.success(`Loaded ${items.length} items from ${source.file}`, { 
            source: source.file,
            itemCount: items.length 
          });
          return { items, source: source.file };
        }
      } catch (err) {
        this.logger.debug(`Could not load ${source.file}`, { error: err.message });
      }
    }

    throw new Error('No meal plan found in any source');
  }

  parseExtensionItems(data) {
    const items = [];
    
    if (data.shoppingList) {
      const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
      for (const category of categories) {
        if (data.shoppingList[category]) {
          for (const item of data.shoppingList[category]) {
            items.push({
              name: item.item,
              searchTerm: item.searchTerms ? item.searchTerms[0] : item.item,
              amount: item.quantity || '1',
              for: item.for,
              priority: item.priority,
              organic: item.organicPreferred,
              category
            });
          }
        }
      }
    } else if (data.items && Array.isArray(data.items)) {
      items.push(...data.items);
    }
    
    return items;
  }

  parseWeeklyPlan(data) {
    const items = [];
    const seen = new Set();

    if (data.meals && Array.isArray(data.meals)) {
      for (const meal of data.meals) {
        if (!meal.ingredients) continue;

        for (const ingredient of meal.ingredients) {
          const searchTerm = ingredient.hebSearch || ingredient.name;
          const key = searchTerm.toLowerCase();

          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              name: ingredient.name,
              searchTerm: searchTerm,
              amount: ingredient.amount || '1',
              status: 'pending',
              meal: meal.name
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Launch browser with anti-detection measures
   */
  async launchBrowser() {
    this.logger.info('Launching browser...');

    try {
      // Try to connect to existing Chrome first
      try {
        this.browser = await chromium.connectOverCDP('http://localhost:9222');
        this.logger.success('Connected to existing Chrome instance');
      } catch {
        // Launch new browser
        this.browser = await chromium.launch({
          headless: this.options.headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080'
          ]
        });
        this.logger.success('Launched new browser instance');
      }

      const context = this.browser.contexts()[0] || await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      this.page = context.pages()[0] || await context.newPage();

      // Inject anti-detection script
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        window.chrome = { runtime: {} };
      });

      return true;
    } catch (error) {
      this.logger.error('Browser launch failed', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Navigate to HEB with retry and circuit breaker
   */
  async navigateToHEB() {
    return this.circuitBreakers.navigation.execute(async () => {
      return withRetry(async () => {
        this.logger.info('Navigating to HEB.com...');
        
        await this.page.goto('https://www.heb.com', {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.NAVIGATION_TIMEOUT
        });

        // Session warmup - human-like behavior
        await this.randomDelay(3000, 5000);
        await this.humanLikeScroll();
        
        this.logger.success('Successfully navigated to HEB.com');
        return true;
      }, {
        context: { operation: 'navigateToHEB' },
        onRetry: ({ attempt, delay }) => {
          this.logger.warn(`Navigation retry ${attempt}`, { delay });
        }
      });
    });
  }

  /**
   * Check login status
   */
  async checkLoginStatus() {
    try {
      const selectors = [
        '[data-testid="account-menu-button"]',
        'a[href*="/my-account"]',
        '[data-automation-id*="account" i]'
      ];

      for (const selector of selectors) {
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) return true;
        }
      }

      // Check for login link (negative indicator)
      const loginLink = await this.page.$('a[href*="/login"]');
      if (loginLink) {
        const isVisible = await loginLink.isVisible().catch(() => false);
        if (isVisible) return false;
      }

      return false;
    } catch (error) {
      this.logger.warn('Login check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Perform login with credentials
   */
  async performLogin() {
    const credentials = CONFIG.getCredentials();
    
    if (!credentials.password) {
      throw new Error('HEB_PASSWORD not configured');
    }

    this.logger.info('Performing login...', { email: credentials.email });

    return withRetry(async () => {
      // Click sign in
      const signInSelectors = [
        'text=Sign In',
        '[data-testid="sign-in-button"]',
        'a[href*="login"]'
      ];

      let signInBtn = null;
      for (const selector of signInSelectors) {
        signInBtn = await this.page.$(selector);
        if (signInBtn) break;
      }

      if (!signInBtn) {
        throw new Error('Sign in button not found');
      }

      await signInBtn.click();
      await this.randomDelay(2000, 3000);

      // Fill email
      const emailField = await this.page.$('input[type="email"], input[name="email"]');
      if (!emailField) throw new Error('Email field not found');
      
      await emailField.fill(credentials.email);
      await this.randomDelay(500, 1000);

      // Fill password
      const passwordField = await this.page.$('input[type="password"], input[name="password"]');
      if (!passwordField) throw new Error('Password field not found');
      
      await passwordField.fill(credentials.password);
      await this.randomDelay(500, 1000);

      // Submit
      const submitBtn = await this.page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      }

      await this.randomDelay(5000, 7000);

      // Verify login
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('Login verification failed');
      }

      this.logger.success('Login successful');
      return true;
    }, {
      maxRetries: 2,
      context: { operation: 'performLogin' }
    });
  }

  /**
   * Get current cart count from localStorage
   */
  async getCartCount() {
    try {
      const count = await this.page.evaluate(() => {
        try {
          const raw = localStorage.getItem('PurchaseCart');
          if (!raw) return 0;
          const cartData = JSON.parse(raw);
          
          if (cartData.ProductNames) {
            return cartData.ProductNames.split('<SEP>').filter(n => n.trim()).length;
          }
          
          if (cartData.Products && Array.isArray(cartData.Products)) {
            return cartData.Products.length;
          }
          
          return 0;
        } catch (e) {
          return 0;
        }
      });
      
      return count;
    } catch (error) {
      this.logger.warn('Failed to get cart count', { error: error.message });
      return -1;
    }
  }

  /**
   * Search for and add item to cart
   */
  async addItem(item, index, total) {
    const context = { 
      item: item.name, 
      searchTerm: item.searchTerm,
      index, 
      total 
    };

    this.logger.info(`[${index}/${total}] Adding: ${item.name}`, context);

    if (this.options.dryRun) {
      this.logger.info('  (Dry run - skipping)', context);
      return { success: true, dryRun: true };
    }

    const countBefore = await this.getCartCount();

    try {
      // Navigate to search with circuit breaker and retry
      await this.circuitBreakers.search.execute(async () => {
        return withRetry(async () => {
          await this.page.goto(
            `https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm)}`,
            { waitUntil: 'domcontentloaded', timeout: CONFIG.NAVIGATION_TIMEOUT }
          );
          await this.randomDelay(4000, 6000);
        }, {
          context: { operation: 'search', item: item.name },
          onRetry: ({ attempt }) => {
            this.logger.warn(`  Search retry ${attempt}`, context);
          }
        });
      });

      // Human-like scroll
      await this.humanLikeScroll();

      // Find and click add button
      const addResult = await this.findAndClickAddButton();
      
      if (!addResult.success) {
        throw new Error(addResult.error || 'Failed to find add button');
      }

      // Verify cart increased
      const verified = await this.verifyCartIncrease(countBefore);
      
      if (verified.success) {
        this.logger.success(`  Added & verified (${countBefore} → ${verified.newCount})`, {
          ...context,
          cartBefore: countBefore,
          cartAfter: verified.newCount
        });
        return { success: true, verified: true, cartCount: verified.newCount };
      } else {
        // Retry once if verification failed
        this.logger.warn('  Cart verification failed, retrying...', context);
        await this.randomDelay(3000, 5000);
        
        const retryResult = await this.findAndClickAddButton();
        if (retryResult.success) {
          const retryVerified = await this.verifyCartIncrease(countBefore);
          if (retryVerified.success) {
            this.logger.success(`  Retry successful (${countBefore} → ${retryVerified.newCount})`, context);
            return { success: true, verified: true, retry: true, cartCount: retryVerified.newCount };
          }
        }
        
        throw new Error('Cart verification failed after retry');
      }

    } catch (error) {
      this.logger.error(`  Failed: ${error.message}`, {
        ...context,
        error: error.message,
        circuitState: this.circuitBreakers.search.state
      });
      
      return { 
        success: false, 
        error: error.message,
        circuitOpen: error.name === 'CircuitBreakerOpenError'
      };
    }
  }

  /**
   * Find and click the add to cart button
   */
  async findAndClickAddButton() {
    const strategies = [
      // Strategy 1: data-testid
      async () => {
        const btns = await this.page.locator('button[data-testid*="add-to-cart" i]').all();
        for (const btn of btns) {
          if (await this.isClickable(btn)) return btn;
        }
        return null;
      },
      
      // Strategy 2: data-qe-id
      async () => {
        const btn = await this.page.$('button[data-qe-id="addToCart"]');
        if (await this.isClickable(btn)) return btn;
        return null;
      },
      
      // Strategy 3: Text content
      async () => {
        const btns = await this.page.locator('button').all();
        for (const btn of btns) {
          const text = await btn.textContent().catch(() => '');
          const isDisabled = await btn.evaluate(el => 
            el.disabled || el.getAttribute('aria-disabled') === 'true'
          ).catch(() => true);
          
          if (text.toLowerCase().includes('add to cart') && !isDisabled) {
            return btn;
          }
        }
        return null;
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const btn = await strategies[i]();
        if (btn) {
          // Scroll and click
          await btn.scrollIntoViewIfNeeded({ timeout: 5000 });
          await this.randomDelay(800, 1500);
          
          const clickDelay = Math.floor(Math.random() * 300) + 100;
          await btn.click({ delay: clickDelay, timeout: 10000 });
          
          return { success: true };
        }
      } catch (err) {
        this.logger.debug(`Strategy ${i + 1} failed: ${err.message}`);
      }
    }

    return { success: false, error: 'No clickable add button found' };
  }

  /**
   * Check if element is clickable
   */
  async isClickable(element) {
    if (!element) return false;
    try {
      const isVisible = await element.isVisible().catch(() => false);
      const isEnabled = await element.isEnabled().catch(() => false);
      const isDisabled = await element.evaluate(el => 
        el.disabled || el.getAttribute('aria-disabled') === 'true'
      ).catch(() => true);
      
      return isVisible && isEnabled && !isDisabled;
    } catch {
      return false;
    }
  }

  /**
   * Verify cart count increased
   */
  async verifyCartIncrease(previousCount) {
    return withRetry(async () => {
      await this.randomDelay(3000, 5000);
      const newCount = await this.getCartCount();
      
      if (newCount > previousCount) {
        return { success: true, newCount };
      }
      
      throw new Error(`Cart did not increase: ${previousCount} → ${newCount}`);
    }, {
      maxRetries: 5,
      baseDelay: 2000,
      context: { operation: 'verifyCartIncrease', previousCount }
    });
  }

  /**
   * Human-like scroll
   */
  async humanLikeScroll() {
    const scrollAmount = Math.floor(Math.random() * 300) + 100;
    await this.page.evaluate(amount => window.scrollBy(0, amount), scrollAmount);
    await this.randomDelay(500, 1200);
  }

  /**
   * Random delay between min and max
   */
  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await sleep(delay);
  }

  /**
   * Process items in batches
   */
  async processBatches(items) {
    const results = [];
    const batchSize = CONFIG.BATCH_SIZE;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(items.length / batchSize);
      
      this.logger.info(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} items)`);
      
      for (let j = 0; j < batch.length; j++) {
        const itemIndex = i + j + 1;
        const result = await this.addItem(batch[j], itemIndex, items.length);
        results.push({ item: batch[j], ...result });
        
        // Delay between items
        if (j < batch.length - 1) {
          await this.randomDelay(CONFIG.REQUEST_DELAY_MIN, CONFIG.REQUEST_DELAY_MAX);
        }
      }
      
      // Pause between batches
      if (i + batchSize < items.length) {
        const pauseSec = Math.floor(Math.random() * 
          (CONFIG.BATCH_PAUSE_MAX - CONFIG.BATCH_PAUSE_MIN) / 1000) + 
          CONFIG.BATCH_PAUSE_MIN / 1000;
        this.logger.info(`Pausing ${pauseSec}s between batches...`);
        await this.randomDelay(CONFIG.BATCH_PAUSE_MIN, CONFIG.BATCH_PAUSE_MAX);
      }
    }
    
    return results;
  }

  /**
   * Main execution flow
   */
  async run() {
    this.results.startTime = new Date().toISOString();
    
    try {
      this.logger.info('========================================');
      this.logger.info('HEB COMPLETE CART V2 STARTED');
      this.logger.info('========================================');

      // Load meal plan
      const { items, source } = await this.loadMealPlan();
      
      if (this.options.maxItems && items.length > this.options.maxItems) {
        this.logger.info(`Limiting to ${this.options.maxItems} items (from ${items.length})`);
        items.length = this.options.maxItems;
      }

      // Launch browser
      await this.launchBrowser();

      // Navigate to HEB
      await this.navigateToHEB();

      // Check login
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        await this.performLogin();
      } else {
        this.logger.success('Already logged in');
      }

      // Get initial cart count
      const initialCartCount = await this.getCartCount();
      this.logger.info(`Initial cart count: ${initialCartCount}`);

      // Process items
      const itemResults = await this.processBatches(items);

      // Calculate results
      const successful = itemResults.filter(r => r.success);
      const verified = itemResults.filter(r => r.verified);
      const failed = itemResults.filter(r => !r.success);

      const finalCartCount = await this.getCartCount();
      
      this.results = {
        success: failed.length === 0 || (successful.length / items.length) > 0.8,
        itemsAdded: successful.length,
        itemsVerified: verified.length,
        itemsFailed: failed.map(f => ({ 
          name: f.item.name, 
          error: f.error,
          circuitOpen: f.circuitOpen 
        })),
        totalItems: items.length,
        cartCount: {
          initial: initialCartCount,
          final: finalCartCount,
          delta: finalCartCount - initialCartCount
        },
        source,
        dryRun: this.options.dryRun,
        startTime: this.results.startTime,
        endTime: new Date().toISOString(),
        circuitBreakerStats: Object.fromEntries(
          Object.entries(this.circuitBreakers).map(([k, v]) => [k, v.getStats()])
        )
      };

      // Print summary
      this.printSummary();

      return this.results;

    } catch (error) {
      this.logger.error('Fatal error', { 
        error: error.message,
        stack: error.stack 
      });
      
      this.results.errors.push({
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString()
      });
      
      throw error;
    } finally {
      // Cleanup
      if (this.browser) {
        this.logger.info('Closing browser...');
        await this.browser.close().catch(err => {
          this.logger.error('Browser cleanup failed', { error: err.message });
        });
      }
      
      // Save logs
      const logFile = await this.logger.saveToFile();
      if (logFile) {
        this.logger.info(`Logs saved to: ${logFile}`);
      }
    }
  }

  /**
   * Print summary
   */
  printSummary() {
    const r = this.results;
    const duration = new Date(r.endTime) - new Date(r.startTime);
    
    console.log('\n========================================');
    console.log('📊 RESULTS SUMMARY');
    console.log('========================================');
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Items: ${r.itemsAdded}/${r.totalItems} added (${((r.itemsAdded/r.totalItems)*100).toFixed(0)}%)`);
    console.log(`Verified: ${r.itemsVerified}/${r.totalItems}`);
    console.log(`Failed: ${r.itemsFailed.length}`);
    console.log(`Cart: ${r.cartCount.initial} → ${r.cartCount.final} (+${r.cartCount.delta})`);
    console.log(`Dry Run: ${r.dryRun ? 'Yes' : 'No'}`);
    
    if (r.itemsFailed.length > 0) {
      console.log('\nFailed Items:');
      r.itemsFailed.forEach(f => {
        const circuitNote = f.circuitOpen ? ' [CIRCUIT OPEN]' : '';
        console.log(`  - ${f.name}: ${f.error}${circuitNote}`);
      });
    }
    
    console.log('\nCircuit Breaker Stats:');
    Object.entries(r.circuitBreakerStats).forEach(([name, stats]) => {
      console.log(`  ${name}: ${stats.state} (${stats.totalFailures} failures)`);
    });
    
    console.log('========================================');
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    headless: !args.includes('--headed'),
    maxItems: null
  };

  // Parse --max-items
  const maxItemsIndex = args.indexOf('--max-items');
  if (maxItemsIndex !== -1 && args[maxItemsIndex + 1]) {
    options.maxItems = parseInt(args[maxItemsIndex + 1]);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HEB Complete Cart Automation v2.0

Usage:
  node scripts/heb-complete-cart-v2.js [options]

Options:
  --dry-run          Simulate without adding items
  --headed           Show browser window
  --max-items <n>    Limit to n items
  --help, -h         Show this help

Environment Variables:
  HEB_EMAIL                       HEB login email
  HEB_PASSWORD                    HEB login password
  HEB_MAX_RETRIES                 Max retry attempts (default: 3)
  HEB_CIRCUIT_FAILURE_THRESHOLD   Circuit breaker threshold (default: 5)
  HEB_CIRCUIT_RESET_TIMEOUT       Circuit reset time in ms (default: 60000)
`);
    process.exit(0);
  }

  const automation = new HEBCompleteCartV2(options);
  
  try {
    const results = await automation.run();
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { HEBCompleteCartV2, CircuitBreaker, withRetry, StructuredLogger };
