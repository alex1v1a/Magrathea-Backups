/**
 * @fileoverview Browser automation helpers for Playwright/CDP operations.
 * Provides common patterns for element selection, waiting, and interaction.
 * @module lib/browser-helpers
 */

const { TimeoutError, BrowserError } = require('./errors');
const { formatDuration } = require('./date-utils');

// Default timeouts
const DEFAULT_TIMEOUTS = {
  navigation: 30000,
  element: 10000,
  action: 5000,
  download: 60000
};

// Common selectors for popular sites
const SITE_SELECTORS = {
  facebook: {
    loginCheck: '[aria-label="Your profile"]',
    messageList: '[role="main"] [role="list"]',
    marketplace: '[href*="/marketplace"]',
    notifications: '[aria-label*="Notifications"]'
  },
  heb: {
    cartLink: 'a[data-testid="cart-link"]',
    addToCartBtn: 'button[data-qe-id="addToCart"]',
    searchInput: 'input[data-testid="search-input"]',
    searchBtn: 'button[data-testid="search-button"]',
    productCard: '[data-testid="product-card"]',
    loginEmail: 'input[type="email"]',
    loginPassword: 'input[type="password"]'
  }
};

/**
 * Wait for an element with multiple selector strategies.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string|string[]} selectors - CSS selector(s) to try
 * @param {Object} [options={}] - Options
 * @param {number} [options.timeout=10000] - Timeout in ms
 * @param {boolean} [options.visible=true] - Wait for visible
 * @returns {Promise<import('playwright').ElementHandle>} Element handle
 * @throws {TimeoutError} If element not found
 * 
 * @example
 * const el = await waitForElement(page, ['#submit', 'button[type="submit"]']);
 */
async function waitForElement(page, selectors, options = {}) {
  const { timeout = DEFAULT_TIMEOUTS.element, visible = true } = options;
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectorArray) {
      try {
        const element = await page.locator(selector).first();
        if (visible) {
          await element.waitFor({ state: 'visible', timeout: 1000 });
        } else {
          await element.waitFor({ timeout: 1000 });
        }
        return element;
      } catch {
        continue;
      }
    }
    await page.waitForTimeout(100);
  }

  throw new TimeoutError(
    `Element not found: ${selectorArray.join(', ')}`,
    'ELEMENT_NOT_FOUND',
    { timeoutMs: timeout, metadata: { selectors: selectorArray } }
  );
}

/**
 * Wait for any of multiple elements to appear.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} selectors - Object mapping names to selectors
 * @param {Object} [options={}] - Options
 * @returns {Promise<{key: string, element: ElementHandle}>} Found element info
 * 
 * @example
 * const result = await waitForAnyElement(page, {
 *   success: '.success-message',
 *   error: '.error-message'
 * });
 * if (result.key === 'success') { ... }
 */
async function waitForAnyElement(page, selectors, options = {}) {
  const { timeout = DEFAULT_TIMEOUTS.element } = options;
  const entries = Object.entries(selectors);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const [key, selector] of entries) {
      try {
        const element = await page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: 500 });
        return { key, element, selector };
      } catch {
        continue;
      }
    }
    await page.waitForTimeout(100);
  }

  throw new TimeoutError(
    `None of the elements appeared: ${Object.keys(selectors).join(', ')}`,
    'NO_ELEMENT_FOUND',
    { timeoutMs: timeout }
  );
}

/**
 * Safe click with retry and verification.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {Object} [options={}] - Options
 * @param {number} [options.retries=3] - Number of retries
 * @param {boolean} [options.waitForNavigation=false] - Wait for navigation
 * @returns {Promise<boolean>} True if successful
 * 
 * @example
 * await safeClick(page, '#submit-btn', { waitForNavigation: true });
 */
async function safeClick(page, selector, options = {}) {
  const { retries = 3, waitForNavigation = false } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const element = await waitForElement(page, selector, { timeout: 5000 });
      
      // Scroll into view
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }),
          element.click()
        ]);
      } else {
        await element.click();
      }

      return true;
    } catch (error) {
      if (i === retries - 1) {
        throw new BrowserError(
          `Failed to click element: ${selector}`,
          'CLICK_FAILED',
          { cause: error, metadata: { selector, retries } }
        );
      }
      await page.waitForTimeout(500 * (i + 1));
    }
  }

  return false;
}

/**
 * Safe type with human-like delays.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 * @param {Object} [options={}] - Options
 * @param {number} [options.delay=50] - Delay between keystrokes
 * @param {boolean} [options.clear=true] - Clear field first
 * @returns {Promise<void>}
 * 
 * @example
 * await safeType(page, '#search', 'chicken breast', { delay: 30 });
 */
async function safeType(page, selector, text, options = {}) {
  const { delay = 50, clear = true } = options;

  const element = await waitForElement(page, selector);

  if (clear) {
    await element.fill('');
  }

  // Type with random delays for human-like behavior
  for (const char of text) {
    await element.type(char, { delay: delay + Math.random() * 20 });
  }
}

/**
 * Wait for page to be fully loaded.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} [options={}] - Options
 * @param {string} [options.waitUntil='networkidle'] - Wait condition
 * @param {number} [options.timeout=30000] - Timeout
 * @returns {Promise<void>}
 */
async function waitForPageLoad(page, options = {}) {
  const { waitUntil = 'networkidle', timeout = DEFAULT_TIMEOUTS.navigation } = options;

  await page.waitForLoadState(waitUntil, { timeout });
}

/**
 * Check if an element exists on the page.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} selector - Element selector
 * @returns {Promise<boolean>} True if element exists
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
 * Get text content of an element.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {Object} [options={}] - Options
 * @param {string} [options.defaultValue=''] - Default if not found
 * @returns {Promise<string>} Text content
 */
async function getElementText(page, selector, options = {}) {
  const { defaultValue = '' } = options;

  try {
    const element = await page.locator(selector).first();
    const text = await element.textContent();
    return text?.trim() || defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Extract data from multiple elements.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} containerSelector - Container selector
 * @param {Object} fieldSelectors - Object mapping field names to selectors
 * @returns {Promise<Array>} Array of extracted data objects
 * 
 * @example
 * const products = await extractData(page, '.product', {
 *   name: '.product-name',
 *   price: '.product-price',
 *   image: '.product-img img[src]'
 * });
 */
async function extractData(page, containerSelector, fieldSelectors) {
  const containers = await page.locator(containerSelector).all();
  const results = [];

  for (const container of containers) {
    const item = {};
    
    for (const [field, selector] of Object.entries(fieldSelectors)) {
      try {
        const element = container.locator(selector).first();
        
        // Check if it's an attribute selector
        const attrMatch = selector.match(/\[([^\]]+)\]$/);
        if (attrMatch) {
          const baseSelector = selector.slice(0, -attrMatch[0].length);
          const attr = attrMatch[1].replace(/^[\w-]+=/, '').replace(/["']/g, '');
          item[field] = await container.locator(baseSelector).first().getAttribute(attr) || '';
        } else {
          item[field] = await element.textContent() || '';
        }
      } catch {
        item[field] = '';
      }
    }

    results.push(item);
  }

  return results;
}

/**
 * Apply stealth patches to avoid bot detection.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<void>}
 */
async function applyStealth(page) {
  // Override navigator.webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin' },
        { name: 'Chrome PDF Viewer' },
        { name: 'Native Client' }
      ]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Add chrome runtime
    window.chrome = {
      runtime: {}
    };
  });
}

/**
 * Connect to Chrome via CDP with retries.
 * 
 * @param {import('playwright').BrowserType} browserType - Playwright browser type
 * @param {Object} [options={}] - Options
 * @param {number} [options.port=9222] - Debug port
 * @param {number} [options.retries=3] - Connection retries
 * @param {number} [options.retryDelay=1000] - Delay between retries
 * @returns {Promise<import('playwright').Browser>} Connected browser
 * @throws {BrowserError} If connection fails
 */
async function connectToChrome(browserType, options = {}) {
  const { port = 9222, retries = 3, retryDelay = 1000 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const browser = await browserType.connectOverCDP(`http://localhost:${port}`);
      return browser;
    } catch (error) {
      if (i === retries - 1) {
        throw new BrowserError(
          `Failed to connect to Chrome on port ${port}`,
          'CHROME_CONNECTION_FAILED',
          { cause: error, metadata: { port, retries } }
        );
      }
      await new Promise(r => setTimeout(r, retryDelay * (i + 1)));
    }
  }
}

/**
 * Take a screenshot with timestamp.
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} [prefix='screenshot'] - Filename prefix
 * @param {string} [dir='./screenshots'] - Output directory
 * @returns {Promise<string>} Path to saved screenshot
 */
async function takeScreenshot(page, prefix = 'screenshot', dir = './screenshots') {
  const fs = require('fs');
  const path = require('path');
  const { formatDate } = require('./date-utils');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = formatDate(new Date(), 'FILENAME');
  const filename = `${prefix}-${timestamp}.png`;
  const filepath = path.join(dir, filename);

  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/**
 * Get site-specific selectors.
 * 
 * @param {string} site - Site name ('facebook', 'heb', etc.)
 * @returns {Object|undefined} Site selectors
 */
function getSiteSelectors(site) {
  return SITE_SELECTORS[site.toLowerCase()];
}

module.exports = {
  DEFAULT_TIMEOUTS,
  SITE_SELECTORS,
  waitForElement,
  waitForAnyElement,
  safeClick,
  safeType,
  waitForPageLoad,
  elementExists,
  getElementText,
  extractData,
  applyStealth,
  connectToChrome,
  takeScreenshot,
  getSiteSelectors
};
