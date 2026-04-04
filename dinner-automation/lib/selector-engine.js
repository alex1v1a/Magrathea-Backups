/**
 * DOM Selector Engine - Fast, resilient element selection
 * Optimized for automation scripts with multiple fallback strategies
 * 
 * @module lib/selector-engine
 */

class SelectorEngine {
  constructor(page) {
    this.page = page;
    this.cache = new Map();
  }

  /**
   * Find element with multiple selector strategies
   * @param {Array<string>} selectors - Array of selector strings
   * @param {Object} options - Search options
   * @returns {Promise<ElementHandle|null>}
   */
  async findElement(selectors, options = {}) {
    const { timeout = 5000, visible = true, cacheKey = null } = options;
    
    // Check cache
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      try {
        const isVisible = await cached.isVisible().catch(() => false);
        if (isVisible) return cached;
      } catch {
        this.cache.delete(cacheKey);
      }
    }

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            if (visible) {
              const isVisible = await element.isVisible().catch(() => false);
              if (!isVisible) continue;
            }
            
            if (cacheKey) {
              this.cache.set(cacheKey, element);
            }
            return element;
          }
        } catch {
          continue;
        }
      }
      
      await this.page.waitForTimeout(100);
    }
    
    return null;
  }

  /**
   * Smart wait for element with auto-retry
   * @param {string|Array<string>} selector - Selector(s) to wait for
   * @param {Object} options - Wait options
   * @returns {Promise<ElementHandle>}
   */
  async waitForElement(selector, options = {}) {
    const selectors = Array.isArray(selector) ? selector : [selector];
    const { timeout = 10000, state = 'visible' } = options;
    
    const startTime = Date.now();
    let lastError;
    
    while (Date.now() - startTime < timeout) {
      for (const sel of selectors) {
        try {
          const element = await this.page.waitForSelector(sel, {
            timeout: 1000,
            state
          });
          if (element) return element;
        } catch (e) {
          lastError = e;
        }
      }
    }
    
    throw new Error(`Element not found: ${selectors.join(', ')} - ${lastError?.message}`);
  }

  /**
   * Find element by text content
   * @param {string} text - Text to search for
   * @param {string} elementType - Element type (button, a, etc.)
   * @param {Object} options - Search options
   */
  async findByText(text, elementType = '*', options = {}) {
    const { exact = false, caseSensitive = false } = options;
    
    const textMatch = exact 
      ? caseSensitive ? text : text.toLowerCase()
      : caseSensitive ? text : text.toLowerCase();
    
    return this.page.evaluateHandle((type, matchText, isExact, isCaseSensitive) => {
      const elements = document.querySelectorAll(type);
      for (const el of elements) {
        const elText = isCaseSensitive ? el.textContent : el.textContent.toLowerCase();
        if (isExact ? elText.trim() === matchText : elText.includes(matchText)) {
          return el;
        }
      }
      return null;
    }, elementType, textMatch, exact, caseSensitive);
  }

  /**
   * Smart click with multiple fallback strategies
   * @param {string|Array<string>} selector - Selector(s)
   * @param {Object} options - Click options
   */
  async smartClick(selector, options = {}) {
    const selectors = Array.isArray(selector) ? selector : [selector];
    const { timeout = 10000, force = false } = options;
    
    const element = await this.findElement(selectors, { timeout });
    
    if (!element) {
      throw new Error(`Click target not found: ${selectors.join(', ')}`);
    }
    
    try {
      // Try standard click first
      await element.click({ force });
    } catch {
      // Fallback to JavaScript click
      await this.page.evaluate(el => el.click(), element);
    }
  }

  /**
   * Clear cache for specific key or all keys
   * @param {string} key - Cache key to clear (optional)
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Predefined selector groups for common patterns
const SELECTOR_GROUPS = {
  login: {
    email: [
      'input[type="email"]',
      'input[name="email"]',
      '#email',
      '[data-testid*="email"]',
      'input[placeholder*="email" i]'
    ],
    password: [
      'input[type="password"]',
      'input[name="password"]',
      '#password',
      '[data-testid*="password"]'
    ],
    submit: [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'button:has-text("Login")',
      '[data-testid*="sign-in"]',
      '[data-testid*="login"]'
    ]
  },
  
  cart: {
    addButton: [
      'button:has-text("Add to Cart")',
      'button[data-automation-id*="add"]',
      '[data-testid*="add-to-cart"]',
      'button:has-text("Add")'
    ],
    removeButton: [
      'button:has-text("Remove")',
      'button[data-automation-id*="remove"]',
      '[data-testid*="remove"]',
      'button[aria-label*="Remove"]'
    ],
    searchBox: [
      'input[placeholder*="Search"]',
      'input[name="q"]',
      '#search-input',
      '[data-automation-id*="search"]'
    ]
  },
  
  navigation: {
    cart: [
      '[data-testid*="cart"]',
      'a[href*="cart"]',
      '.cart-icon',
      'button:has-text("Cart")'
    ],
    account: [
      '[data-testid*="account"]',
      '.account-menu',
      'button:has-text("Account")',
      'a[href*="account"]'
    ]
  }
};

module.exports = {
  SelectorEngine,
  SELECTOR_GROUPS
};
