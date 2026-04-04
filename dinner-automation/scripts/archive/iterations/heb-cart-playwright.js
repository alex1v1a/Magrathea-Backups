#!/usr/bin/env node
/**
 * HEB Cart Automation - Playwright Edition
 * Direct browser automation for HEB.com shopping cart
 * 
 * Features:
 * - Automated login with environment variable credentials
 * - Direct search and add-to-cart functionality
 * - Retry logic and error handling
 * - State persistence for resume capability
 * - Headless mode support
 * 
 * Usage:
 *   node heb-cart-playwright.js
 *   node heb-cart-playwright.js --headless
 *   node heb-cart-playwright.js --list heb-extension-items.json
 *   node heb-cart-playwright.js --resume
 * 
 * Environment Variables:
 *   HEB_EMAIL     - HEB.com login email (default: alex@1v1a.com)
 *   HEB_PASSWORD  - HEB.com login password (required)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'heb-cart-state.json');
const DEFAULT_LIST_FILE = path.join(DATA_DIR, 'heb-extension-items.json');

const CONFIG = {
  navigationTimeout: 30000,
  elementTimeout: 10000,
  actionDelay: 2000,
  retryAttempts: 3,
  retryDelay: 3000
};

function getCredentials() {
  const email = process.env.HEB_EMAIL || 'alex@1v1a.com';
  const password = process.env.HEB_PASSWORD;
  if (!password) {
    throw new Error(
      'HEB_PASSWORD environment variable is required.\n' +
      'Set it with: export HEB_PASSWORD=your_password (Linux/Mac)\n' +
      'Or: set HEB_PASSWORD=your_password (Windows CMD)\n' +
      'Or: $env:HEB_PASSWORD="your_password" (PowerShell)'
    );
  }
  return { email, password };
}

class Logger {
  constructor() {
    this.logs = [];
  }
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const icon = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[level] || 'ℹ️';
    const line = `[${timestamp}] ${icon} ${message}`;
    console.log(line);
    this.logs.push({ timestamp, level, message });
  }
  save() {
    const logFile = path.join(DATA_DIR, 'heb-cart-playwright.log');
    const content = this.logs.map(l => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    fs.writeFileSync(logFile, content + '\n', 'utf8');
  }
}

class StateManager {
  constructor() {
    this.state = this.load();
  }
  load() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch (e) {
      console.warn('Could not load state file:', e.message);
    }
    return {
      items: [],
      completed: [],
      failed: [],
      inProgress: null,
      sessionStart: null,
      lastUpdate: null
    };
  }
  save() {
    this.state.lastUpdate = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
  }
  setItems(items) {
    this.state.items = items;
    this.state.sessionStart = new Date().toISOString();
    this.save();
  }
  markCompleted(itemName) {
    if (!this.state.completed.includes(itemName)) {
      this.state.completed.push(itemName);
    }
    this.state.inProgress = null;
    this.save();
  }
  markFailed(itemName, error) {
    this.state.failed.push({ name: itemName, error, time: new Date().toISOString() });
    this.state.inProgress = null;
    this.save();
  }
  setInProgress(itemName) {
    this.state.inProgress = itemName;
    this.save();
  }
  getPendingItems() {
    return this.state.items.filter(item =>
      !this.state.completed.includes(item.name) &&
      !this.state.failed.find(f => f.name === item.name)
    );
  }
  getStats() {
    return {
      total: this.state.items.length,
      completed: this.state.completed.length,
      failed: this.state.failed.length,
      pending: this.getPendingItems().length
    };
  }
}

class HEBCartAutomation {
  constructor(options = {}) {
    this.logger = new Logger();
    this.state = new StateManager();
    this.credentials = getCredentials();
    this.browser = null;
    this.page = null;
    this.options = {
      headless: options.headless || false,
      listFile: options.listFile || DEFAULT_LIST_FILE,
      resume: options.resume || false
    };
  }

  async init() {
    this.logger.log('Launching browser...', 'info');
    
    // Use headed mode by default for stability (set --headless for background)
    const headless = this.options.headless;
    
    try {
      this.browser = await chromium.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      
      // Create a new context and page
      const context = await this.browser.newContext();
      this.page = await context.newPage();
      this.page.setDefaultTimeout(CONFIG.elementTimeout);
      this.page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);
      
      this.logger.log('Browser launched successfully', 'success');
    } catch (err) {
      this.logger.log(`Browser launch failed: ${err.message}`, 'error');
      throw err;
    }
  }

  async login() {
    this.logger.log('Navigating to HEB.com...', 'info');
    try {
      await this.page.goto('https://www.heb.com', { waitUntil: 'networkidle', timeout: CONFIG.navigationTimeout });
      await this.delay(2000);
      await this.handleInitialPopups();
    } catch (error) {
      this.logger.log(`Navigation warning: ${error.message}`, 'warn');
    }

    const isLoggedIn = await this.checkLoginStatus();
    if (isLoggedIn) {
      this.logger.log('Already logged in', 'success');
      return;
    }

    this.logger.log('Logging in...', 'info');

    const signInSelectors = [
      'a[href*="login"]',
      'button:has-text("Sign In")',
      '[data-testid="sign-in-button"]',
      'text=Sign In',
      'a:has-text("Sign In")'
    ];

    let signInBtn = null;
    for (const selector of signInSelectors) {
      signInBtn = await this.page.$(selector);
      if (signInBtn) break;
    }
    if (!signInBtn) {
      signInBtn = await this.page.$('header a:has-text("Sign")');
    }
    if (signInBtn) {
      await signInBtn.click();
      await this.delay(3000);
    } else {
      this.logger.log('Sign In button not found, may need manual login', 'warn');
    }

    await this.fillCredentials();

    const loginSuccess = await this.verifyLogin();
    if (!loginSuccess) {
      throw new Error('Login verification failed');
    }
    this.logger.log('Login successful', 'success');
  }

  async handleInitialPopups() {
    const popupSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Not Now")',
      'button:has-text("No Thanks")',
      '[aria-label="Close"]',
      '.modal-close',
      'button.close'
    ];
    for (const selector of popupSelectors) {
      try {
        const popup = await this.page.$(selector);
        if (popup) {
          const visible = await popup.isVisible().catch(() => false);
          if (visible) {
            await popup.click();
            await this.delay(500);
          }
        }
      } catch {}
    }
  }

  async checkLoginStatus() {
    try {
      const loggedInSelectors = [
        '[data-testid="account-menu"]',
        'text=My Account',
        'text=Sign Out',
        'button:has-text("Account")',
        '.account-dropdown'
      ];
      for (const selector of loggedInSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          const visible = await element.isVisible().catch(() => false);
          if (visible) return true;
        }
      }
      const signInSelectors = [
        'text=Sign In',
        'a:has-text("Sign In")',
        'button:has-text("Sign In")'
      ];
      let signInFound = false;
      for (const selector of signInSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          const visible = await element.isVisible().catch(() => false);
          if (visible) {
            signInFound = true;
            break;
          }
        }
      }
      return !signInFound;
    } catch {
      return false;
    }
  }

  async fillCredentials() {
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      '#email',
      'input[id*="email" i]'
    ];
    let emailField = null;
    for (const selector of emailSelectors) {
      emailField = await this.page.$(selector);
      if (emailField) break;
    }
    if (!emailField) throw new Error('Email field not found');
    await emailField.fill(this.credentials.email);
    this.logger.log(`Filled email: ${this.credentials.email}`, 'info');

    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password',
      'input[id*="password" i]'
    ];
    let passwordField = null;
    for (const selector of passwordSelectors) {
      passwordField = await this.page.$(selector);
      if (passwordField) break;
    }
    if (!passwordField) throw new Error('Password field not found');
    await passwordField.fill(this.credentials.password);
    this.logger.log('Filled password', 'info');

    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'input[type="submit"]',
      '[data-testid*="signin" i]',
      '[data-testid*="login" i]'
    ];
    let submitBtn = null;
    for (const selector of submitSelectors) {
      submitBtn = await this.page.$(selector);
      if (submitBtn) break;
    }
    if (submitBtn) {
      await submitBtn.click();
      await this.delay(5000);
    } else {
      await passwordField.press('Enter');
      await this.delay(5000);
    }
  }

  async verifyLogin() {
    for (let i = 0; i < 3; i++) {
      await this.delay(2000);
      const isLoggedIn = await this.checkLoginStatus();
      if (isLoggedIn) return true;
      const errorSelectors = [
        '.error-message',
        '[role="alert"]',
        '.alert-error',
        'text=incorrect',
        'text=Invalid'
      ];
      for (const selector of errorSelectors) {
        const error = await this.page.$(selector);
        if (error) {
          const text = await error.textContent().catch(() => '');
          if (text.toLowerCase().includes('incorrect') || text.toLowerCase().includes('invalid')) {
            throw new Error(`Login failed: ${text}`);
          }
        }
      }
    }
    return false;
  }

  loadShoppingList() {
    if (!fs.existsSync(this.options.listFile)) {
      throw new Error(`Shopping list not found: ${this.options.listFile}`);
    }
    const content = fs.readFileSync(this.options.listFile, 'utf8');
    const data = JSON.parse(content);
    const items = data.items || data;
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No items found in shopping list');
    }
    this.logger.log(`Loaded ${items.length} items from shopping list`, 'success');
    return items;
  }

  async addItemToCart(item) {
    const searchTerm = item.searchTerm || item.name;
    this.logger.log(`Adding: ${item.name} (${searchTerm})`, 'info');
    this.state.setInProgress(item.name);

    try {
      await this.searchItem(searchTerm);
      const added = await this.selectAndAddProduct(item);
      if (added) {
        // Close any cart modals that appeared
        await this.closeCartModal();
        this.state.markCompleted(item.name);
        this.logger.log(`Added: ${item.name}`, 'success');
      } else {
        throw new Error('Could not add item to cart');
      }
    } catch (error) {
      this.state.markFailed(item.name, error.message);
      this.logger.log(`Failed: ${item.name} - ${error.message}`, 'error');
    }

    await this.delay(CONFIG.actionDelay);
  }

  async searchItem(searchTerm) {
    // Handle any popups that might appear
    await this.handlePopups();
    
    // Updated selectors based on HEB.com inspection
    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[placeholder*="search" i]',
      'header input'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        const elements = await this.page.$$(selector);
        for (const el of elements) {
          const visible = await el.isVisible().catch(() => false);
          if (visible) {
            searchInput = el;
            break;
          }
        }
        if (searchInput) break;
      } catch {}
    }
    
    if (!searchInput) {
      throw new Error('Search input not found on page');
    }

    // Clear and fill search
    await searchInput.click();
    await searchInput.fill('');
    await this.delay(500);
    await searchInput.fill(searchTerm);
    await this.delay(500);
    await searchInput.press('Enter');
    
    // Wait for search results to load
    await this.delay(6000);
  }
  
  async handlePopups() {
    // Close common popups and modals
    const closeSelectors = [
      'button:has-text("Close")',
      '[aria-label="Close"]',
      '.modal-close',
      '.popup-close',
      'button[aria-label*="close" i]',
      'button:has-text("Continue Shopping")',
      'button:has-text("Keep Shopping")'
    ];
    for (const selector of closeSelectors) {
      try {
        const closeBtn = await this.page.$(selector);
        if (closeBtn) {
          const visible = await closeBtn.isVisible().catch(() => false);
          if (visible) {
            await closeBtn.click();
            await this.delay(500);
          }
        }
      } catch {}
    }
  }

  async closeCartModal() {
    // Close any cart confirmation modals that appear after adding items
    const modalSelectors = [
      'button:has-text("Continue Shopping")',
      'button:has-text("Keep Shopping")',
      '[aria-label="Close cart modal"]',
      '.cart-modal button[class*="close"]'
    ];
    for (const selector of modalSelectors) {
      try {
        const btn = await this.page.$(selector);
        if (btn) {
          const visible = await btn.isVisible().catch(() => false);
          if (visible) {
            await btn.click();
            await this.delay(1000);
            return;
          }
        }
      } catch {}
    }
  }

  async selectAndAddProduct(item) {
    // Wait a moment for products to load
    await this.delay(3000);
    
    // Try to find add buttons using evaluate (more stable than $$)
    const buttonInfo = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('add') && (text.includes('cart') || text.includes('to'));
        })
        .slice(0, 5)
        .map((btn, index) => ({
          index,
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
          visible: btn.offsetParent !== null
        }));
    });
    
    if (buttonInfo.length === 0) {
      throw new Error('No add-to-cart buttons found');
    }
    
    this.logger.log(`Found ${buttonInfo.length} potential add buttons`, 'info');

    // Try clicking the first visible, enabled button
    for (const info of buttonInfo) {
      if (info.disabled || !info.visible) continue;
      
      try {
        this.logger.log(`Clicking: ${info.text}`, 'info');
        
        // Click using evaluate to avoid page context issues
        await this.page.evaluate((buttonText) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent?.trim() === buttonText);
          if (btn) btn.click();
        }, info.text);
        
        await this.delay(4000);
        
        // Check if we're still on a valid page
        const url = this.page.url();
        if (url.includes('cart') || url.includes('checkout')) {
          // We navigated to cart, go back to search
          await this.page.goBack();
          await this.delay(3000);
        }
        
        return true;
      } catch (err) {
        this.logger.log(`Failed on button: ${err.message}`, 'warn');
        continue;
      }
    }
    
    return false;
  }

  async getProductNameNearButton(button) {
    try {
      // Try to find product name by looking at parent elements
      const productName = await button.evaluate(el => {
        let parent = el.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const nameEl = parent.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
          if (nameEl) return nameEl.textContent?.trim();
          parent = parent.parentElement;
        }
        return null;
      });
      return productName;
    } catch {
      return null;
    }
  }

  async handleQuantitySelection(item) {
    const qtySelectors = [
      'input[type="number"]',
      '[data-testid*="quantity" i]',
      'select'
    ];
    for (const selector of qtySelectors) {
      try {
        const qtyElement = await this.page.$(selector);
        if (qtyElement) {
          const visible = await qtyElement.isVisible().catch(() => false);
          if (visible) {
            const qty = this.extractQuantity(item.amount);
            if (qty > 1) {
              await qtyElement.fill(qty.toString());
              await this.delay(500);
              const confirmBtn = await this.page.$('button:has-text("Update"), button:has-text("Confirm")');
              if (confirmBtn) {
                await confirmBtn.click();
                await this.delay(1000);
              }
            }
          }
        }
      } catch {}
    }
  }

  extractQuantity(amount) {
    if (!amount) return 1;
    const match = amount.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  async verifyItemAdded() {
    // Check for various confirmation indicators
    const confirmIndicators = [
      { selector: 'text=/added to cart/i', type: 'text' },
      { selector: '.toast, [role="status"]', type: 'element' },
      { selector: '[data-testid*="cart" i]', type: 'element' },
      { selector: '.cart-count, [class*="cart-count"]', type: 'element' }
    ];
    
    for (const indicator of confirmIndicators) {
      try {
        if (indicator.type === 'text') {
          const text = await this.page.textContent('body');
          if (text?.toLowerCase().includes('added to cart')) {
            return true;
          }
        } else {
          const element = await this.page.$(indicator.selector);
          if (element) {
            const visible = await element.isVisible().catch(() => false);
            if (visible) return true;
          }
        }
      } catch {}
    }
    
    // If we can't confirm, assume success (button was clickable and clicked)
    return true;
  }

  async ensurePageOpen() {
    // Check if page is still valid, recreate if needed
    try {
      await this.page.evaluate(() => document.title);
      return true;
    } catch {
      this.logger.log('Page closed, creating new page...', 'warn');
      try {
        this.page = await this.browser.newPage();
        return true;
      } catch (err) {
        this.logger.log(`Failed to create new page: ${err.message}`, 'error');
        return false;
      }
    }
  }

  async processItems(items) {
    if (!this.options.resume) {
      this.state.setItems(items);
    }
    const pending = this.options.resume ? this.state.getPendingItems() : items;
    if (pending.length === 0) {
      this.logger.log('No pending items to process', 'success');
      return;
    }
    this.logger.log(`Processing ${pending.length} items...`, 'info');

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      this.logger.log(`[${i + 1}/${pending.length}] Processing: ${item.name}`, 'info');
      
      // Ensure page is open and navigate to homepage before each item
      try {
        const pageOk = await this.ensurePageOpen();
        if (!pageOk) {
          this.logger.log('Could not ensure page is open, skipping item', 'error');
          this.state.markFailed(item.name, 'Browser page unavailable');
          continue;
        }
        
        await this.page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
        await this.delay(3000);
        await this.handlePopups();
      } catch (err) {
        this.logger.log(`Navigation warning: ${err.message}`, 'warn');
      }
      
      let attempts = 0;
      let success = false;
      while (attempts < CONFIG.retryAttempts && !success) {
        attempts++;
        try {
          await this.addItemToCart(item);
          success = true;
        } catch (error) {
          if (attempts < CONFIG.retryAttempts) {
            this.logger.log(`Retry ${attempts}/${CONFIG.retryAttempts} for ${item.name}`, 'warn');
            // Ensure page is open and navigate to homepage on retry
            try {
              await this.ensurePageOpen();
              await this.page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
              await this.delay(3000);
            } catch {}
          } else {
            this.logger.log(`Failed after ${CONFIG.retryAttempts} attempts: ${item.name}`, 'error');
          }
        }
      }
      
      // Brief pause between items
      await this.delay(2000);
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printSummary() {
    const stats = this.state.getStats();
    console.log('\n' + '='.repeat(50));
    console.log('HEB CART AUTOMATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Items:   ${stats.total}`);
    console.log(`Added:         ${stats.completed} ✅`);
    console.log(`Failed:        ${stats.failed} ❌`);
    console.log(`Pending:       ${stats.pending} ⏳`);
    console.log('='.repeat(50));
    if (stats.failed > 0) {
      console.log('\nFailed Items:');
      this.state.state.failed.forEach(f => {
        console.log(`  - ${f.name}: ${f.error}`);
      });
    }
    console.log(`\nState saved to: ${STATE_FILE}`);
  }

  async run() {
    try {
      await this.init();
      await this.login();
      let items;
      if (this.options.resume) {
        this.logger.log('Resuming from previous session...', 'info');
        items = this.state.getPendingItems();
      } else {
        items = this.loadShoppingList();
      }
      await this.processItems(items);
      this.printSummary();
    } catch (error) {
      this.logger.log(`Automation error: ${error.message}`, 'error');
      throw error;
    } finally {
      this.logger.save();
      if (this.browser) await this.browser.close();
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    headless: args.includes('--headless'),
    resume: args.includes('--resume'),
    listFile: DEFAULT_LIST_FILE
  };
  const listIndex = args.indexOf('--list');
  if (listIndex !== -1 && args[listIndex + 1]) {
    options.listFile = path.resolve(args[listIndex + 1]);
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HEB Cart Automation - Playwright Edition

Usage:
  node heb-cart-playwright.js [options]

Options:
  --headless          Run in headless mode (no visible browser)
  --resume            Resume from previous session
  --list <file>       Use custom shopping list file
  --help, -h          Show this help message

Environment Variables:
  HEB_EMAIL           HEB.com login email (default: alex@1v1a.com)
  HEB_PASSWORD        HEB.com login password (required)

Examples:
  node heb-cart-playwright.js
  node heb-cart-playwright.js --headless
  node heb-cart-playwright.js --list my-items.json
  node heb-cart-playwright.js --resume
`);
    process.exit(0);
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const automation = new HEBCartAutomation(options);
  try {
    await automation.run();
    process.exit(0);
  } catch (error) {
    console.error('\nAutomation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { HEBCartAutomation, StateManager, Logger };
