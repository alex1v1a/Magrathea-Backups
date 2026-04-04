/**
 * HEB Browser Automation
 * Automated cart building and checkout for HEB.com
 */

const { AutomationBase } = require('../src/AutomationBase');
const { logger } = require('../src/StealthBrowser');

/**
 * HEB Automation Class
 */
class HEBAutomation extends AutomationBase {
  constructor(options = {}) {
    super({
      name: 'heb',
      profile: options.profile || 'heb-profile',
      headless: options.headless !== false,
      slowMo: options.slowMo || 100,
      ...options
    });
    
    this.baseUrl = 'https://www.heb.com';
    this.cart = [];
    this.preferences = {
      store: options.store || 'Buda', // Default store
      substitution: options.substitution || 'similar', // similar, dont, contact
      deliveryMethod: options.deliveryMethod || 'pickup' // pickup, delivery
    };
  }
  
  /**
   * Search for a product
   */
  async searchProduct(query) {
    logger.info(`Searching for product: ${query}`);
    
    await this.safeNavigate(`${this.baseUrl}/search/?q=${encodeURIComponent(query)}`);
    await this.browser.waitForNetworkIdle();
    
    // Wait for search results to load
    await this.waitForElement('[data-testid="product-grid"], .product-grid, .search-results', 15000);
    
    // Extract product information
    const products = await this.browser.evaluate(() => {
      const items = [];
      const productCards = document.querySelectorAll('[data-testid="product-card"], .product-card, .product-item');
      
      productCards.forEach((card, index) => {
        if (index >= 10) return; // Limit to first 10
        
        const nameEl = card.querySelector('[data-testid="product-title"], .product-title, h3, h4');
        const priceEl = card.querySelector('[data-testid="price"], .price, .sale-price');
        const imageEl = card.querySelector('img');
        const linkEl = card.querySelector('a');
        const addBtn = card.querySelector('[data-testid="add-to-cart"], button:contains("Add")');
        
        items.push({
          name: nameEl ? nameEl.textContent.trim() : null,
          price: priceEl ? priceEl.textContent.trim() : null,
          image: imageEl ? imageEl.src : null,
          url: linkEl ? linkEl.href : null,
          addButtonSelector: addBtn ? `[data-testid="product-card"]:nth-child(${index + 1}) [data-testid="add-to-cart"]` : null
        });
      });
      
      return items;
    });
    
    logger.info(`Found ${products.length} products`);
    return products.filter(p => p.name);
  }
  
  /**
   * Add product to cart by name (finds best match)
   */
  async addToCart(productName, quantity = 1) {
    logger.info(`Adding to cart: ${productName} (qty: ${quantity})`);
    
    // Search for the product
    const products = await this.searchProduct(productName);
    
    if (products.length === 0) {
      logger.warn(`No products found for: ${productName}`);
      return { success: false, error: 'Product not found' };
    }
    
    // Click on the first result
    const product = products[0];
    logger.info(`Selecting: ${product.name} - ${product.price}`);
    
    // Navigate to product page for more reliable adding
    await this.safeNavigate(product.url);
    await this.browser.randomDelay(2000, 3000);
    
    // Set quantity if needed
    if (quantity > 1) {
      const qtySelector = '[data-testid="quantity-selector"], input[name="quantity"], .qty-input';
      if (await this.browser.elementExists(qtySelector)) {
        await this.browser.type(qtySelector, quantity.toString(), { clear: true });
        await this.browser.randomDelay(500, 1000);
      }
    }
    
    // Click add to cart button
    const addButtonSelectors = [
      '[data-testid="add-to-cart"]',
      'button:has-text("Add to Cart")',
      'button:has-text("Add")',
      '[data-automation-id="add-to-cart-button"]',
      'button[data-testid*="add"]'
    ];
    
    let added = false;
    for (const selector of addButtonSelectors) {
      if (await this.browser.elementExists(selector)) {
        await this.browser.click(selector);
        added = true;
        break;
      }
    }
    
    if (!added) {
      logger.error('Could not find add to cart button');
      await this.screenshot('add-to-cart-failed');
      return { success: false, error: 'Add to cart button not found' };
    }
    
    // Wait for confirmation
    await this.browser.randomDelay(2000, 3000);
    
    // Verify added to cart
    const confirmationSelectors = [
      '[data-testid="cart-count"]',
      '.cart-count',
      '.toast:has-text("Added")',
      '[role="alert"]:has-text("Added")'
    ];
    
    let confirmed = false;
    for (const selector of confirmationSelectors) {
      if (await this.browser.elementExists(selector)) {
        confirmed = true;
        break;
      }
    }
    
    if (confirmed) {
      this.cart.push({ name: product.name, quantity, price: product.price });
      logger.info(`Successfully added ${product.name} to cart`);
      return { success: true, product };
    } else {
      logger.warn('Add to cart confirmation not detected');
      return { success: true, product, warning: 'Confirmation not detected' };
    }
  }
  
  /**
   * Add multiple items to cart
   */
  async addItemsToCart(items) {
    logger.info(`Adding ${items.length} items to cart`);
    const results = [];
    
    for (const item of items) {
      const result = await this.addToCart(
        item.name,
        item.quantity || 1
      );
      results.push({ item, ...result });
      
      // Wait between items to appear human
      await this.browser.randomDelay(2000, 4000);
    }
    
    return results;
  }
  
  /**
   * View cart
   */
  async viewCart() {
    logger.info('Viewing cart');
    await this.safeNavigate(`${this.baseUrl}/cart`);
    await this.browser.randomDelay(2000, 3000);
    
    // Extract cart items
    const cartItems = await this.browser.evaluate(() => {
      const items = [];
      const rows = document.querySelectorAll('[data-testid="cart-item"], .cart-item, .cart-row');
      
      rows.forEach(row => {
        const nameEl = row.querySelector('[data-testid="item-name"], .item-name, h3, h4');
        const priceEl = row.querySelector('[data-testid="item-price"], .item-price, .price');
        const qtyEl = row.querySelector('[data-testid="item-quantity"], .qty, input[type="number"]');
        
        items.push({
          name: nameEl ? nameEl.textContent.trim() : null,
          price: priceEl ? priceEl.textContent.trim() : null,
          quantity: qtyEl ? qtyEl.value || qtyEl.textContent.trim() : 1
        });
      });
      
      return items;
    });
    
    // Get cart total
    const total = await this.browser.getText('[data-testid="cart-total"], .cart-total, .order-total');
    
    logger.info(`Cart has ${cartItems.length} items, total: ${total || 'unknown'}`);
    
    return {
      items: cartItems,
      total: total,
      count: cartItems.length
    };
  }
  
  /**
   * Proceed to checkout
   */
  async checkout() {
    logger.info('Proceeding to checkout');
    
    // Make sure we have items in cart
    const cart = await this.viewCart();
    if (cart.count === 0) {
      return { success: false, error: 'Cart is empty' };
    }
    
    // Click checkout button
    const checkoutSelectors = [
      '[data-testid="checkout-button"]',
      'button:has-text("Checkout")',
      'button:has-text("Proceed to Checkout")',
      'a:has-text("Checkout")'
    ];
    
    let clicked = false;
    for (const selector of checkoutSelectors) {
      if (await this.browser.elementExists(selector)) {
        await this.browser.click(selector);
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      logger.error('Checkout button not found');
      return { success: false, error: 'Checkout button not found' };
    }
    
    await this.browser.randomDelay(3000, 5000);
    
    // Check for login requirement
    if (await this.browser.elementExists('input[type="email"], input[name="email"]')) {
      logger.info('Login required for checkout');
      const loginResult = await this.login();
      if (!loginResult.success) {
        return { success: false, error: 'Login required but failed', loginResult };
      }
    }
    
    // Check for store selection
    if (await this.browser.elementExists('[data-testid="store-selector"], .store-selector')) {
      await this.selectStore();
    }
    
    logger.info('Checkout flow initiated');
    return { success: true, cart };
  }
  
  /**
   * Select preferred store
   */
  async selectStore(storeName = null) {
    const targetStore = storeName || this.preferences.store;
    logger.info(`Selecting store: ${targetStore}`);
    
    // Search for store
    const searchBox = '[data-testid="store-search"], input[placeholder*="store"], input[placeholder*="zip"]'
    if (await this.browser.elementExists(searchBox)) {
      await this.browser.type(searchBox, targetStore);
      await this.browser.randomDelay(1000, 2000);
      
      // Press enter or click search
      await this.browser.page.keyboard.press('Enter');
      await this.browser.randomDelay(2000, 3000);
    }
    
    // Select store from results
    const storeSelector = `[data-testid="store-result"]:has-text("${targetStore}"), .store-result:has-text("${targetStore}")`;
    if (await this.browser.elementExists(storeSelector)) {
      await this.browser.click(storeSelector);
      logger.info(`Store selected: ${targetStore}`);
    }
  }
  
  /**
   * Set delivery/pickup preferences
   */
  async setPreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
    logger.info('Preferences updated:', this.preferences);
  }
  
  /**
   * Clear cart
   */
  async clearCart() {
    logger.info('Clearing cart');
    await this.viewCart();
    
    // Click remove on all items
    const removeButtons = await this.browser.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="remove-item"], .remove-item, button:has-text("Remove")'))
        .map(btn => btn.getAttribute('data-testid') || btn.className);
    });
    
    for (const btnClass of removeButtons) {
      await this.browser.click(`[data-testid="${btnClass}"], .${btnClass.split(' ').join('.')}`);
      await this.browser.randomDelay(1000, 2000);
    }
    
    this.cart = [];
    logger.info('Cart cleared');
  }
  
  /**
   * Get substitution preferences
   */
  async setSubstitutionPreference(preference = 'similar') {
    logger.info(`Setting substitution preference: ${preference}`);
    
    const prefs = {
      similar: 'Similar Item',
      dont: 'Don\'t Substitute',
      contact: 'Contact Me'
    };
    
    const selector = `input[value="${prefs[preference]}"], label:has-text("${prefs[preference]}")`;
    if (await this.browser.elementExists(selector)) {
      await this.browser.click(selector);
    }
  }
  
  /**
   * Schedule delivery/pickup time
   */
  async scheduleTimeSlot(preferredDate = null) {
    logger.info('Scheduling time slot');
    
    // Wait for calendar/time slot picker
    await this.waitForElement('[data-testid="timeslot-picker"], .timeslot-picker, .calendar', 15000);
    
    // Select first available or preferred date
    const slotSelector = '[data-testid="timeslot"]:not([disabled]), .timeslot:not(.unavailable)';
    const slots = await this.browser.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).map(el => ({
        text: el.textContent.trim(),
        available: !el.disabled && !el.classList.contains('unavailable')
      }));
    }, slotSelector);
    
    if (slots.length > 0) {
      await this.browser.click(`${slotSelector}:first-child`);
      logger.info('Time slot selected');
      return { success: true, slotsAvailable: slots.length };
    }
    
    return { success: false, error: 'No time slots available' };
  }
  
  /**
   * Place order (final step)
   */
  async placeOrder() {
    logger.info('Attempting to place order');
    
    // Verify we're on the final review page
    const reviewSelectors = [
      '[data-testid="order-review"]',
      '.order-review',
      'h1:has-text("Review")',
      'h2:has-text("Review")'
    ];
    
    let onReviewPage = false;
    for (const selector of reviewSelectors) {
      if (await this.browser.elementExists(selector)) {
        onReviewPage = true;
        break;
      }
    }
    
    if (!onReviewPage) {
      logger.error('Not on order review page');
      return { success: false, error: 'Not on review page' };
    }
    
    // Take screenshot before placing order
    await this.screenshot('before-place-order');
    
    // Find and click place order button
    const placeOrderSelectors = [
      '[data-testid="place-order"]',
      'button:has-text("Place Order")',
      'button:has-text("Complete Purchase")',
      'button[type="submit"]:last-child'
    ];
    
    for (const selector of placeOrderSelectors) {
      if (await this.browser.elementExists(selector)) {
        await this.browser.click(selector);
        logger.info('Order placed!');
        
        await this.browser.randomDelay(5000, 8000);
        
        // Check for confirmation
        const confirmation = await this.browser.getText('[data-testid="order-confirmation"], .confirmation, h1');
        
        return { 
          success: true, 
          confirmation: confirmation,
          screenshot: await this.screenshot('order-confirmation')
        };
      }
    }
    
    return { success: false, error: 'Place order button not found' };
  }
  
  /**
   * Full cart building workflow
   */
  async buildCart(items) {
    logger.info(`Starting cart build with ${items.length} items`);
    
    try {
      // Ensure logged in
      await this.ensureLoggedIn();
      await this.browser.randomDelay(2000, 3000);
      
      // Clear existing cart if requested
      // await this.clearCart();
      
      // Add all items
      const results = await this.addItemsToCart(items);
      
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
      logger.error('Cart building failed:', error);
      await this.screenshot('cart-error');
      throw error;
    }
  }
}

// Export both the class and a convenience function
module.exports = { HEBAutomation };

// If run directly, show usage
if (require.main === module) {
  console.log('HEB Browser Automation');
  console.log('Usage:');
  console.log('  const { HEBAutomation } = require("./heb-browser");');
  console.log('  const heb = new HEBAutomation({ headless: false });');
  console.log('  await heb.initialize();');
  console.log('  await heb.buildCart([{ name: "milk", quantity: 1 }, { name: "bread", quantity: 2 }]);');
}
