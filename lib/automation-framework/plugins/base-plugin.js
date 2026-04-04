/**
 * Base Plugin - Foundation for all site-specific plugins
 * 
 * Provides common functionality:
 * - Browser instance management
 * - Navigation helpers
 * - Safe element operations
 * - Event handling
 * - Stats tracking
 */

const EventEmitter = require('events');
const { AntiBot } = require('../core/anti-bot');
const { RetryManager } = require('../core/retry-manager');
const { BrowserPool } = require('../core/browser-pool');

class BasePlugin extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = options;
    this.name = options.name || 'unnamed-plugin';
    this.baseUrl = options.baseUrl || '';
    this.profileName = options.profile || `${this.name}-default`;
    this.headless = options.headless !== false;
    this.slowMo = options.slowMo || 50;
    
    // Components
    this.browserPool = options.browserPool || new BrowserPool();
    this.browser = null;
    this.page = null;
    this.context = null;
    this.antiBot = new AntiBot(options.antiBot);
    this.retryManager = new RetryManager(options.retry);
    
    // State
    this.initialized = false;
    this.stats = {
      actionsPerformed: 0,
      errors: 0,
      startTime: null,
      lastAction: null
    };
    
    // Logger
    this.logger = options.logger || console;
    
    // Setup retry event handlers
    this.setupRetryHandlers();
  }

  /**
   * Setup retry manager event handlers
   */
  setupRetryHandlers() {
    this.retryManager.on('operation:retry', (data) => {
      this.emit('retry', data);
      this.logger.warn(`Retry ${data.attempt}/${data.maxRetries} for ${data.operationType}: ${data.error}`);
    });
    
    this.retryManager.on('operation:failure', (data) => {
      this.stats.errors++;
      this.emit('error', data);
    });
    
    this.retryManager.on('operation:success', (data) => {
      this.stats.actionsPerformed++;
      this.stats.lastAction = new Date().toISOString();
    });
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    if (this.initialized) return;
    
    this.logger.info(`Initializing ${this.name} plugin...`);
    
    // Initialize browser pool
    await this.browserPool.initialize();
    
    // Acquire browser instance
    this.browser = await this.browserPool.acquire(this.profileName, {
      headless: this.headless,
      slowMo: this.slowMo,
      target: this.options?.browser || 'chrome'
    });
    
    this.page = this.browser.page;
    this.context = this.browser.context;
    
    // Inject anti-detection
    await this.antiBot.injectAntiDetection(this.page);
    
    // Setup page event handlers
    this.setupPageHandlers();
    
    this.initialized = true;
    this.stats.startTime = new Date().toISOString();
    
    this.logger.info(`${this.name} plugin initialized`);
    this.emit('initialized');
    
    return this;
  }

  /**
   * Setup page event handlers
   */
  setupPageHandlers() {
    this.page.on('error', (error) => {
      this.logger.error('Page error:', error);
      this.emit('page:error', error);
    });
    
    this.page.on('pageerror', (error) => {
      this.logger.warn('Page JS error:', error.message);
      this.emit('page:jserror', error);
    });
    
    this.page.on('requestfailed', (request) => {
      this.logger.warn(`Request failed: ${request.url()}`);
    });
    
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        this.logger.warn(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
    
    this.page.on('dialog', async (dialog) => {
      this.logger.info(`Dialog appeared: ${dialog.type()} - ${dialog.message()}`);
      this.emit('dialog', dialog);
    });
  }

  /**
   * Navigate to URL
   */
  async navigate(pathOrUrl) {
    const url = pathOrUrl.startsWith('http') 
      ? pathOrUrl 
      : `${this.baseUrl}${pathOrUrl}`;
    
    await this.retryManager.execute('navigation', async () => {
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
    });
    
    await this.antiBot.pageLoadDelay();
  }

  /**
   * Check if element exists
   */
  async elementExists(selector) {
    return this.page.evaluate((sel) => {
      return !!document.querySelector(sel);
    }, selector);
  }

  /**
   * Wait for element with timeout
   */
  async waitForElement(selector, timeout = 10000) {
    return this.page.waitForSelector(selector, { 
      visible: true, 
      timeout 
    });
  }

  /**
   * Safe element evaluation
   */
  async safeEvaluate(fn, ...args) {
    try {
      return await this.page.evaluate(fn, ...args);
    } catch (error) {
      this.logger.warn('Safe evaluate failed:', error.message);
      return null;
    }
  }

  /**
   * Get element text
   */
  async getText(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el?.textContent?.trim() || null;
    }, selector);
  }

  /**
   * Get element attribute
   */
  async getAttribute(selector, attribute) {
    return this.page.evaluate((sel, attr) => {
      const el = document.querySelector(sel);
      return el?.getAttribute(attr) || null;
    }, selector, attribute);
  }

  /**
   * Find elements by text content
   */
  async findByText(text, tag = '*') {
    return this.page.evaluate((t, tagName) => {
      const elements = document.querySelectorAll(tagName);
      return Array.from(elements)
        .filter(el => el.textContent.includes(t))
        .map(el => ({
          tag: el.tagName,
          text: el.textContent.trim(),
          id: el.id,
          class: el.className
        }));
    }, text, tag);
  }

  /**
   * Click element by text
   */
  async clickByText(text, tag = 'button') {
    const elements = await this.findByText(text, tag);
    if (elements.length > 0) {
      const selector = `${tag}:has-text("${text}")`;
      await this.antiBot.humanClick(this.page, selector);
      return true;
    }
    return false;
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const hasText = await this.page.evaluate((t) => {
        return document.body.innerText.includes(t);
      }, text);
      
      if (hasText) return true;
      await this.antiBot.sleep(500, 500);
    }
    throw new Error(`Text "${text}" not found within ${timeout}ms`);
  }

  /**
   * Scroll page
   */
  async scroll(options = {}) {
    await this.antiBot.humanScroll(this.page, options);
  }

  /**
   * Take screenshot
   */
  async screenshot(name = null) {
    const timestamp = Date.now();
    const filename = `${this.name}-${name || timestamp}.png`;
    
    const path = await this.page.screenshot({
      path: `./screenshots/${filename}`,
      fullPage: true
    });
    
    this.logger.info(`Screenshot saved: ${filename}`);
    return { filename, path };
  }

  /**
   * Get current URL
   */
  async getUrl() {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle() {
    return this.page.title();
  }

  /**
   * Reload page
   */
  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.antiBot.pageLoadDelay();
  }

  /**
   * Go back
   */
  async goBack() {
    await this.page.goBack();
    await this.antiBot.sleep(1000, 2000);
  }

  /**
   * Get cookies
   */
  async getCookies() {
    return this.context.cookies();
  }

  /**
   * Set cookies
   */
  async setCookies(cookies) {
    await this.context.addCookies(cookies);
  }

  /**
   * Clear cookies
   */
  async clearCookies() {
    await this.context.clearCookies();
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    return {
      ...this.stats,
      antiBot: this.antiBot.getStats(),
      retry: this.retryManager.getStats(),
      browser: this.browser?.getMetrics()
    };
  }

  /**
   * Check if logged in (override in subclass)
   */
  async isLoggedIn() {
    throw new Error('isLoggedIn must be implemented by subclass');
  }

  /**
   * Login (override in subclass)
   */
  async login(credentials) {
    throw new Error('login must be implemented by subclass');
  }

  /**
   * Shutdown plugin
   */
  async shutdown() {
    this.logger.info(`Shutting down ${this.name} plugin...`);
    
    if (this.browser) {
      await this.browserPool.release(this.browser.id);
    }
    
    this.initialized = false;
    this.emit('shutdown');
    
    this.logger.info(`${this.name} plugin shutdown complete`);
  }
}

module.exports = { BasePlugin };
