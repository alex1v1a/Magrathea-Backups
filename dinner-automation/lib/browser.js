/**
 * Browser Automation Helpers
 * 
 * Provides high-level browser automation patterns for Playwright-based
 * interactions with HEB and Facebook. Includes smart selectors, human-like
 * interactions, and page state management.
 * 
 * @module lib/browser
 */

const { logger } = require('./logger');
const { sleep, withRetry, withTimeout } = require('./retry-utils');

// Default configuration for browser operations
const BROWSER_CONFIG = {
  navigation: {
    timeout: 30000,
    waitUntil: 'networkidle',
    retryAttempts: 2
  },
  interaction: {
    minDelay: 1000,
    maxDelay: 3000,
    clickDelay: 50,
    typeDelay: 30
  },
  selector: {
    timeout: 5000,
    pollInterval: 100
  }
};

/**
 * Smart selector that tries multiple selectors in order
 * @param {Page} page - Playwright page object
 * @param {string[]} selectors - Array of selector strings to try
 * @param {Object} options - Selection options
 * @param {number} options.timeout - Maximum wait time (default: 5000ms)
 * @param {boolean} options.visible - Require element to be visible (default: true)
 * @returns {Promise<Locator|null>} Playwright locator or null if not found
 * 
 * @example
 * const button = await smartSelector(page, [
 *   '[data-testid="add-to-cart"]',
 *   'button:has-text("Add to Cart")',
 *   '.add-cart-btn'
 * ]);
 */
async function smartSelector(page, selectors, options = {}) {
  const config = { ...BROWSER_CONFIG.selector, ...options };
  const timeoutPerSelector = config.timeout / selectors.length;
  
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      
      if (config.visible) {
        await locator.waitFor({ 
          state: 'visible', 
          timeout: timeoutPerSelector 
        });
      } else {
        await locator.waitFor({ 
          state: 'attached', 
          timeout: timeoutPerSelector 
        });
      }
      
      return locator;
    } catch {
      continue;
    }
  }
  
  return null;
}

/**
 * Smart click that tries multiple selectors and adds human-like delays
 * @param {Page} page - Playwright page object
 * @param {string[]} selectors - Array of selector strings
 * @param {Object} options - Click options
 * @returns {Promise<boolean>} True if click succeeded
 * 
 * @example
 * const clicked = await smartClick(page, [
 *   'button:has-text("Add to Cart")',
 *   '[data-testid="add-to-cart"]'
 * ]);
 */
async function smartClick(page, selectors, options = {}) {
  const element = await smartSelector(page, selectors, options);
  
  if (!element) {
    logger.debug('Smart click: No element found for selectors', { selectors });
    return false;
  }
  
  try {
    // Human-like delay before click
    await sleep(BROWSER_CONFIG.interaction.clickDelay);
    
    // Scroll into view
    await element.scrollIntoViewIfNeeded({ timeout: 3000 });
    await sleep(100);
    
    // Perform click with slight delay (human-like)
    await element.click({ delay: BROWSER_CONFIG.interaction.clickDelay });
    
    return true;
  } catch (error) {
    logger.debug('Smart click failed', { error: error.message, selectors });
    return false;
  }
}

/**
 * Smart type with human-like delays between keystrokes
 * @param {Page} page - Playwright page object
 * @param {string[]} selectors - Array of selector strings
 * @param {string} text - Text to type
 * @param {Object} options - Type options
 * @returns {Promise<boolean>} True if type succeeded
 */
async function smartType(page, selectors, text, options = {}) {
  const element = await smartSelector(page, selectors, options);
  
  if (!element) {
    logger.debug('Smart type: No element found', { selectors });
    return false;
  }
  
  try {
    // Clear existing text
    await element.fill('');
    await sleep(100);
    
    // Type with delays
    await element.type(text, { delay: options.delay || BROWSER_CONFIG.interaction.typeDelay });
    
    return true;
  } catch (error) {
    logger.debug('Smart type failed', { error: error.message, selectors });
    return false;
  }
}

/**
 * Check login status based on page indicators
 * @param {Page} page - Playwright page object
 * @param {Object} options - Login check options
 * @param {string[]} options.loginIndicators - Selectors indicating logged-in state
 * @param {string[]} options.logoutIndicators - Selectors indicating logged-out state
 * @returns {Promise<boolean|null>} True if logged in, false if logged out, null if unknown
 * 
 * @example
 * const isLoggedIn = await checkLoginStatus(page, {
 *   loginIndicators: ['[data-testid="account-menu"]', '[href="/my-account"]'],
 *   logoutIndicators: ['input[name="email"]', 'button:has-text("Sign In")']
 * });
 */
async function checkLoginStatus(page, options = {}) {
  const { loginIndicators = [], logoutIndicators = [] } = options;
  
  // Check login indicators
  for (const selector of loginIndicators) {
    try {
      const visible = await page.locator(selector).isVisible({ timeout: 2000 });
      if (visible) return true;
    } catch {
      continue;
    }
  }
  
  // Check logout indicators
  for (const selector of logoutIndicators) {
    try {
      const visible = await page.locator(selector).isVisible({ timeout: 2000 });
      if (visible) return false;
    } catch {
      continue;
    }
  }
  
  return null; // Unknown state
}

/**
 * Navigate with retry and custom wait conditions
 * @param {Page} page - Playwright page object
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @returns {Promise<Response|null>} Navigation response
 */
async function smartNavigate(page, url, options = {}) {
  const config = { ...BROWSER_CONFIG.navigation, ...options };
  
  return withRetry(async () => {
    const response = await page.goto(url, {
      waitUntil: config.waitUntil,
      timeout: config.timeout
    });
    
    if (!response) {
      throw new Error('Navigation returned null response');
    }
    
    if (response.status() >= 400) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }
    
    return response;
  }, {
    maxRetries: config.retryAttempts,
    delay: 1000,
    backoff: 1.5
  });
}

/**
 * Wait for any of multiple selectors to appear
 * @param {Page} page - Playwright page object
 * @param {string[]} selectors - Array of selector strings
 * @param {Object} options - Wait options
 * @returns {Promise<{found: boolean, selector: string|null, locator: Locator|null}>}
 */
async function waitForAnySelector(page, selectors, options = {}) {
  const timeout = options.timeout || 5000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const locator = page.locator(selector).first();
        const visible = await locator.isVisible({ timeout: 500 });
        if (visible) {
          return { found: true, selector, locator };
        }
      } catch {
        continue;
      }
    }
    
    await sleep(options.pollInterval || 100);
  }
  
  return { found: false, selector: null, locator: null };
}

/**
 * Scroll element into view with human-like behavior
 * @param {Page} page - Playwright page object
 * @param {Locator|string} target - Element or selector to scroll to
 * @param {Object} options - Scroll options
 */
async function humanLikeScroll(page, target, options = {}) {
  const { amount = null, steps = 3, stepDelay = 200 } = options;
  
  if (typeof target === 'string') {
    // Scroll to selector
    const element = page.locator(target).first();
    const box = await element.boundingBox();
    
    if (box) {
      // Scroll in steps (human-like)
      const targetY = box.y;
      const currentY = await page.evaluate(() => window.scrollY);
      const stepSize = (targetY - currentY) / steps;
      
      for (let i = 1; i <= steps; i++) {
        await page.evaluate(y => window.scrollTo(0, y), currentY + stepSize * i);
        await sleep(stepDelay + Math.random() * 100);
      }
    }
  } else if (amount) {
    // Scroll by amount with pauses
    const stepAmount = amount / steps;
    for (let i = 0; i < steps; i++) {
      await page.evaluate(y => window.scrollBy(0, y), stepAmount);
      await sleep(stepDelay + Math.random() * 100);
    }
  }
}

/**
 * Wait for page to be in ready state
 * @param {Page} page - Playwright page object
 * @param {Object} options - Wait options
 * @returns {Promise<void>}
 */
async function waitForPageReady(page, options = {}) {
  const { timeout = 10000, waitForNetworkIdle = true } = options;
  
  // Wait for DOM ready
  await page.waitForFunction(() => document.readyState === 'complete', { timeout });
  
  // Wait for network idle if requested
  if (waitForNetworkIdle) {
    await page.waitForLoadState('networkidle', { timeout });
  }
  
  // Small delay for any final rendering
  await sleep(500);
}

/**
 * Check if element exists without throwing
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {Promise<boolean>}
 */
async function elementExists(page, selector) {
  try {
    const count = await page.locator(selector).count();
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Safe evaluation with error handling
 * @param {Page} page - Playwright page object
 * @param {Function} fn - Function to evaluate in page context
 * @param {any} arg - Argument to pass to function
 * @returns {Promise<any>} Result or null on error
 */
async function safeEvaluate(page, fn, arg = null) {
  try {
    return await page.evaluate(fn, arg);
  } catch (error) {
    logger.debug('Safe evaluate failed', { error: error.message });
    return null;
  }
}

/**
 * Session manager for persistent browser sessions
 */
class SessionManager {
  constructor(options = {}) {
    this.debugPort = options.debugPort || 9222;
    this.page = null;
    this.browser = null;
    this.context = null;
    this.screenshotDir = options.screenshotDir || './screenshots';
  }

  /**
   * Connect to existing browser via CDP
   * @returns {Promise<Object>} { browser, context, page }
   */
  async connect() {
    const { chromium } = require('playwright');
    
    this.browser = await chromium.connectOverCDP(`http://localhost:${this.debugPort}`);
    this.context = this.browser.contexts()[0] || await this.browser.newContext();
    this.page = this.context.pages()[0] || await this.context.newPage();
    
    return { browser: this.browser, context: this.context, page: this.page };
  }

  /**
   * Take screenshot with timestamp
   * @param {string} name - Screenshot name prefix
   * @returns {Promise<string|null>} Screenshot path or null
   */
  async screenshot(name) {
    if (!this.page) return null;
    
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      await fs.mkdir(this.screenshotDir, { recursive: true });
      
      const filename = `${name}-${Date.now()}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      await this.page.screenshot({ path: filepath, fullPage: true });
      logger.debug('Screenshot saved', { path: filepath });
      
      return filepath;
    } catch (error) {
      logger.debug('Screenshot failed', { error: error.message });
      return null;
    }
  }

  /**
   * Close connection without closing browser
   */
  async close() {
    try {
      if (this.browser && typeof this.browser.disconnect === 'function') {
        await this.browser.disconnect();
      }
    } catch (error) {
      // Ignore disconnect errors
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

/**
 * Rate limiter for controlling request frequency
 */
class RateLimiter {
  constructor(options = {}) {
    this.minDelay = options.minDelay || 1000;
    this.maxDelay = options.maxDelay || 3000;
    this.lastRequest = 0;
  }

  /**
   * Wait for appropriate delay
   * @returns {Promise<void>}
   */
  async wait() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    
    if (elapsed < delay) {
      await sleep(delay - elapsed);
    }
    
    this.lastRequest = Date.now();
  }
}

module.exports = {
  // Configuration
  BROWSER_CONFIG,
  
  // Smart selectors
  smartSelector,
  smartClick,
  smartType,
  waitForAnySelector,
  
  // Page state
  checkLoginStatus,
  waitForPageReady,
  elementExists,
  safeEvaluate,
  
  // Navigation
  smartNavigate,
  humanLikeScroll,
  
  // Classes
  SessionManager,
  RateLimiter
};
