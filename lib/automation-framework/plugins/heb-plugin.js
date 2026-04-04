/**
 * HEB Plugin - HEB.com Specific Automation
 * 
 * Implements HEB-specific automation logic including:
 * - Product search and selection
 * - Cart management
 * - Checkout flow
 * - Store selection
 * - 2FA handling
 */

const { BasePlugin } = require('./base-plugin');

/**
 * HEB Plugin Configuration
 */
const HEB_CONFIG = {
  baseUrl: 'https://www.heb.com',
  selectors: {
    // Login
    loginEmail: 'input[type="email"], input[name="email"]',
    loginPassword: 'input[type="password"], input[name="password"]',
    loginSubmit: 'button[type="submit"], button:has-text("Sign In")',
    
    // 2FA
    verificationCode: 'input[type="tel"], input[name="code"], input[placeholder*="code"], input[placeholder*="verification"]',
    verifyButton: 'button:has-text("Verify"), button:has-text("Submit")',
    trustDevice: 'button:has-text("Trust"), button:has-text("Yes")',
    
    // Search
    searchInput: 'input[placeholder*="Search"], input[data-testid="search-input"]',
    searchResults: '[data-testid="product-grid"], .product-grid, .search-results',
    productCard: '[data-testid="product-card"], .product-card',
    
    // Product
    productTitle: '[data-testid="product-title"], h1, h2',
    productPrice: '[data-testid="price"], .price, .sale-price',
    addToCartButton: '[data-testid="add-to-cart"], button:has-text("Add to Cart")',
    quantitySelector: '[data-testid="quantity-selector"], input[name="quantity"]',
    
    // Cart
    cartItem: '[data-testid="cart-item"], .cart-item',
    cartTotal: '[data-testid="cart-total"], .cart-total, .order-total',
    cartCount: '[data-testid="cart-count"], .cart-count',
    removeItem: '[data-testid="remove-item"], button:has-text("Remove")',
    checkoutButton: '[data-testid="checkout-button"], button:has-text("Checkout")',
    
    // Store
    storeSelector: '[data-testid="store-selector"], .store-selector',
    storeSearch: 'input[placeholder*="store"], input[placeholder*="zip"]',
    storeResult: '[data-testid="store-result"], .store-result',
    
    // Checkout
    timeslotPicker: '[data-testid="timeslot-picker"], .timeslot-picker',
    timeslot: '[data-testid="timeslot"]:not([disabled]), .timeslot:not(.unavailable)',
    placeOrder: '[data-testid="place-order"], button:has-text("Place Order")',
    orderConfirmation: '[data-testid="order-confirmation"], .confirmation'
  },
  
  // Retry policies
  retryPolicies: {
    search: { maxRetries: 3, baseDelay: 1000 },
    addToCart: { maxRetries: 2, baseDelay: 500 },
    checkout: { maxRetries: 2, baseDelay: 2000 }
  }
};

class HEBPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'heb',
      baseUrl: HEB_CONFIG.baseUrl,
      ...options
    });
    
    this.config = HEB_CONFIG;
    this.cart = [];
    this.preferences = {
      store: options.store || 'Buda',
      substitution: options.substitution || 'similar',
      deliveryMethod: options.deliveryMethod || 'pickup',
      ...options.preferences
    };
    
    // Register retry policies
    for (const [operation, policy] of Object.entries(HEB_CONFIG.retryPolicies)) {
      this.retryManager.registerPolicy(`heb:${operation}`, policy);
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    return this.safeEvaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"], .account-dropdown, .welcome-message');
    });
  }

  /**
   * Login to HEB
   */
  async login(credentials) {
    await this.navigate('/login');
    await this.antiBot.pageLoadDelay();
    
    // Check if already logged in
    if (await this.isLoggedIn()) {
      this.logger.info('Already logged in to HEB');
      return { success: true, alreadyLoggedIn: true };
    }
    
    // Fill login form
    await this.antiBot.typeWithDelay(
      this.page,
      this.config.selectors.loginEmail,
      credentials.email
    );
    
    await this.antiBot.typeWithDelay(
      this.page,
      this.config.selectors.loginPassword,
      credentials.password
    );
    
    await this.antiBot.humanClick(this.page, this.config.selectors.loginSubmit);
    
    // Check for 2FA
    const needs2FA = await this.waitForElement(
      this.config.selectors.verificationCode,
      5000
    ).catch(() => false);
    
    if (needs2FA) {
      return { success: false, needs2FA: true, message: '2FA required' };
    }
    
    // Verify login
    const loggedIn = await this.isLoggedIn();
    return { success: loggedIn };
  }

  /**
   * Complete 2FA with verification code
   */
  async complete2FA(code) {
    await this.antiBot.typeWithDelay(
      this.page,
      this.config.selectors.verificationCode,
      code
    );
    
    await this.antiBot.humanClick(this.page, this.config.selectors.verifyButton);
    await this.antiBot.sleep(5000, 8000);
    
    // Handle trust device prompt
    const trustPrompt = await this.elementExists(this.config.selectors.trustDevice);
    if (trustPrompt) {
      await this.antiBot.humanClick(this.page, this.config.selectors.trustDevice);
      await this.antiBot.sleep(3000, 5000);
    }
    
    const loggedIn = await this.isLoggedIn();
    return { success: loggedIn };
  }

  /**
   * Search for products
   */
  async search(query, options = {}) {
    return this.retryManager.execute('heb:search', async () => {
      const searchUrl = `/search/?q=${encodeURIComponent(query)}`;
      await this.navigate(searchUrl);
      
      // Wait for results
      await this.waitForElement(this.config.selectors.searchResults, 15000);
      await this.antiBot.pageLoadDelay();
      
      // Extract products
      const products = await this.page.evaluate((selectors) => {
        const items = [];
        const cards = document.querySelectorAll(selectors.productCard);
        
        cards.forEach((card, index) => {
          if (options.limit && index >= options.limit) return;
          
          const nameEl = card.querySelector(selectors.productTitle);
          const priceEl = card.querySelector(selectors.productPrice);
          const imageEl = card.querySelector('img');
          const linkEl = card.querySelector('a');
          const addBtn = card.querySelector(selectors.addToCartButton);
          
          items.push({
            name: nameEl?.textContent?.trim(),
            price: priceEl?.textContent?.trim(),
            image: imageEl?.src,
            url: linkEl?.href,
            hasAddButton: !!addBtn,
            index
          });
        });
        
        return items;
      }, this.config.selectors);
      
      return products.filter(p => p.name);
    });
  }

  /**
   * Add product to cart
   */
  async addToCart(productIdentifier, quantity = 1) {
    return this.retryManager.execute('heb:addToCart', async () => {
      // If productIdentifier is a string, search for it first
      let productUrl;
      if (typeof productIdentifier === 'string') {
        const products = await this.search(productIdentifier, { limit: 1 });
        if (products.length === 0) {
          throw new Error(`Product not found: ${productIdentifier}`);
        }
        productUrl = products[0].url;
      } else {
        productUrl = productIdentifier.url;
      }
      
      // Navigate to product page
      await this.navigate(productUrl);
      await this.antiBot.pageLoadDelay();
      
      // Set quantity if needed
      if (quantity > 1) {
        const qtySelector = this.config.selectors.quantitySelector;
        if (await this.elementExists(qtySelector)) {
          await this.page.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            if (el) el.value = val;
          }, qtySelector, quantity.toString());
          await this.antiBot.actionDelay();
        }
      }
      
      // Click add to cart
      await this.antiBot.humanClick(this.page, this.config.selectors.addToCartButton);
      await this.antiBot.sleep(2000, 3000);
      
      // Verify added
      const added = await this.elementExists(this.config.selectors.cartCount);
      
      if (added) {
        const cartInfo = await this.getCartInfo();
        this.emit('item:added', { product: productIdentifier, quantity, cart: cartInfo });
        return { success: true, cart: cartInfo };
      }
      
      throw new Error('Failed to verify item was added to cart');
    });
  }

  /**
   * Add multiple items to cart
   */
  async addItems(items) {
    const results = [];
    
    for (const item of items) {
      try {
        const result = await this.addToCart(item.name || item, item.quantity || 1);
        results.push({ item, success: true, ...result });
      } catch (error) {
        results.push({ item, success: false, error: error.message });
      }
      
      // Delay between items
      await this.antiBot.actionDelay();
    }
    
    return results;
  }

  /**
   * Get cart information
   */
  async getCartInfo() {
    return this.safeEvaluate((selectors) => {
      const countEl = document.querySelector(selectors.cartCount);
      const totalEl = document.querySelector(selectors.cartTotal);
      
      return {
        count: countEl ? parseInt(countEl.textContent) || 0 : 0,
        total: totalEl?.textContent?.trim() || 'Unknown'
      };
    }, this.config.selectors);
  }

  /**
   * View full cart
   */
  async viewCart() {
    await this.navigate('/cart');
    await this.antiBot.pageLoadDelay();
    
    const cartData = await this.page.evaluate((selectors) => {
      const items = [];
      const rows = document.querySelectorAll(selectors.cartItem);
      
      rows.forEach(row => {
        const nameEl = row.querySelector('[data-testid="item-name"], .item-name, h3, h4');
        const priceEl = row.querySelector('[data-testid="item-price"], .item-price');
        const qtyEl = row.querySelector('input[type="number"], .qty');
        
        items.push({
          name: nameEl?.textContent?.trim(),
          price: priceEl?.textContent?.trim(),
          quantity: qtyEl?.value || 1
        });
      });
      
      const totalEl = document.querySelector(selectors.cartTotal);
      
      return {
        items,
        total: totalEl?.textContent?.trim(),
        count: items.length
      };
    }, this.config.selectors);
    
    return cartData;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(indexOrName) {
    await this.viewCart();
    
    if (typeof indexOrName === 'number') {
      const removeButtons = await this.page.$$(this.config.selectors.removeItem);
      if (removeButtons[indexOrName]) {
        await removeButtons[indexOrName].click();
      }
    } else {
      // Find by name and remove
      await this.page.evaluate((name, selector) => {
        const items = document.querySelectorAll('[data-testid="cart-item"]');
        items.forEach(item => {
          const nameEl = item.querySelector('.item-name, h3, h4');
          if (nameEl?.textContent?.includes(name)) {
            const removeBtn = item.querySelector(selector);
            if (removeBtn) removeBtn.click();
          }
        });
      }, indexOrName, this.config.selectors.removeItem);
    }
    
    await this.antiBot.sleep(2000, 3000);
    return this.getCartInfo();
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    await this.viewCart();
    
    let removed = 0;
    while (true) {
      const removeButtons = await this.page.$$(this.config.selectors.removeItem);
      if (removeButtons.length === 0) break;
      
      await removeButtons[0].click();
      await this.antiBot.sleep(1000, 1500);
      removed++;
    }
    
    return { removed };
  }

  /**
   * Select store location
   */
  async selectStore(storeName = null) {
    const targetStore = storeName || this.preferences.store;
    
    // Navigate to store selector if not already there
    if (!await this.elementExists(this.config.selectors.storeSelector)) {
      await this.navigate('/store-locator');
      await this.antiBot.pageLoadDelay();
    }
    
    // Search for store
    const searchBox = this.config.selectors.storeSearch;
    if (await this.elementExists(searchBox)) {
      await this.antiBot.typeWithDelay(this.page, searchBox, targetStore);
      await this.page.keyboard.press('Enter');
      await this.antiBot.sleep(2000, 3000);
    }
    
    // Select from results
    const storeResult = `${this.config.selectors.storeResult}:has-text("${targetStore}")`;
    if (await this.elementExists(storeResult)) {
      await this.antiBot.humanClick(this.page, storeResult);
      this.preferences.store = targetStore;
      return { success: true, store: targetStore };
    }
    
    return { success: false, error: 'Store not found' };
  }

  /**
   * Set substitution preference
   */
  async setSubstitutionPreference(preference) {
    const prefs = {
      similar: 'Similar Item',
      dont: "Don't Substitute",
      contact: 'Contact Me'
    };
    
    const prefText = prefs[preference];
    if (!prefText) {
      throw new Error(`Invalid substitution preference: ${preference}`);
    }
    
    await this.page.evaluate((text) => {
      const labels = document.querySelectorAll('label');
      labels.forEach(label => {
        if (label.textContent.includes(text)) {
          const input = label.querySelector('input') || 
                       document.getElementById(label.getAttribute('for'));
          if (input) input.click();
        }
      });
    }, prefText);
    
    this.preferences.substitution = preference;
    return { success: true, preference };
  }

  /**
   * Proceed to checkout
   */
  async checkout() {
    return this.retryManager.execute('heb:checkout', async () => {
      await this.viewCart();
      
      // Click checkout
      await this.antiBot.humanClick(this.page, this.config.selectors.checkoutButton);
      await this.antiBot.sleep(3000, 5000);
      
      // Check if login required
      if (await this.elementExists(this.config.selectors.loginEmail)) {
        return { success: false, needsLogin: true };
      }
      
      // Select store if needed
      if (await this.elementExists(this.config.selectors.storeSelector)) {
        await this.selectStore();
      }
      
      return { success: true, step: 'checkout-initiated' };
    });
  }

  /**
   * Schedule delivery/pickup time
   */
  async scheduleTimeSlot(preferredDate = null) {
    await this.waitForElement(this.config.selectors.timeslotPicker, 15000);
    
    const slots = await this.page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map(el => ({
        text: el.textContent.trim(),
        available: !el.disabled && !el.classList.contains('unavailable'),
        element: el
      }));
    }, this.config.selectors.timeslot);
    
    if (slots.length === 0) {
      return { success: false, error: 'No time slots available' };
    }
    
    // Click first available
    await this.page.click(`${this.config.selectors.timeslot}:first-child`);
    
    return { 
      success: true, 
      slotsAvailable: slots.length,
      selected: slots[0]?.text
    };
  }

  /**
   * Place order (final step)
   */
  async placeOrder() {
    // Verify on review page
    const onReviewPage = await this.safeEvaluate(() => {
      return !!document.querySelector('h1:has-text("Review"), h2:has-text("Review"), [data-testid="order-review"]');
    });
    
    if (!onReviewPage) {
      return { success: false, error: 'Not on order review page' };
    }
    
    await this.screenshot('before-place-order');
    
    // Click place order
    await this.antiBot.humanClick(this.page, this.config.selectors.placeOrder);
    await this.antiBot.sleep(5000, 8000);
    
    // Check for confirmation
    const confirmation = await this.safeEvaluate((selector) => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim();
    }, this.config.selectors.orderConfirmation);
    
    return {
      success: !!confirmation,
      confirmation,
      screenshot: await this.screenshot('order-confirmation')
    };
  }

  /**
   * Full cart building workflow
   */
  async buildCart(items, options = {}) {
    this.logger.info(`Building cart with ${items.length} items`);
    
    try {
      // Ensure logged in
      if (options.ensureLogin !== false) {
        const loggedIn = await this.isLoggedIn();
        if (!loggedIn && options.credentials) {
          await this.login(options.credentials);
        }
      }
      
      // Clear existing cart if requested
      if (options.clearFirst) {
        await this.clearCart();
      }
      
      // Add all items
      const results = await this.addItems(items);
      
      // View final cart
      const cart = await this.viewCart();
      
      // Take final screenshot
      await this.screenshot('cart-complete');
      
      return {
        success: true,
        results,
        cart,
        stats: this.getStats()
      };
      
    } catch (error) {
      await this.screenshot('cart-error');
      throw error;
    }
  }
}

module.exports = { HEBPlugin, HEB_CONFIG };
