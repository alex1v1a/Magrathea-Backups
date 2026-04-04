/**
 * AutomationBase - Base class for site-specific automations
 * Provides common functionality for automated browser tasks
 */

const { StealthBrowser, logger } = require('./StealthBrowser');
const { CredentialManager } = require('./CredentialManager');
const { AutoLogin } = require('./AutoLogin');
const fs = require('fs');
const path = require('path');

/**
 * Base class for all site automations
 */
class AutomationBase {
  constructor(options = {}) {
    this.name = options.name || 'unnamed-automation';
    this.profileName = options.profile || this.name;
    this.headless = options.headless !== false;
    this.slowMo = options.slowMo || 50;
    
    // Components
    this.browser = null;
    this.credentials = new CredentialManager();
    this.autoLogin = null;
    
    // State
    this.isRunning = false;
    this.errors = [];
    this.stats = {
      startedAt: null,
      completedAt: null,
      actionsPerformed: 0,
      errors: 0
    };
    
    // Retry configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
  }
  
  /**
   * Initialize the automation
   */
  async initialize() {
    logger.info(`Initializing automation: ${this.name}`);
    
    this.browser = new StealthBrowser({
      profile: this.profileName,
      headless: this.headless,
      slowMo: this.slowMo
    });
    
    await this.browser.launch();
    this.autoLogin = new AutoLogin(this.browser, this.credentials);
    
    this.isRunning = true;
    this.stats.startedAt = new Date().toISOString();
    
    logger.info(`Automation initialized: ${this.name}`);
  }
  
  /**
   * Execute the automation with error recovery
   */
  async execute(task, ...args) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Executing task: ${task} (attempt ${attempt}/${this.maxRetries})`);
        const result = await task.call(this, ...args);
        this.stats.actionsPerformed++;
        return result;
      } catch (error) {
        this.errors.push({ task, attempt, error: error.message, timestamp: new Date().toISOString() });
        this.stats.errors++;
        logger.error(`Task ${task} failed (attempt ${attempt}):`, error);
        
        if (attempt < this.maxRetries) {
          logger.info(`Waiting ${this.retryDelay}ms before retry...`);
          await this.browser.sleep(this.retryDelay);
          
          // Try to recover
          await this.recover();
        } else {
          throw error;
        }
      }
    }
  }
  
  /**
   * Recovery logic for when things go wrong
   */
  async recover() {
    logger.info('Attempting recovery...');
    
    try {
      // Check if browser is still connected
      if (!this.browser.isBrowserRunning()) {
        logger.warn('Browser disconnected, restarting...');
        await this.browser.restart();
        this.autoLogin = new AutoLogin(this.browser, this.credentials);
      }
      
      // Try to go back to previous page
      await this.browser.goBack();
      await this.browser.randomDelay(2000, 4000);
      
      logger.info('Recovery successful');
    } catch (error) {
      logger.error('Recovery failed:', error);
      
      // Last resort - restart everything
      try {
        await this.browser.restart();
        this.autoLogin = new AutoLogin(this.browser, this.credentials);
      } catch (restartError) {
        logger.error('Browser restart failed:', restartError);
      }
    }
  }
  
  /**
   * Take a screenshot with descriptive name
   */
  async screenshot(name = null) {
    const filename = `${this.name}-${name || Date.now()}.png`;
    return await this.browser.screenshot({ filename });
  }
  
  /**
   * Log in to the site
   */
  async login(credentials = null) {
    if (!this.autoLogin) {
      throw new Error('Automation not initialized. Call initialize() first.');
    }
    
    return await this.autoLogin.login(this.name, { credentials });
  }
  
  /**
   * Check if logged in
   */
  async isLoggedIn() {
    return await this.autoLogin.isLoggedIn(this.name);
  }
  
  /**
   * Ensure logged in (login if not already)
   */
  async ensureLoggedIn() {
    const loggedIn = await this.isLoggedIn();
    if (!loggedIn) {
      return await this.login();
    }
    return { success: true, alreadyLoggedIn: true };
  }
  
  /**
   * Wait for element to be present and visible
   */
  async waitForElement(selector, timeout = 10000) {
    return await this.browser.waitForSelector(selector, { timeout, visible: true });
  }
  
  /**
   * Safe click with retry
   */
  async safeClick(selector, options = {}) {
    return await this.execute(async () => {
      await this.browser.click(selector, options);
    });
  }
  
  /**
   * Safe type with retry
   */
  async safeType(selector, text, options = {}) {
    return await this.execute(async () => {
      await this.browser.type(selector, text, options);
    });
  }
  
  /**
   * Navigate with retry
   */
  async safeNavigate(url, options = {}) {
    return await this.execute(async () => {
      await this.browser.navigate(url, options);
    });
  }
  
  /**
   * Scroll page
   */
  async scroll(options = {}) {
    await this.browser.scroll(options);
  }
  
  /**
   * Get current URL
   */
  async getUrl() {
    return await this.browser.getCurrentUrl();
  }
  
  /**
   * Get page title
   */
  async getTitle() {
    return await this.browser.getTitle();
  }
  
  /**
   * Find elements by text content
   */
  async findByText(text, tag = '*') {
    return await this.browser.evaluate((t, tagName) => {
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
    const selector = `${tag}:has-text("${text}")`;
    await this.browser.click(selector);
  }
  
  /**
   * Wait for text to appear on page
   */
  async waitForText(text, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const pageText = await this.browser.evaluate(() => document.body.innerText);
      if (pageText.includes(text)) {
        return true;
      }
      await this.browser.sleep(500);
    }
    throw new Error(`Text "${text}" not found within ${timeout}ms`);
  }
  
  /**
   * Save data to file
   */
  saveData(filename, data) {
    const filepath = path.join(__dirname, '../logs', `${this.name}-${filename}`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    logger.info(`Data saved to ${filepath}`);
  }
  
  /**
   * Load data from file
   */
  loadData(filename) {
    const filepath = path.join(__dirname, '../logs', `${this.name}-${filename}`);
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
    return null;
  }
  
  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      errors: this.errors,
      sessionDuration: this.browser ? this.browser.getSessionDuration() : 0
    };
  }
  
  /**
   * Shutdown the automation
   */
  async shutdown() {
    logger.info(`Shutting down automation: ${this.name}`);
    
    this.stats.completedAt = new Date().toISOString();
    this.isRunning = false;
    
    if (this.browser) {
      await this.browser.close();
    }
    
    logger.info(`Automation shutdown complete: ${this.name}`);
    logger.info('Final stats:', this.getStats());
  }
}

module.exports = { AutomationBase };
