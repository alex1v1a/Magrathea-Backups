/**
 * Browser Automation Patterns
 * Reusable patterns for Playwright-based browser automation
 */

const { chromium } = require('playwright');
const { withRetry, sleep } = require('./retry-utils');
const { logger } = require('./logger');

/**
 * Smart selector that tries multiple selectors in order
 * @param {Page} page - Playwright page
 * @param {string[]} selectors - Array of selectors to try
 * @param {Object} options - Options
 * @returns {Promise<ElementHandle|null>}
 */
async function smartSelector(page, selectors, options = {}) {
  const { visible = true, timeout = 5000 } = options;
  
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        if (visible) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) return element;
        } else {
          return element;
        }
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  return null;
}

/**
 * Wait for any of multiple selectors
 * @param {Page} page - Playwright page
 * @param {string[]} selectors - Selectors to wait for
 * @param {Object} options - Options
 * @returns {Promise<ElementHandle>}
 */
async function waitForAnySelector(page, selectors, options = {}) {
  const { timeout = 10000 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const visible = await element.isVisible().catch(() => false);
          if (visible) return element;
        }
      } catch (e) {
        // Continue
      }
    }
    await sleep(100);
  }
  
  throw new Error(`None of the selectors appeared within ${timeout}ms: ${selectors.join(', ')}`);
}

/**
 * Click with multiple fallback selectors
 * @param {Page} page - Playwright page
 * @param {string[]} selectors - Selectors to try
 * @param {Object} options - Options
 */
async function smartClick(page, selectors, options = {}) {
  const { timeout = 10000, waitForNavigation = false } = options;
  
  return withRetry(async () => {
    const element = await smartSelector(page, selectors, { timeout });
    if (!element) {
      throw new Error(`Could not find element with selectors: ${selectors.join(', ')}`);
    }
    
    if (waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout }),
        element.click()
      ]);
    } else {
      await element.click();
    }
  }, {
    maxRetries: 3,
    baseDelay: 500,
    onRetry: (attempt, max, delay) => {
      logger.debug(`Click retry ${attempt}/${max}, waiting ${delay}ms`);
    }
  });
}

/**
 * Type text with clear and retry
 * @param {Page} page - Playwright page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 * @param {Object} options - Options
 */
async function smartType(page, selector, text, options = {}) {
  const { clearFirst = true, timeout = 5000 } = options;
  
  return withRetry(async () => {
    const element = await page.waitForSelector(selector, { timeout });
    if (clearFirst) {
      await element.fill('');
    }
    await element.fill(text);
  }, {
    maxRetries: 3,
    baseDelay: 500
  });
}

/**
 * Check if logged in by looking for specific elements
 * @param {Page} page - Playwright page
 * @param {Object} options - Options
 * @returns {Promise<boolean>}
 */
async function checkLoginStatus(page, options = {}) {
  const { 
    loginIndicators = [],
    logoutIndicators = [],
    timeout = 5000 
  } = options;
  
  try {
    // Check for logout indicators first (more reliable)
    for (const indicator of logoutIndicators) {
      const element = await page.$(indicator);
      if (element) return false;
    }
    
    // Check for login indicators
    for (const indicator of loginIndicators) {
      const element = await page.$(indicator);
      if (element) {
        const visible = await element.isVisible().catch(() => false);
        if (visible) return true;
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Session manager for persistent browser sessions
 */
class SessionManager {
  constructor(options = {}) {
    this.userDataDir = options.userDataDir;
    this.debugPort = options.debugPort || 9222;
    this.browser = null;
    this.context = null;
    this.page = null;
  }
  
  /**
   * Connect to existing Chrome or launch new browser
   */
  async connect() {
    try {
      // Try connecting to existing Chrome (CDP)
      if (this.debugPort) {
        try {
          this.browser = await chromium.connectOverCDP(`http://localhost:${this.debugPort}`);
          logger.info(`Connected to Chrome on port ${this.debugPort}`);
          this.context = this.browser.contexts()[0];
          this.page = this.context.pages()[0] || await this.context.newPage();
          return;
        } catch (e) {
          logger.debug(`Could not connect to CDP: ${e.message}`);
        }
      }
      
      // Launch persistent browser
      if (this.userDataDir) {
        this.browser = await chromium.launchPersistentContext(this.userDataDir, {
          headless: false,
          viewport: { width: 1280, height: 720 }
        });
        this.context = this.browser;
        this.page = await this.context.newPage();
        logger.info('Launched persistent browser context');
      } else {
        // Launch temporary browser
        this.browser = await chromium.launch({ headless: false });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
        logger.info('Launched temporary browser');
      }
    } catch (e) {
      logger.error('Failed to initialize browser:', e.message);
      throw e;
    }
  }
  
  /**
   * Close browser gracefully
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        logger.info('Browser closed');
      }
    } catch (e) {
      logger.warn('Error closing browser:', e.message);
    }
  }
  
  /**
   * Take screenshot with error handling
   */
  async screenshot(name) {
    try {
      if (this.page) {
        const path = `screenshot-${name}-${Date.now()}.png`;
        await this.page.screenshot({ path, fullPage: true });
        logger.debug(`Screenshot saved: ${path}`);
        return path;
      }
    } catch (e) {
      logger.warn('Screenshot failed:', e.message);
    }
    return null;
  }
}

/**
 * Rate limiter for controlling request frequency
 */
class RateLimiter {
  constructor(options = {}) {
    this.minDelay = options.minDelay || 1000;
    this.maxDelay = options.maxDelay || 5000;
    this.lastRequest = 0;
  }
  
  async wait() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    const delay = Math.max(0, this.minDelay - elapsed);
    
    if (delay > 0) {
      await sleep(delay);
    }
    
    // Add jitter
    const jitter = Math.random() * (this.maxDelay - this.minDelay);
    await sleep(jitter);
    
    this.lastRequest = Date.now();
  }
}

module.exports = {
  smartSelector,
  waitForAnySelector,
  smartClick,
  smartType,
  checkLoginStatus,
  SessionManager,
  RateLimiter
};
