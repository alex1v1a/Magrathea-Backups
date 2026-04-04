/**
 * HEB Cart Automation - Optimized v2
 * Uses new shared libraries for better performance and reliability
 * 
 * Improvements:
 * - HTTP client with caching for API calls
 * - Selector engine for resilient element selection
 * - Anti-detection v2 for better bot evasion
 * - Batched processing with progress tracking
 * - Comprehensive metrics collection
 * 
 * Usage:
 *   node heb-cart-optimized-v2.js
 *   node heb-cart-optimized-v2.js --headless
 *   node heb-cart-optimized-v2.js --plan path/to/plan.json
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Import new optimized libraries
const {
  HTTPClient,
  SelectorEngine,
  SELECTOR_GROUPS,
  AntiDetection,
  Batcher,
  Profiler,
  ProgressTracker,
  withRetry,
  logger
} = require('../lib');

// Configuration
const CONFIG = {
  EXTENSION_PATH: path.join(__dirname, '..', 'heb-extension'),
  DATA_DIR: path.join(__dirname, '..', 'data'),
  DEFAULT_PLAN_FILE: path.join(__dirname, '..', 'data', 'heb-extension-items.json'),
  SCREENSHOT_DIR: path.join(__dirname, '..', 'data', 'screenshots'),
  
  TIMEOUTS: {
    navigation: 30000,
    element: 15000,
    betweenItems: 3000,
    batchDelay: 8000
  },
  
  BATCH: {
    size: 5,
    delayMin: 5000,
    delayMax: 10000
  }
};

class OptimizedHEBCart {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      planFile: options.planFile || CONFIG.DEFAULT_PLAN_FILE,
      useAntiDetection: options.useAntiDetection !== false,
      ...options
    };
    
    this.browser = null;
    this.page = null;
    this.selectorEngine = null;
    this.antiDetection = null;
    this.httpClient = new HTTPClient({ timeout: 15000 });
    this.profiler = new Profiler();
    
    this.results = {
      success: false,
      itemsAdded: 0,
      itemsFailed: [],
      startTime: null,
      endTime: null,
      metrics: {}
    };
  }

  /**
   * Load meal plan from JSON
   */
  loadMealPlan() {
    const timer = this.profiler.start('loadMealPlan');
    
    try {
      if (!fs.existsSync(this.options.planFile)) {
        throw new Error(`Plan file not found: ${this.options.planFile}`);
      }

      const data = JSON.parse(fs.readFileSync(this.options.planFile, 'utf8'));
      const items = [];

      // Handle shoppingList format
      if (data.shoppingList) {
        const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
        for (const category of categories) {
          if (data.shoppingList[category]) {
            for (const item of data.shoppingList[category]) {
              items.push({
                name: item.item,
                searchTerm: item.searchTerms?.[0] || item.item,
                quantity: item.quantity || '1',
                category,
                status: 'pending'
              });
            }
          }
        }
      } else if (data.items) {
        items.push(...data.items);
      }

      timer.end();
      logger.info(`Loaded ${items.length} items from meal plan`);
      return items;
    } catch (error) {
      timer.end();
      throw error;
    }
  }

  /**
   * Launch browser with anti-detection
   */
  async launchBrowser() {
    const timer = this.profiler.start('launchBrowser');
    
    try {
      this.antiDetection = new AntiDetection({
        enabled: this.options.useAntiDetection,
        stealthLevel: 'high',
        humanLike: true
      });

      const contextOptions = this.antiDetection.getStealthContextOptions();
      const launchArgs = this.antiDetection.getStealthLaunchArgs();

      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: [
          ...launchArgs,
          `--disable-extensions-except=${CONFIG.EXTENSION_PATH}`,
          `--load-extension=${CONFIG.EXTENSION_PATH}`
        ]
      });

      const context = await this.browser.newContext(contextOptions);
      this.page = await context.newPage();
      
      // Inject stealth scripts
      await this.antiDetection.injectStealthScripts(this.page);
      
      // Initialize selector engine
      this.selectorEngine = new SelectorEngine(this.page);

      timer.end();
      logger.success('Browser launched with anti-detection');
      
    } catch (error) {
      timer.end();
      throw error;
    }
  }

  /**
   * Navigate to HEB and handle login
   */
  async navigateAndLogin() {
    const timer = this.profiler.start('navigateAndLogin');
    
    try {
      // Navigate to HEB
      await this.page.goto('https://www.heb.com', {
        waitUntil: 'networkidle',
        timeout: CONFIG.TIMEOUTS.navigation
      });

      // Check for challenges
      const challenge = await this.antiDetection.detectChallenge(this.page);
      if (challenge.detected) {
        logger.warn(`Challenge detected: ${challenge.selector || challenge.type}`);
        // Could implement human-in-the-loop here
      }

      // Check login status
      const isLoggedIn = await this.checkLoginStatus();
      
      if (!isLoggedIn) {
        await this.performLogin();
      } else {
        logger.info('Already logged in');
      }

      timer.end();
      
    } catch (error) {
      timer.end();
      throw error;
    }
  }

  /**
   * Check if logged in
   */
  async checkLoginStatus() {
    try {
      const accountElement = await this.selectorEngine.findElement(
        SELECTOR_GROUPS.navigation.account,
        { timeout: 3000 }
      );
      return !!accountElement;
    } catch {
      return false;
    }
  }

  /**
   * Perform login
   */
  async performLogin() {
    logger.info('Logging in...');

    // Click sign in
    await this.selectorEngine.smartClick(SELECTOR_GROUPS.login.submit);
    await this.page.waitForTimeout(2000);

    // Fill credentials using human-like typing
    await this.antiDetection.humanLikeType(
      this.page,
      SELECTOR_GROUPS.login.email[0],
      process.env.HEB_EMAIL || 'alex@1v1a.com'
    );

    await this.page.waitForTimeout(500);

    await this.antiDetection.humanLikeType(
      this.page,
      SELECTOR_GROUPS.login.password[0],
      process.env.HEB_PASSWORD
    );

    // Submit
    await this.selectorEngine.smartClick(SELECTOR_GROUPS.login.submit);
    await this.page.waitForTimeout(5000);

    // Verify login
    const loggedIn = await this.checkLoginStatus();
    if (!loggedIn) {
      throw new Error('Login failed');
    }

    logger.success('Login successful');
  }

  /**
   * Clear existing cart
   */
  async clearCart() {
    const timer = this.profiler.start('clearCart');
    
    try {
      await this.page.goto('https://www.heb.com/cart', {
        waitUntil: 'networkidle',
        timeout: CONFIG.TIMEOUTS.navigation
      });

      let removedCount = 0;
      const maxAttempts = 50;

      for (let i = 0; i < maxAttempts; i++) {
        const removed = await this.page.evaluate(() => {
          const removeBtn = document.querySelector(
            'button[data-automation-id*="remove"], button[aria-label*="Remove"]'
          );
          if (removeBtn) {
            removeBtn.click();
            return true;
          }
          return false;
        });

        if (!removed) break;
        
        removedCount++;
        await this.page.waitForTimeout(1000);
      }

      timer.end();
      logger.info(`Cleared ${removedCount} items from cart`);
      
    } catch (error) {
      timer.end();
      logger.warn(`Could not clear cart: ${error.message}`);
    }
  }

  /**
   * Add single item to cart
   */
  async addItem(item, index) {
    const itemTimer = this.profiler.start(`addItem_${item.name}`);
    
    try {
      logger.info(`[${index + 1}] Adding: ${item.name}`);

      // Navigate to search
      await this.page.goto(
        `https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm)}`,
        { waitUntil: 'networkidle', timeout: CONFIG.TIMEOUTS.navigation }
      );

      // Random delay
      await this.antiDetection.randomDelay(1000, 2500);

      // Check for challenges
      const challenge = await this.antiDetection.detectChallenge(this.page);
      if (challenge.detected) {
        throw new Error(`Challenge detected while adding ${item.name}`);
      }

      // Find and click add button
      const addButton = await this.selectorEngine.findElement(
        SELECTOR_GROUPS.cart.addButton,
        { timeout: 5000 }
      );

      if (!addButton) {
        throw new Error('Add button not found');
      }

      // Human-like interaction
      const box = await addButton.boundingBox();
      if (box) {
        await this.antiDetection.humanLikeMouseMovement(
          this.page,
          box.x + box.width / 2,
          box.y + box.height / 2
        );
      }

      await addButton.click();
      await this.page.waitForTimeout(2000);

      itemTimer.end();
      return { success: true, item: item.name };

    } catch (error) {
      itemTimer.end();
      logger.error(`Failed to add ${item.name}: ${error.message}`);
      return { success: false, item: item.name, error: error.message };
    }
  }

  /**
   * Add all items using batch processing
   */
  async addAllItems(items) {
    const timer = this.profiler.start('addAllItems');
    
    logger.info(`Adding ${items.length} items in batches of ${CONFIG.BATCH.size}`);

    const batcher = new Batcher({
      batchSize: CONFIG.BATCH.size,
      delayBetween: { min: CONFIG.BATCH.delayMin, max: CONFIG.BATCH.delayMax },
      parallel: false
    });

    const progress = new ProgressTracker(items.length, { label: 'Adding items' });
    
    const results = await batcher.process(items, async (item, index) => {
      const result = await this.addItem(item, index);
      progress.update();
      return result;
    });

    timer.end();

    // Calculate results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    this.results.itemsAdded = successful.length;
    this.results.itemsFailed = failed;

    logger.success(`Added ${successful.length}/${items.length} items`);
    
    return results;
  }

  /**
   * Save screenshot
   */
  async saveScreenshot(name = 'cart-final') {
    try {
      if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
        fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
      }

      const filename = path.join(
        CONFIG.SCREENSHOT_DIR,
        `${name}-${Date.now()}.png`
      );

      await this.page.screenshot({ path: filename, fullPage: true });
      logger.info(`Screenshot saved: ${filename}`);
      
      return filename;
    } catch (error) {
      logger.warn(`Screenshot failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Save results to file
   */
  saveResults() {
    const resultsFile = path.join(CONFIG.DATA_DIR, 'heb-cart-results-v2.json');
    
    this.results.endTime = new Date().toISOString();
    this.results.metrics = this.profiler.getReport();
    
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    logger.info(`Results saved: ${resultsFile}`);
  }

  /**
   * Main execution
   */
  async run() {
    this.results.startTime = new Date().toISOString();
    
    try {
      logger.info('========================================');
      logger.info('HEB CART AUTOMATION - OPTIMIZED V2');
      logger.info('========================================');

      // Load items
      const items = this.loadMealPlan();

      // Launch browser
      await this.launchBrowser();

      // Navigate and login
      await this.navigateAndLogin();

      // Clear existing cart
      await this.clearCart();

      // Add all items
      await this.addAllItems(items);

      // Save screenshot
      await this.saveScreenshot();

      // Mark success
      this.results.success = this.results.itemsFailed.length === 0;

      logger.info('========================================');
      logger.success('AUTOMATION COMPLETE');
      logger.info(`Items added: ${this.results.itemsAdded}/${items.length}`);
      logger.info('========================================');

    } catch (error) {
      logger.error(`Fatal error: ${error.message}`);
      this.results.success = false;
      this.results.fatalError = error.message;
    } finally {
      // Cleanup
      if (this.browser) {
        await this.browser.close();
      }

      // Save results
      this.saveResults();

      // Print performance report
      this.profiler.printReport();
    }

    return this.results;
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const options = {
    headless: !args.includes('--headed'),
    useAntiDetection: !args.includes('--no-stealth')
  };

  const planIndex = args.indexOf('--plan');
  if (planIndex !== -1 && args[planIndex + 1]) {
    options.planFile = path.resolve(args[planIndex + 1]);
  }

  if (args.includes('--help')) {
    console.log(`
HEB Cart Automation - Optimized v2

Usage:
  node heb-cart-optimized-v2.js [options]

Options:
  --plan <path>    Path to meal plan JSON
  --headed         Run in headed mode (visible browser)
  --no-stealth     Disable anti-detection measures
  --help           Show this help
`);
    process.exit(0);
  }

  const automation = new OptimizedHEBCart(options);
  const results = await automation.run();
  
  process.exit(results.success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { OptimizedHEBCart };
