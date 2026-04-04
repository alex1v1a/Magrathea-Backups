/**
 * HEB Add to Cart - REFACTORED
 * 
 * Refactored to use the shared library utilities:
 * - Uses lib/logger for structured logging
 * - Uses lib/validation for input validation  
 * - Uses lib/selectors for CSS selectors
 * - Uses lib/browser for browser automation
 * - Uses lib/retry-utils for retry logic
 * 
 * @module scripts/heb-add-cart-refactored
 * @requires playwright
 * @requires ../lib
 */

const path = require('path');
const fs = require('fs').promises;

// Shared library utilities
const { 
  logger,
  getConfig,
  withRetry,
  sleep,
  timestampForFilename,
  validateArray,
  validateRequired,
  ValidationError,
  HEB_SELECTORS,
  smartClick,
  smartType,
  smartNavigate,
  checkLoginStatus,
  elementExists,
  SessionManager
} = require('../lib');

// Component-specific logger
const log = logger.child('heb-add-cart');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  browser: {
    debugPort: 9222,
    connectTimeout: 30000
  },
  
  timing: {
    minDelay: 1000,
    maxDelay: 3000,
    clickDelay: 50,
    navigationTimeout: 12000,
    selectorTimeout: 6000,
    batchPauseMin: 8000,
    batchPauseMax: 12000
  },
  
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 1.5
  },
  
  batchSize: 5,
  verificationRetries: 3
};

// ============================================================================
// DATA VALIDATION SCHEMAS
// ============================================================================

/**
 * Validate cart item structure
 * @param {Object} item - Item to validate
 * @param {string} field - Field name for error reporting
 */
function validateCartItem(item, field = 'item') {
  validateRequired(item, ['name', 'searchTerm'], field);
  
  if (typeof item.name !== 'string' || item.name.length === 0) {
    throw new ValidationError('Item name must be a non-empty string', `${field}.name`, item.name);
  }
  
  if (typeof item.searchTerm !== 'string' || item.searchTerm.length === 0) {
    throw new ValidationError('Search term must be a non-empty string', `${field}.searchTerm`, item.searchTerm);
  }
  
  if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity < 1)) {
    throw new ValidationError('Quantity must be a positive number', `${field}.quantity`, item.quantity);
  }
}

// ============================================================================
// CART TRACKER CLASS
// ============================================================================

/**
 * Tracks cart state with caching
 */
class CartTracker {
  constructor() {
    this.lastCount = null;
    this.lastCheck = 0;
    this.cacheTTL = 3000;
  }

  /**
   * Get current cart count
   * @param {Page} page - Playwright page
   * @param {boolean} useCache - Use cached value if fresh
   * @returns {Promise<number>} Cart item count
   */
  async getCount(page, useCache = true) {
    if (useCache && this.lastCount !== null && (Date.now() - this.lastCheck) < this.cacheTTL) {
      log.debug('Using cached cart count', { count: this.lastCount });
      return this.lastCount;
    }

    try {
      const count = await page.evaluate(() => {
        // Try localStorage first (most reliable)
        try {
          const raw = localStorage.getItem('PurchaseCart');
          if (raw) {
            const cart = JSON.parse(raw);
            if (cart.ProductNames) {
              return cart.ProductNames.split('<SEP>').filter(n => n.trim()).length;
            }
            if (cart.Products?.length) return cart.Products.length;
          }
        } catch (e) {}

        // Fallback: DOM query
        const badge = document.querySelector('[data-testid="cart-badge"], .CartLink_cartBadge');
        if (badge) {
          const num = parseInt(badge.textContent?.trim());
          if (!isNaN(num)) return num;
        }

        return 0;
      });

      this.lastCount = count;
      this.lastCheck = Date.now();
      return count;
    } catch (error) {
      log.warn('Could not get cart count', { error: error.message });
      return this.lastCount ?? 0;
    }
  }

  /**
   * Invalidate cache
   */
  invalidate() {
    this.lastCheck = 0;
  }
}

// ============================================================================
// HEB CART AUTOMATION CLASS
// ============================================================================

/**
 * Manages adding items to HEB cart
 */
class HEBCartAutomation {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      debugPort: CONFIG.browser.debugPort,
      ...options
    };
    
    this.session = new SessionManager({ debugPort: this.options.debugPort });
    this.cartTracker = new CartTracker();
    this.results = [];
    this.items = [];
  }

  /**
   * Load items from JSON file
   * @param {string} [itemsPath] - Path to items file
   * @returns {Promise<Array>} Loaded items
   */
  async loadItems(itemsPath) {
    const config = getConfig();
    const filePath = itemsPath || path.join(config.getPath('data'), 'heb-extension-items.json');
    
    log.info('Loading items', { path: filePath });

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);

      // Extract items from shopping list format
      if (parsed.shoppingList) {
        const items = [];
        const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];

        for (const category of categories) {
          if (parsed.shoppingList[category]) {
            for (const item of parsed.shoppingList[category]) {
              items.push({
                name: item.item,
                searchTerm: item.searchTerms?.[0] || item.item,
                amount: item.quantity,
                for: item.for,
                priority: item.priority,
                organic: item.organicPreferred
              });
            }
          }
        }

        log.success(`Loaded ${items.length} items from shopping list`);
        return items;
      }

      return parsed.items || parsed;
    } catch (error) {
      log.error('Failed to load items', error, { path: filePath });
      return [];
    }
  }

  /**
   * Connect to browser and verify session
   * @returns {Promise<void>}
   * @throws {Error} If connection or login fails
   */
  async initialize() {
    log.section('INITIALIZING HEB CART AUTOMATION');
    
    // Connect to browser
    log.info('Connecting to browser', { port: this.options.debugPort });
    await this.session.connect();
    log.success('Connected to browser');

    // Navigate to HEB
    await smartNavigate(this.session.page, 'https://www.heb.com', {
      timeout: CONFIG.timing.navigationTimeout,
      waitUntil: 'domcontentloaded'
    });
    
    // Verify login
    log.info('Checking login status...');
    const isLoggedIn = await checkLoginStatus(this.session.page, {
      loginIndicators: HEB_SELECTORS.header.accountMenu,
      logoutIndicators: HEB_SELECTORS.login.emailInput
    });

    if (!isLoggedIn) {
      throw new Error('Not logged in to HEB. Please login manually first.');
    }

    log.success('HEB login verified');
  }

  /**
   * Process all items
   * @param {Array} items - Items to add
   * @returns {Promise<Array>} Results
   */
  async processItems(items) {
    validateArray(items, validateCartItem, 'items');
    
    log.section(`ADDING ${items.length} ITEMS TO CART`);
    
    const batches = [];
    for (let i = 0; i < items.length; i += CONFIG.batchSize) {
      batches.push(items.slice(i, i + CONFIG.batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      await this._processBatch(batch, batchIndex + 1, batches.length);
      
      // Pause between batches (except last)
      if (batchIndex < batches.length - 1) {
        const pauseMs = CONFIG.timing.batchPauseMin + 
          Math.random() * (CONFIG.timing.batchPauseMax - CONFIG.timing.batchPauseMin);
        
        log.info(`Pausing ${Math.round(pauseMs / 1000)}s between batches...`);
        await sleep(pauseMs);
      }
    }

    return this.results;
  }

  /**
   * Process a single batch of items
   * @param {Array} batch - Batch of items
   * @param {number} batchNum - Current batch number
   * @param {number} totalBatches - Total number of batches
   * @returns {Promise<void>}
   */
  async _processBatch(batch, batchNum, totalBatches) {
    log.section(`BATCH ${batchNum}/${totalBatches} (${batch.length} items)`);

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const globalIndex = (batchNum - 1) * CONFIG.batchSize + i + 1;
      
      log.info(`[${globalIndex}] Adding: ${item.name}`);

      try {
        const result = await this._addItem(item);
        this.results.push({ item: item.name, ...result, index: globalIndex });
        
        if (result.success) {
          log.success(`[${globalIndex}] Added: ${item.name}`, { cartCount: result.cartCount });
        } else {
          log.warn(`[${globalIndex}] Could not add: ${item.name}`, { reason: result.error });
        }
      } catch (error) {
        log.error(`[${globalIndex}] Failed: ${item.name}`, error);
        this.results.push({ 
          item: item.name, 
          success: false, 
          error: error.message,
          index: globalIndex 
        });
      }

      // Delay between items (except last)
      if (i < batch.length - 1) {
        await sleep(CONFIG.timing.minDelay + Math.random() * (CONFIG.timing.maxDelay - CONFIG.timing.minDelay));
      }
    }
  }

  /**
   * Add a single item to cart
   * @param {Object} item - Item to add
   * @returns {Promise<Object>} Result
   */
  async _addItem(item) {
    if (this.options.dryRun) {
      log.info('Dry run - would add:', { item: item.name });
      return { success: true, dryRun: true };
    }

    const page = this.session.page;
    
    // Get initial cart count
    const initialCount = await this.cartTracker.getCount(page, false);
    log.debug('Initial cart count', { count: initialCount });

    // Navigate to search results
    const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm)}`;
    await smartNavigate(page, searchUrl, { 
      timeout: CONFIG.timing.navigationTimeout,
      waitUntil: 'domcontentloaded'
    });

    // Wait for product grid
    await sleep(CONFIG.timing.minDelay);

    // Click add button using smart selector
    const clicked = await smartClick(page, HEB_SELECTORS.cart.addButton, {
      timeout: CONFIG.timing.selectorTimeout
    });

    if (!clicked) {
      return { success: false, error: 'Add button not found' };
    }

    // Wait briefly for cart update
    await sleep(CONFIG.timing.minDelay);

    // Verify cart increased
    const newCount = await this.cartTracker.getCount(page, false);
    log.debug('Cart count after add', { before: initialCount, after: newCount });

    if (newCount <= initialCount) {
      return { success: false, error: 'Cart count did not increase' };
    }

    return { 
      success: true, 
      cartCount: newCount,
      added: newCount - initialCount
    };
  }

  /**
   * Save results to file
   * @returns {Promise<void>}
   */
  async saveResults() {
    const config = getConfig();
    const timestamp = timestampForFilename();
    const filepath = path.join(config.getPath('logs'), `heb-cart-results-${timestamp}.json`);
    
    const summary = {
      timestamp: new Date().toISOString(),
      total: this.results.length,
      successful: this.results.filter(r => r.success).length,
      failed: this.results.filter(r => !r.success).length,
      results: this.results
    };

    try {
      await fs.writeFile(filepath, JSON.stringify(summary, null, 2));
      log.success('Results saved', { path: filepath });
    } catch (error) {
      log.error('Failed to save results', error);
    }
  }

  /**
   * Run complete automation
   * @returns {Promise<Object>} Summary
   */
  async run() {
    const startTime = Date.now();
    
    try {
      // Load items
      this.items = await this.loadItems(this.options.itemsPath);
      
      if (this.items.length === 0) {
        log.warn('No items to process');
        return { success: true, total: 0, successful: 0 };
      }

      // Initialize (connect to browser)
      await this.initialize();

      // Process items
      await this.processItems(this.items);

      // Save results
      await this.saveResults();

      const duration = Date.now() - startTime;
      const summary = {
        success: true,
        total: this.items.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        duration
      };

      log.section('AUTOMATION COMPLETE');
      log.info('Summary:', summary);

      return summary;

    } catch (error) {
      log.error('Automation failed', error);
      
      // Take error screenshot
      await this.session.screenshot('heb-error');
      
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    log.info('Cleaning up...');
    await this.session.close();
  }
}

// ============================================================================
// CLI FUNCTIONS
// ============================================================================

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    verbose: false,
    itemsPath: null,
    debugPort: CONFIG.browser.debugPort
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        
      case '--dry-run':
        options.dryRun = true;
        break;
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--items':
        options.itemsPath = args[++i];
        break;
        
      case '--debug-port':
        options.debugPort = parseInt(args[++i], 10);
        break;
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
HEB Add to Cart - Refactored

Adds items from a JSON file to your HEB cart using browser automation.

Usage:
  node heb-add-cart-refactored.js [options]

Options:
  --help, -h         Show this help message
  --dry-run          Run without actually adding items
  --verbose, -v      Enable verbose logging
  --items PATH       Path to items JSON file
  --debug-port N     CDP debug port (default: 9222)

Examples:
  node heb-add-cart-refactored.js
  node heb-add-cart-refactored.js --dry-run
  node heb-add-cart-refactored.js --verbose --items ./my-items.json
`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const options = parseArgs();
  
  if (options.verbose) {
    logger.setLevel(3); // DEBUG
  }

  const automation = new HEBCartAutomation(options);
  
  try {
    const result = await automation.run();
    process.exit(result.successful === result.total ? 0 : 1);
  } catch (error) {
    log.error('Fatal error', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { HEBCartAutomation, CartTracker, validateCartItem };
