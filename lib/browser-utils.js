/**
 * Browser Automation Utilities
 * Shared helpers for Playwright-based browser automation
 * 
 * Usage: const { createBrowserContext, humanLikeScroll, antiBotDelay } = require('../lib/browser-utils');
 */

const { chromium } = require('playwright');
const { randomDelay, logInfo, logDebug } = require('./utils');

// ============================================================================
// BROWSER CONTEXT MANAGEMENT
// ============================================================================

/**
 * Create browser context with anti-detection settings
 * @param {Object} options - Context options
 * @param {string} options.cdpEndpoint - CDP endpoint (e.g., 'http://localhost:9222')
 * @param {boolean} options.headless - Run headless (default: false)
 * @param {string} options.userDataDir - User data directory
 * @returns {Promise<{browser: Browser, context: BrowserContext}>}
 */
async function createBrowserContext(options = {}) {
  const { cdpEndpoint, headless = false, userDataDir } = options;
  
  let browser;
  
  if (cdpEndpoint) {
    logInfo(`Connecting to existing browser at ${cdpEndpoint}`);
    browser = await chromium.connectOverCDP(cdpEndpoint);
  } else {
    logInfo('Launching new browser instance');
    browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      ...(userDataDir && { userDataDir })
    });
  }
  
  const context = browser.contexts()[0] || await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  // Inject anti-detection script
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });
  
  return { browser, context };
}

// ============================================================================
// ANTI-BOT UTILITIES
// ============================================================================

/**
 * Human-like random delay for anti-bot protection
 * @param {string} action - Action being performed (for logging)
 */
async function antiBotDelay(action = 'action') {
  const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
  logDebug(`Anti-bot delay: ${delay}ms before ${action}`);
  await randomDelay(delay, delay + 1000);
}

/**
 * Simulate human-like scrolling
 * @param {Page} page - Playwright page
 * @param {Object} options - Scroll options
 * @param {number} options.minAmount - Minimum scroll amount
 * @param {number} options.maxAmount - Maximum scroll amount
 * @param {boolean} options.randomPauses - Add random pauses
 */
async function humanLikeScroll(page, options = {}) {
  const { minAmount = 100, maxAmount = 400, randomPauses = true } = options;
  const scrollAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  
  await page.evaluate((amount) => {
    window.scrollBy({ top: amount, behavior: 'smooth' });
  }, scrollAmount);
  
  if (randomPauses) {
    await randomDelay(500, 1500);
  }
}

/**
 * Warm up session by visiting site and behaving human-like
 * @param {Page} page - Playwright page
 * @param {string} url - URL to warm up
 * @param {Object} options - Warmup options
 */
async function sessionWarmup(page, url, options = {}) {
  const { scrollTimes = 2, delayMin = 3000, delayMax = 5000 } = options;
  
  logInfo(`Warming up session: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await randomDelay(delayMin, delayMax);
  
  for (let i = 0; i < scrollTimes; i++) {
    await humanLikeScroll(page);
    await randomDelay(1000, 2500);
  }
  
  logInfo('Session warmup complete');
}

/**
 * Simulate human-like typing
 * @param {Page} page - Playwright page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 * @param {Object} options - Typing options
 */
async function humanLikeType(page, selector, text, options = {}) {
  const { wpm = 300, mistakes = 0.02 } = options; // words per minute, mistake rate
  const msPerChar = (60 * 1000) / (wpm * 5); // Approximate chars per word
  
  await page.click(selector);
  await randomDelay(100, 300);
  
  for (const char of text) {
    // Occasional typo
    if (Math.random() < mistakes) {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
      await page.keyboard.type(wrongChar, { delay: msPerChar * 0.5 });
      await randomDelay(100, 300);
      await page.keyboard.press('Backspace');
      await randomDelay(100, 200);
    }
    
    await page.keyboard.type(char, { delay: msPerChar * (0.8 + Math.random() * 0.4) });
  }
}

// ============================================================================
// ELEMENT INTERACTION UTILITIES
// ============================================================================

/**
 * Wait for element with retry and timeout
 * @param {Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {Object} options - Wait options
 * @returns {Promise<ElementHandle|null>}
 */
async function waitForElement(page, selector, options = {}) {
  const { timeout = 5000, visible = true } = options;
  
  try {
    return await page.waitForSelector(selector, { 
      timeout, 
      state: visible ? 'visible' : 'attached' 
    });
  } catch {
    return null;
  }
}

/**
 * Safe click with verification
 * @param {Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {Object} options - Click options
 * @returns {Promise<boolean>} Success status
 */
async function safeClick(page, selector, options = {}) {
  const { preDelay = [100, 400], postDelay = [500, 1000], verify = null } = options;
  
  try {
    await randomDelay(...preDelay);
    
    const element = await page.locator(selector).first();
    await element.scrollIntoViewIfNeeded();
    await element.click();
    
    await randomDelay(...postDelay);
    
    // Optional verification
    if (verify) {
      return await verify();
    }
    
    return true;
  } catch (error) {
    logDebug(`Click failed for ${selector}: ${error.message}`);
    return false;
  }
}

/**
 * Get element text content safely
 * @param {Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {string} defaultValue - Default if not found
 * @returns {Promise<string>}
 */
async function getElementText(page, selector, defaultValue = '') {
  try {
    const element = await page.locator(selector).first();
    return await element.textContent() || defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Get element attribute safely
 * @param {Page} page - Playwright page
 * @param {string} selector - Element selector
 * @param {string} attribute - Attribute name
 * @param {string} defaultValue - Default if not found
 * @returns {Promise<string>}
 */
async function getElementAttribute(page, selector, attribute, defaultValue = '') {
  try {
    const element = await page.locator(selector).first();
    return await element.getAttribute(attribute) || defaultValue;
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// CART/SHOPPING UTILITIES
// ============================================================================

/**
 * Extract cart count from common e-commerce patterns
 * @param {Page} page - Playwright page
 * @returns {Promise<number>} Cart item count (-1 if error)
 */
async function extractCartCount(page) {
  const selectors = [
    // Common selectors for cart counts
    { sel: '[data-testid="cart-link"]', attr: 'aria-label', regex: /(\d+)\s+items?/i },
    { sel: '.cart-badge, .CartBadge', text: true },
    { sel: '.cart-count, .CartCount', text: true },
    { sel: 'a[href*="/cart"] .badge', text: true },
    { sel: '[data-qe-id="cartCount"]', text: true },
  ];
  
  return await page.evaluate((selectorList) => {
    for (const { sel, attr, regex, text } of selectorList) {
      const el = document.querySelector(sel);
      if (!el) continue;
      
      let value;
      if (attr) {
        value = el.getAttribute(attr);
        if (regex && value) {
          const match = value.match(regex);
          if (match) return parseInt(match[1]);
        }
      }
      if (text) {
        value = el.textContent?.trim();
        if (value && /^\d+$/.test(value)) {
          return parseInt(value);
        }
      }
    }
    return 0;
  }, selectors);
}

/**
 * Verify cart count increased after action
 * @param {Page} page - Playwright page
 * @param {number} initialCount - Initial cart count
 * @param {Object} options - Verification options
 * @returns {Promise<boolean>}
 */
async function verifyCartIncrease(page, initialCount, options = {}) {
  const { maxRetries = 3, delay = 1000 } = options;
  
  for (let i = 0; i < maxRetries; i++) {
    await randomDelay(delay, delay + 500);
    const newCount = await extractCartCount(page);
    
    if (newCount > initialCount) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  // Browser context
  createBrowserContext,
  
  // Anti-bot
  antiBotDelay,
  humanLikeScroll,
  sessionWarmup,
  humanLikeType,
  
  // Element interaction
  waitForElement,
  safeClick,
  getElementText,
  getElementAttribute,
  
  // Shopping
  extractCartCount,
  verifyCartIncrease
};
