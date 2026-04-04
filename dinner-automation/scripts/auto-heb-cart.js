#!/usr/bin/env node
/**
 * HEB Auto-Cart Browser Automation
 * 
 * Automates Chrome with the HEB extension to:
 * 1. Launch Chrome with the extension loaded
 * 2. Navigate to heb.com
 * 3. Log in with stored credentials
 * 4. Load weekly-plan.json into the extension
 * 5. Start adding items to cart
 * 6. Monitor progress until complete
 * 
 * Usage:
 *   node scripts/auto-heb-cart.js
 *   node scripts/auto-heb-cart.js --headless
 *   node scripts/auto-heb-cart.js --plan path/to/plan.json
 * 
 * Requirements:
 *   - Playwright: npm install playwright
 *   - Chrome/Chromium installed
 *   - HEB credentials in environment variables
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { getHEBCredentials } = require('./credentials');

// Configuration
const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_PLAN_FILE = path.join(DATA_DIR, 'weekly-plan.json');

// Timeouts and delays (ms)
const TIMEOUTS = {
  navigation: 30000,
  element: 15000,
  popup: 5000,
  betweenItems: 5000,
  loginCheck: 3000
};

class HEBAutoCart {
  constructor(options = {}) {
    this.headless = options.headless !== false; // Default to headless
    this.planFile = options.planFile || DEFAULT_PLAN_FILE;
    this.credentials = getHEBCredentials();
    this.browser = null;
    this.extensionPage = null;
    this.hebPage = null;
    this.results = {
      success: false,
      itemsAdded: 0,
      itemsFailed: [],
      errors: []
    };
  }

  /**
   * Log with timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Load meal plan from JSON file
   * Supports both weekly-plan.json and heb-extension-items.json formats
   */
  loadMealPlan() {
    // First try heb-extension-items.json (new format with shoppingList)
    const extensionItemsFile = path.join(DATA_DIR, 'heb-extension-items.json');
    if (fs.existsSync(extensionItemsFile)) {
      try {
        const content = fs.readFileSync(extensionItemsFile, 'utf8');
        const data = JSON.parse(content);
        
        // Handle nested shoppingList format
        if (data.shoppingList) {
          const items = [];
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
                  status: 'pending'
                });
              }
            }
          }
          
          this.log(`Loaded ${items.length} items from heb-extension-items.json`);
          return { 
            plan: { weekOf: data.weekOf || 'current', meals: [] }, 
            items 
          };
        }
        
        // Handle flat items array
        if (data.items && Array.isArray(data.items)) {
          this.log(`Loaded ${data.items.length} items from heb-extension-items.json`);
          return { plan: { weekOf: 'current', meals: [] }, items: data.items };
        }
      } catch (e) {
        this.log(`Error reading extension items: ${e.message}`, 'warn');
      }
    }
    
    // Fallback to weekly-plan.json (legacy format)
    if (!fs.existsSync(this.planFile)) {
      throw new Error(`Meal plan file not found: ${this.planFile}`);
    }

    const content = fs.readFileSync(this.planFile, 'utf8');
    const plan = JSON.parse(content);

    // Extract unique items from meal plan
    const items = [];
    const seen = new Set();

    if (plan.meals && Array.isArray(plan.meals)) {
      for (const meal of plan.meals) {
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
              status: 'pending'
            });
          }
        }
      }
    }

    this.log(`Loaded ${items.length} unique items from meal plan`);
    return { plan, items };
  }

  /**
   * Launch Chrome with extension loaded
   */
  async launchBrowser() {
    this.log('Launching Chrome with HEB extension...');

    // Verify extension exists
    if (!fs.existsSync(EXTENSION_PATH)) {
      throw new Error(`Extension not found at: ${EXTENSION_PATH}`);
    }

    try {
      // Launch browser with extension
      this.browser = await chromium.launch({
        headless: this.headless,
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      this.log('Browser launched successfully');
    } catch (error) {
      // Clean up error message - don't include full browser logs
      const cleanError = error.message.split('\n')[0]; // Just first line
      throw new Error(`Browser launch failed: ${cleanError}. Please ensure Chrome dependencies are installed.`);
    }
  }

  /**
   * Navigate to HEB.com and verify login
   */
  async navigateToHEB() {
    this.log('Navigating to HEB.com...');

    // Create context and page
    const context = await this.browser.newContext();
    this.hebPage = await context.newPage();

    try {
      // Navigate to HEB
      await this.hebPage.goto('https://www.heb.com', {
        waitUntil: 'networkidle',
        timeout: TIMEOUTS.navigation
      });

      this.log('Loaded HEB.com');
    } catch (navError) {
      // Check for bot detection
      if (navError.message.includes('Timeout') || navError.message.includes('timeout')) {
        throw new Error('Navigation timeout - likely bot detection (Incapsula)');
      }
      throw navError;
    }

    // Check if already logged in
    const isLoggedIn = await this.checkLoginStatus();

    if (!isLoggedIn) {
      this.log('Not logged in, proceeding to login...');
      await this.performLogin();
    } else {
      this.log('Already logged in to HEB');
    }
  }

  /**
   * Check if user is logged in
   */
  async checkLoginStatus() {
    try {
      // Look for account/profile indicators
      const accountSelectors = [
        '[data-testid="account-menu-button"]',
        '[aria-label*="Account" i]',
        '.account-menu',
        '[data-automation-id*="account" i]',
        'text=My Account',
        'text=Sign Out'
      ];

      for (const selector of accountSelectors) {
        const element = await this.hebPage.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) return true;
        }
      }

      // Also check for cart icon (usually visible when logged in)
      const cartIcon = await this.hebPage.$('[data-testid="cart-icon"], [data-automation-id*="cart" i]');
      if (cartIcon) {
        const cartVisible = await cartIcon.isVisible().catch(() => false);
        if (cartVisible) {
          // Additional check: look for "Sign In" button to confirm NOT logged in
          const signInBtn = await this.hebPage.$('text=Sign In');
          return !signInBtn;
        }
      }

      return false;
    } catch (error) {
      this.log(`Login check error: ${error.message}`, 'warn');
      return false;
    }
  }

  /**
   * Perform login with stored credentials
   */
  async performLogin() {
    if (!this.credentials.password) {
      throw new Error(
        'HEB_PASSWORD not set in environment variables. ' +
        'Set it with: export HEB_PASSWORD=your_password'
      );
    }

    this.log(`Logging in as ${this.credentials.email}...`);

    // Click Sign In button
    const signInBtn = await this.hebPage.$('text=Sign In') ||
      await this.hebPage.$('[data-testid="sign-in-button"]') ||
      await this.hebPage.$('a[href*="login"]');

    if (!signInBtn) {
      throw new Error('Sign In button not found on page');
    }

    await signInBtn.click();
    await this.hebPage.waitForTimeout(TIMEOUTS.loginCheck);

    // Fill in credentials
    // Try multiple selectors for email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      '#email',
      '[data-testid*="email" i]'
    ];

    let emailField = null;
    for (const selector of emailSelectors) {
      emailField = await this.hebPage.$(selector);
      if (emailField) break;
    }

    if (!emailField) {
      throw new Error('Email field not found on login page');
    }

    await emailField.fill(this.credentials.email);
    this.log('Filled email');

    // Find and fill password
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password',
      '[data-testid*="password" i]'
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      passwordField = await this.hebPage.$(selector);
      if (passwordField) break;
    }

    if (!passwordField) {
      throw new Error('Password field not found on login page');
    }

    await passwordField.fill(this.credentials.password);
    this.log('Filled password');

    // Click submit/login button
    const submitBtn = await this.hebPage.$('button[type="submit"]') ||
      await this.hebPage.$('text=Sign In') ||
      await this.hebPage.$('[data-testid*="sign-in" i]') ||
      await this.hebPage.$('button:has-text("Sign")');

    if (submitBtn) {
      await submitBtn.click();
      this.log('Submitted login form');
    }

    // Wait for login to complete
    await this.hebPage.waitForTimeout(5000);

    // Verify login succeeded
    const isLoggedIn = await this.checkLoginStatus();
    if (!isLoggedIn) {
      // Check for error messages
      const errorMsg = await this.hebPage.$eval('.error-message, [role="alert"], .alert-error',
        el => el.textContent
      ).catch(() => null);

      if (errorMsg) {
        throw new Error(`Login failed: ${errorMsg.trim()}`);
      }

      throw new Error('Login failed: Could not verify login status');
    }

    this.log('Successfully logged in to HEB', 'success');
  }

  /**
   * Open extension popup and load items
   */
  async openExtensionPopup(items) {
    this.log('Opening HEB extension popup...');

    // Open the extension popup by navigating to its HTML file
    this.extensionPage = await this.browser.newPage();

    const popupPath = path.join(EXTENSION_PATH, 'popup.html');
    const popupUrl = 'file://' + popupPath.replace(/\\/g, '/');

    await this.extensionPage.goto(popupUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.navigation
    });

    this.log('Extension popup opened');

    // Wait for popup to be fully loaded
    await this.extensionPage.waitForSelector('#mealPlanInput', {
      timeout: TIMEOUTS.element
    });

    // Prepare meal plan data for the extension
    const mealPlanData = {
      meals: items.map(item => ({
        ingredients: [{
          name: item.name,
          hebSearch: item.searchTerm,
          amount: item.amount
        }]
      }))
    };

    // Inject the meal plan JSON into the textarea
    const jsonString = JSON.stringify(mealPlanData, null, 2);

    await this.extensionPage.evaluate((json) => {
      const textarea = document.getElementById('mealPlanInput');
      if (textarea) {
        textarea.value = json;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, jsonString);

    this.log('Meal plan data injected into extension');

    // Click "Load Items" button
    await this.extensionPage.click('#loadBtn');
    await this.extensionPage.waitForTimeout(1000);

    // Wait for items section to appear
    await this.extensionPage.waitForSelector('#itemsSection', {
      state: 'visible',
      timeout: TIMEOUTS.element
    });

    this.log('Items loaded into extension', 'success');
  }

  /**
   * Start the automation by clicking "Start Adding Items"
   */
  async startAutomation() {
    this.log('Starting item automation...');

    // Click the Start Adding Items button
    await this.extensionPage.click('#startBtn');

    this.log('Clicked "Start Adding Items"');

    // Wait for progress section to appear
    await this.extensionPage.waitForSelector('#progressSection.active', {
      timeout: TIMEOUTS.element
    });

    this.log('Automation started successfully', 'success');
  }

  /**
   * Monitor automation progress
   */
  async monitorProgress(totalItems) {
    this.log(`Monitoring progress for ${totalItems} items...`);

    const maxWaitTime = totalItems * 30000; // 30 seconds per item max
    const startTime = Date.now();
    let lastProgress = 0;
    let stalledCount = 0;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check current progress from the extension popup
        const progress = await this.extensionPage.evaluate(() => {
          const progressText = document.getElementById('progressText');
          const statusSection = document.getElementById('statusSection');

          // Parse progress text (format: "X / Y items added (Z%)")
          let completed = 0;
          let total = 0;

          if (progressText) {
            const match = progressText.textContent.match(/(\d+)\s*\/\s*(\d+)/);
            if (match) {
              completed = parseInt(match[1], 10);
              total = parseInt(match[2], 10);
            }
          }

          // Check for completion or error messages
          const statusHTML = statusSection ? statusSection.innerHTML : '';
          const isComplete = statusHTML.includes('Complete') || statusHTML.includes('Added') && completed === total;
          const hasError = statusHTML.includes('Error') || statusHTML.includes('❌');
          const errorMessage = hasError ? statusSection.textContent : null;

          return { completed, total, isComplete, hasError, errorMessage };
        });

        // Report progress
        if (progress.completed > lastProgress) {
          this.log(`Progress: ${progress.completed}/${progress.total} items added`);
          lastProgress = progress.completed;
          stalledCount = 0;
        } else {
          stalledCount++;
        }

        // Check for completion
        if (progress.isComplete) {
          this.results.itemsAdded = progress.completed;
          this.log('Automation completed successfully!', 'success');
          return true;
        }

        // Check for errors
        if (progress.hasError) {
          throw new Error(`Automation error: ${progress.errorMessage}`);
        }

        // Check if stalled (no progress for 60 seconds)
        if (stalledCount > 12) {
          throw new Error('Automation appears to be stalled (no progress for 60 seconds)');
        }

        // Wait before checking again
        await this.extensionPage.waitForTimeout(5000);

      } catch (error) {
        if (error.message.includes('Automation error') || error.message.includes('stalled')) {
          throw error;
        }
        // Continue monitoring on other errors
        await this.extensionPage.waitForTimeout(2000);
      }
    }

    throw new Error(`Automation timed out after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Get detailed results after completion
   */
  async getResults() {
    try {
      const results = await this.extensionPage.evaluate(() => {
        const statusSection = document.getElementById('statusSection');
        const itemList = document.getElementById('itemList');

        const statusText = statusSection ? statusSection.textContent : '';
        const failedItems = [];

        // Parse failed items from status text
        const failedMatch = statusText.match(/Failed:([^]+?)(?=\n|$)/);
        if (failedMatch) {
          const failedList = failedMatch[1].split(',').map(s => s.trim());
          failedItems.push(...failedList);
        }

        // Also check item statuses in the list
        const items = [];
        if (itemList) {
          const itemElements = itemList.querySelectorAll('.item');
          itemElements.forEach(el => {
            const name = el.querySelector('span:first-child')?.textContent || '';
            const status = el.querySelector('.item-status')?.textContent || 'unknown';
            items.push({ name, status });
          });
        }

        return { statusText, failedItems, items };
      });

      this.results.itemsFailed = results.failedItems || [];
      this.results.details = results;

      return this.results;
    } catch (error) {
      this.log(`Error getting results: ${error.message}`, 'warn');
      return this.results;
    }
  }

  /**
   * Alternative: Direct automation using content script injection
   * This bypasses the popup UI and runs the automation directly
   */
  async runDirectAutomation(items) {
    this.log('Running direct automation (bypassing popup UI)...');

    // Navigate to HEB
    await this.navigateToHEB();

    // Inject the content script directly into the page
    const contentScriptPath = path.join(EXTENSION_PATH, 'content.js');
    const contentScript = fs.readFileSync(contentScriptPath, 'utf8');

    // Execute the content script
    await this.hebPage.addScriptTag({ content: contentScript });
    this.log('Content script injected');

    // Wait for script to initialize
    await this.hebPage.waitForTimeout(1000);

    // Send startAutomation message
    const result = await this.hebPage.evaluate(async (automationItems) => {
      return new Promise((resolve) => {
        // Set up message listener for progress updates
        let completedItems = 0;
        let totalItems = automationItems.length;
        let failedItems = [];

        const messageHandler = (event) => {
          if (event.source !== window) return;

          const message = event.data;
          if (!message || !message.action) return;

          switch (message.action) {
            case 'automationStarted':
              console.log('Automation started:', message);
              break;

            case 'progress':
              completedItems = message.completed;
              console.log(`Progress: ${message.completed}/${message.total}`);
              break;

            case 'automationComplete':
              window.removeEventListener('message', messageHandler);
              resolve({
                success: true,
                added: message.added,
                total: message.total,
                failed: message.failedItems || []
              });
              break;

            case 'automationError':
              window.removeEventListener('message', messageHandler);
              resolve({
                success: false,
                error: message.error,
                completed: completedItems,
                total: totalItems
              });
              break;
          }
        };

        window.addEventListener('message', messageHandler);

        // Dispatch message to content script
        window.postMessage({
          action: 'startAutomation',
          items: automationItems
        }, '*');

        // Timeout after 30 minutes
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve({
            success: false,
            error: 'Timeout after 30 minutes',
            completed: completedItems,
            total: totalItems
          });
        }, 30 * 60 * 1000);
      });
    }, items);

    this.results = {
      success: result.success,
      itemsAdded: result.added || 0,
      itemsFailed: result.failed || [],
      totalItems: result.total,
      errors: result.error ? [result.error] : []
    };

    return this.results;
  }

  /**
   * Detect if error is due to bot detection (Incapsula)
   */
  isBotDetectionError(error) {
    const errorMsg = error.message.toLowerCase();
    return errorMsg.includes('timeout') || 
           errorMsg.includes('navigation') ||
           errorMsg.includes('incapsula') ||
           errorMsg.includes('blocked') ||
           errorMsg.includes('access denied') ||
           errorMsg.includes('403') ||
           errorMsg.includes('captcha');
  }

  /**
   * Generate Chrome extension fallback instructions
   */
  async generateExtensionFallback(items) {
    this.log('Bot detection encountered. Generating Chrome extension fallback...', 'warn');
    
    // Create a shopping list file for manual use
    const shoppingListPath = path.join(DATA_DIR, 'heb-shopping-list.txt');
    const shoppingList = items.map(item => 
      `- ${item.name} (${item.amount}) - Search: "${item.searchTerm}"`
    ).join('\n');
    
    const listContent = `HEB Shopping List - ${new Date().toLocaleDateString()}
========================================================

${shoppingList}

Total items: ${items.length}

========================================================
CHROME EXTENSION INSTRUCTIONS:
1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder: ${EXTENSION_PATH}
5. Navigate to heb.com and log in
6. Click the HEB Cart Helper extension icon
7. Paste the above shopping list or use the auto-load feature
8. Click "Add All Items" and let it run

Note: The Chrome extension runs in YOUR browser, which bypasses bot detection.
========================================================
`;
    
    fs.writeFileSync(shoppingListPath, listContent);
    
    // Also create a JSON version for the extension
    const jsonPath = path.join(DATA_DIR, 'heb-extension-items.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      items: items
    }, null, 2));
    
    this.log(`Shopping list saved to: ${shoppingListPath}`, 'success');
    this.log(`Extension items JSON saved to: ${jsonPath}`, 'success');
    this.log('Please use the Chrome extension to complete the cart.', 'warn');
    
    this.results = {
      success: false,
      fallbackUsed: true,
      fallbackMethod: 'chrome_extension',
      itemsAdded: 0,
      itemsFailed: items.map(i => ({ item: i.name, reason: 'Bot detection - use Chrome extension' })),
      errors: ['HEB bot detection blocked automation. Chrome extension fallback generated.'],
      shoppingListPath,
      extensionItemsPath: jsonPath,
      instructions: 'Use Chrome extension in heb-extension/ folder'
    };
    
    await this.saveResults();
    
    return this.results;
  }

  /**
   * Main run method
   */
  async run() {
    const startTime = Date.now();

    try {
      this.log('========================================');
      this.log('HEB AUTO-CART AUTOMATION STARTED');
      this.log('========================================');

      // Load meal plan
      const { plan, items } = this.loadMealPlan();
      this.log(`Processing ${items.length} items for week of ${plan.weekOf}`);

      // Launch browser
      await this.launchBrowser();

      // Use direct automation approach (more reliable)
      await this.runDirectAutomation(items);

      // Save results
      await this.saveResults();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (this.results.success) {
        this.log('========================================');
        this.log(`AUTOMATION COMPLETED in ${duration}s`, 'success');
        this.log(`Items added: ${this.results.itemsAdded}/${items.length}`);
        if (this.results.itemsFailed.length > 0) {
          this.log(`Failed items: ${this.results.itemsFailed.length}`, 'warn');
          this.results.itemsFailed.forEach(item => {
            this.log(`  - ${item.item || item}: ${item.error || 'Unknown error'}`, 'warn');
          });
        }
        this.log('========================================');
      } else {
        throw new Error(this.results.errors.join(', ') || 'Automation failed');
      }

      return this.results;

    } catch (error) {
      // Check if this is a bot detection error
      if (this.isBotDetectionError(error)) {
        this.log('Bot detection detected. Falling back to Chrome extension...', 'warn');
        
        // Close browser first
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
        }
        
        // Generate fallback
        const { plan, items } = this.loadMealPlan();
        return await this.generateExtensionFallback(items);
      }
      
      this.results.errors.push(error.message);
      this.log(`Automation failed: ${error.message}`, 'error');
      await this.saveResults();
      throw error;
    } finally {
      if (this.browser) {
        this.log('Closing browser...');
        await this.browser.close();
      }
    }
  }

  /**
   * Save results to file
   */
  async saveResults() {
    const resultsFile = path.join(DATA_DIR, 'heb-cart-results.json');
    const results = {
      timestamp: new Date().toISOString(),
      ...this.results
    };

    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    this.log(`Results saved to: ${resultsFile}`);
  }

  /**
   * Clear the HEB cart - removes all items
   * Used when rebuilding meal plans
   */
  async clearCart() {
    this.log('Clearing HEB cart...');

    if (!this.browser) {
      await this.launchBrowser();
    }

    if (!this.hebPage) {
      await this.navigateToHEB();
    }

    try {
      // Navigate to cart page
      await this.hebPage.goto('https://www.heb.com/cart', {
        waitUntil: 'networkidle',
        timeout: TIMEOUTS.navigation
      });

      this.log('Loaded cart page');

      // Check if cart is empty
      const emptyCartIndicators = [
        'text=Your cart is empty',
        'text=Cart is empty',
        '[data-testid="empty-cart"]',
        '.empty-cart-message'
      ];

      for (const selector of emptyCartIndicators) {
        const element = await this.hebPage.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            this.log('Cart is already empty');
            return { success: true, cleared: false, reason: 'already_empty' };
          }
        }
      }

      // Try "Remove All" or "Clear Cart" button
      const clearCartSelectors = [
        'button:has-text("Remove All")',
        'button:has-text("Clear Cart")',
        'button:has-text("Empty Cart")',
        '[data-testid*="remove-all"]',
        '[data-testid*="clear-cart"]',
        'button:has-text("Remove all items")'
      ];

      for (const selector of clearCartSelectors) {
        const button = await this.hebPage.$(selector);
        if (button) {
          const isVisible = await button.isVisible().catch(() => false);
          if (isVisible) {
            await button.click();
            await this.hebPage.waitForTimeout(3000);
            this.log('Clicked clear cart button');
            return { success: true, cleared: true, method: 'clear_all_button' };
          }
        }
      }

      // If no clear all button, remove items one by one
      this.log('No clear all button found, removing items individually...');

      let removedCount = 0;
      const maxIterations = 50; // Safety limit

      for (let i = 0; i < maxIterations; i++) {
        const removeSelectors = [
          'button:has-text("Remove")',
          '[data-testid*="remove"]',
          'button[aria-label*="Remove"]',
          'button[title*="Remove"]',
          '.cart-item-remove',
          '[data-automation-id*="remove"]'
        ];

        let removed = false;
        for (const selector of removeSelectors) {
          const button = await this.hebPage.$(selector);
          if (button) {
            const isVisible = await button.isVisible().catch(() => false);
            if (isVisible) {
              await button.click();
              await this.hebPage.waitForTimeout(1500);
              removed = true;
              removedCount++;
              break;
            }
          }
        }

        if (!removed) break;
      }

      this.log(`Removed ${removedCount} items from cart`);
      return { success: true, cleared: removedCount > 0, itemsRemoved: removedCount, method: 'individual' };

    } catch (error) {
      this.log(`Failed to clear cart: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update cart with new items (clear + add)
   * Used for cart rebuilds
   */
  async updateCart(weeklyPlan) {
    this.log('========================================');
    this.log('HEB CART UPDATE STARTED');
    this.log('========================================');

    const startTime = Date.now();

    try {
      // Step 1: Clear existing cart
      const clearResult = await this.clearCart();
      if (!clearResult.success) {
        this.log('Warning: Could not clear cart, proceeding anyway', 'warn');
      }

      // Step 2: Load new meal plan items
      let items;
      if (weeklyPlan) {
        // Use provided plan
        const planData = { meals: weeklyPlan.meals || weeklyPlan };
        items = this.extractItemsFromPlan(planData);
      } else {
        // Load from file
        const { plan } = this.loadMealPlan();
        items = this.extractItemsFromPlan(plan);
      }

      this.log(`Adding ${items.length} new items to cart`);

      // Step 3: Add new items using direct automation
      const addResult = await this.runDirectAutomation(items);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      this.log('========================================');
      this.log(`CART UPDATE COMPLETED in ${duration}s`);
      this.log(`Items added: ${addResult.itemsAdded}/${items.length}`);
      if (addResult.itemsFailed.length > 0) {
        this.log(`Items failed: ${addResult.itemsFailed.length}`, 'warn');
      }
      this.log('========================================');

      return {
        success: addResult.success,
        cartCleared: clearResult.cleared,
        itemsAdded: addResult.itemsAdded,
        itemsFailed: addResult.itemsFailed,
        totalItems: items.length,
        duration: parseFloat(duration),
        clearResult,
        addResult
      };

    } catch (error) {
      this.log(`Cart update failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        itemsAdded: 0,
        itemsFailed: []
      };
    }
  }

  /**
   * Extract items from meal plan (helper method)
   */
  extractItemsFromPlan(plan) {
    const items = [];
    const seen = new Set();

    if (!plan.meals || !Array.isArray(plan.meals)) {
      throw new Error('Invalid plan: missing meals array');
    }

    for (const meal of plan.meals) {
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
            status: 'pending'
          });
        }
      }
    }

    this.log(`Extracted ${items.length} unique items from meal plan`);
    return items;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    headless: !args.includes('--headed'),
    planFile: null
  };

  // Parse plan file argument
  const planIndex = args.indexOf('--plan');
  if (planIndex !== -1 && args[planIndex + 1]) {
    options.planFile = path.resolve(args[planIndex + 1]);
  }

  // Parse headless argument
  if (args.includes('--headless')) {
    options.headless = true;
  }

  // Handle fallback-only mode (for self-recovery system)
  if (args.includes('--fallback-only')) {
    try {
      const automation = new HEBAutoCart(options);
      const { plan, items } = automation.loadMealPlan();
      automation.log(`Generating fallback for ${items.length} items`, 'info');
      const result = await automation.generateExtensionFallback(items);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(`\n❌ Fallback generation failed: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HEB Auto-Cart Browser Automation

Usage:
  node scripts/auto-heb-cart.js [options]

Options:
  --plan <path>      Path to meal plan JSON file (default: data/weekly-plan.json)
  --headed           Run browser in headed mode (visible)
  --headless         Run browser in headless mode (default)
  --fallback-only    Generate Chrome extension fallback without running automation
  --help, -h         Show this help message

Examples:
  node scripts/auto-heb-cart.js
  node scripts/auto-heb-cart.js --headed
  node scripts/auto-heb-cart.js --plan /path/to/custom-plan.json
  node scripts/auto-heb-cart.js --fallback-only

Environment Variables:
  HEB_EMAIL          HEB.com login email (default: alex@1v1a.com)
  HEB_PASSWORD       HEB.com login password (required)
`);
    process.exit(0);
  }

  try {
    const automation = new HEBAutoCart(options);
    const results = await automation.run();
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { HEBAutoCart };

/**
 * Standalone function to update HEB cart (clear + add)
 * Used by rebuild workflow
 */
async function updateHEBCart(weeklyPlan, options = {}) {
  const autoCart = new HEBAutoCart(options);
  
  try {
    await autoCart.launchBrowser();
    const result = await autoCart.updateCart(weeklyPlan);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      itemsAdded: 0,
      itemsFailed: []
    };
  } finally {
    if (autoCart.browser) {
      await autoCart.browser.close();
    }
  }
}

/**
 * Standalone function to clear HEB cart
 */
async function clearHEBCart(options = {}) {
  const autoCart = new HEBAutoCart(options);
  
  try {
    await autoCart.launchBrowser();
    await autoCart.navigateToHEB();
    const result = await autoCart.clearCart();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (autoCart.browser) {
      await autoCart.browser.close();
    }
  }
}

module.exports = { HEBAutoCart, updateHEBCart, clearHEBCart };
