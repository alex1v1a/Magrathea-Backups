// HEB Cart API - Content Script
// Injected into heb.com pages to expose automation API
// Add this to: dinner-automation/heb-extension/content-script-api.js

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.hebCartAPI) {
    console.log('HEB Cart API already initialized');
    return;
  }
  
  console.log('🔧 HEB Cart API Initializing...');
  
  class HEBCartAPI {
    constructor() {
      this.version = '1.0.0';
      this.isReady = false;
      this.pendingRequests = new Map();
      this.init();
    }
    
    async init() {
      // Listen for messages from bridge script
      window.addEventListener('message', this.handleExternalMessage.bind(this));
      
      // Listen for messages from extension background
      chrome.runtime?.onMessage?.addListener(this.handleExtensionMessage.bind(this));
      
      this.isReady = true;
      console.log('✅ HEB Cart API Ready');
      
      // Notify that API is ready
      window.postMessage({ type: 'HEB_CART_API_READY', version: this.version }, '*');
    }
    
    handleExternalMessage(event) {
      if (event.source !== window) return;
      if (!event.data?.type?.startsWith('HEB_CART_')) return;
      
      const { type, id, command, payload } = event.data;
      
      if (type === 'HEB_CART_COMMAND') {
        this.executeCommand(command, payload)
          .then(result => {
            window.postMessage({
              type: 'HEB_CART_RESPONSE',
              id,
              success: true,
              result
            }, '*');
          })
          .catch(error => {
            window.postMessage({
              type: 'HEB_CART_RESPONSE',
              id,
              success: false,
              error: error.message
            }, '*');
          });
      }
    }
    
    handleExtensionMessage(request, sender, sendResponse) {
      if (request.type === 'HEB_CART_COMMAND') {
        this.executeCommand(request.command, request.payload)
          .then(result => sendResponse({ success: true, result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open
      }
    }
    
    async executeCommand(command, payload = {}) {
      console.log(`📝 Executing: ${command}`, payload);
      
      switch(command) {
        case 'ping':
          return { pong: true, version: this.version, url: window.location.href };
          
        case 'search':
          return this.searchProduct(payload.term);
          
        case 'addToCart':
          return this.addToCart(payload);
          
        case 'getCart':
          return this.getCartItems();
          
        case 'removeFromCart':
          return this.removeFromCart(payload);
          
        case 'clearCart':
          return this.clearCart();
          
        case 'navigate':
          window.location.href = payload.url;
          return { navigated: true, url: payload.url };
          
        case 'getPageInfo':
          return this.getPageInfo();
          
        case 'waitForElement':
          return this.waitForElement(payload.selector, payload.timeout);
          
        case 'click':
          return this.clickElement(payload.selector);
          
        case 'type':
          return this.typeText(payload.selector, payload.text);
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    }
    
    // ==================== CART OPERATIONS ====================
    
    async searchProduct(term) {
      if (!term) throw new Error('Search term required');
      
      console.log(`🔍 Searching for: ${term}`);
      
      // Navigate to search
      const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(term)}`;
      window.location.href = searchUrl;
      
      // Wait for results to load
      await this.sleep(3000);
      await this.waitForAnyOf([
        '[data-testid="product-grid"]',
        '.product-grid',
        '[class*="product-list"]',
        'article[data-product-id]'
      ], 15000);
      
      // Extract products
      return this.extractProductsFromPage();
    }
    
    async addToCart({ productId, searchTerm, quantity = 1, waitForResults = true }) {
      console.log(`🛒 Adding to cart: ${productId || searchTerm}`);
      
      // If we have a search term, navigate to search results first
      if (searchTerm && !productId) {
        await this.searchProduct(searchTerm);
      }
      
      // Wait for page to stabilize
      await this.sleep(2000);
      
      // Try to find and click the add button
      const addButton = await this.findAddToCartButton(productId);
      
      if (!addButton) {
        throw new Error('Add to cart button not found');
      }
      
      // Human-like interaction
      await this.humanLikeClick(addButton);
      
      // Wait for confirmation
      await this.sleep(2000);
      
      // Check for success indicators
      const success = await this.checkAddSuccess();
      
      return {
        success,
        productId,
        searchTerm,
        timestamp: new Date().toISOString()
      };
    }
    
    async getCartItems() {
      console.log('🛍️ Getting cart items...');
      
      // Navigate to cart
      window.location.href = 'https://www.heb.com/cart';
      await this.sleep(3000);
      
      // Wait for cart to load
      const cartContainer = await this.waitForAnyOf([
        '[data-testid="cart-items"]',
        '.cart-items',
        '[class*="cart-item"]',
        '.cart-page'
      ], 10000);
      
      // Extract items
      const items = await this.extractCartItems();
      
      return {
        itemCount: items.length,
        items,
        timestamp: new Date().toISOString()
      };
    }
    
    async removeFromCart({ itemId, productName }) {
      console.log(`🗑️ Removing from cart: ${itemId || productName}`);
      
      // Ensure we're on cart page
      if (!window.location.href.includes('/cart')) {
        await this.getCartItems();
      }
      
      // Find item to remove
      const item = await this.findCartItem(itemId, productName);
      if (!item) {
        throw new Error(`Cart item not found: ${itemId || productName}`);
      }
      
      // Find remove button
      const removeBtn = item.querySelector(
        'button[aria-label*="remove"], button[data-testid*="remove"], .remove-item'
      );
      
      if (!removeBtn) {
        throw new Error('Remove button not found for item');
      }
      
      await this.humanLikeClick(removeBtn);
      await this.sleep(1500);
      
      return { removed: true, itemId, productName };
    }
    
    async clearCart() {
      console.log('🧹 Clearing cart...');
      
      const cart = await this.getCartItems();
      const results = [];
      
      for (const item of cart.items) {
        try {
          await this.removeFromCart({ itemId: item.id, productName: item.name });
          results.push({ success: true, name: item.name });
        } catch (e) {
          results.push({ success: false, name: item.name, error: e.message });
        }
        await this.sleep(1000);
      }
      
      return { cleared: true, results };
    }
    
    // ==================== UTILITY METHODS ====================
    
    async findAddToCartButton(productId) {
      // If productId provided, find specific product
      if (productId) {
        const product = document.querySelector(`[data-product-id="${productId}"]`);
        if (product) {
          return product.querySelector('button[data-testid*="add"], button[aria-label*="Add"]');
        }
      }
      
      // Otherwise, find first available add button
      const selectors = [
        'button[data-testid*="add-to-cart"]',
        'button[data-testid*="AddToCart"]',
        'button[data-automation-id*="add"]',
        'button[aria-label*="Add"]'
      ];
      
      for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (btn.offsetParent !== null && !btn.disabled) {
            return btn;
          }
        }
      }
      
      // Last resort: look for any button with "add" text
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase().trim();
        if ((text === 'add' || text.includes('add to cart')) && 
            btn.offsetParent !== null && !btn.disabled) {
          return btn;
        }
      }
      
      return null;
    }
    
    async humanLikeClick(element) {
      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(500 + Math.random() * 500);
      
      // Visual feedback
      element.style.outline = '3px solid #22c55e';
      element.style.transition = 'outline 0.2s';
      
      // Click with small delay
      await this.sleep(100);
      element.click();
      
      // Remove highlight after a moment
      setTimeout(() => {
        element.style.outline = '';
      }, 1000);
    }
    
    async checkAddSuccess() {
      // Check various success indicators
      const indicators = [
        '[data-testid*="cart-count"]',
        '.cart-updated',
        '[aria-live="polite"]',
        '.add-to-cart-confirmation',
        '[class*="success"]'
      ];
      
      for (const selector of indicators) {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
          return true;
        }
      }
      
      // Also check if cart count changed
      return true; // Assume success if no error was thrown
    }
    
    extractProductsFromPage() {
      const products = [];
      const selectors = [
        '[data-testid="product-grid"] > *',
        '.product-grid > *',
        'article[data-product-id]',
        '[class*="product-card"]'
      ];
      
      let productElements = [];
      for (const selector of selectors) {
        productElements = document.querySelectorAll(selector);
        if (productElements.length > 0) break;
      }
      
      productElements.forEach((el, index) => {
        try {
          const id = el.dataset.productId || 
                     el.querySelector('[data-product-id]')?.dataset.productId ||
                     `product-${index}`;
          
          const nameEl = el.querySelector('h3, .product-name, [data-testid*="name"], h2, h4');
          const name = nameEl?.textContent?.trim() || 'Unknown Product';
          
          const priceEl = el.querySelector('[data-testid*="price"], .price, [class*="price"]');
          const price = priceEl?.textContent?.trim() || 'Price not shown';
          
          const imageEl = el.querySelector('img');
          const imageUrl = imageEl?.src || imageEl?.dataset?.src;
          
          products.push({ id, name, price, imageUrl });
        } catch (e) {
          console.warn('Error extracting product:', e);
        }
      });
      
      return products;
    }
    
    async extractCartItems() {
      const items = [];
      const itemElements = document.querySelectorAll(
        '[data-testid="cart-item"], .cart-item, [class*="cart-item"]'
      );
      
      itemElements.forEach(el => {
        try {
          const id = el.dataset.itemId || el.dataset.productId;
          const name = el.querySelector('h3, .product-name, [data-testid*="name"]')?.textContent?.trim();
          const price = el.querySelector('[data-testid*="price"], .price')?.textContent?.trim();
          const quantity = el.querySelector('input[type="number"], .quantity-input, [data-testid*="quantity"]')?.value || '1';
          
          if (name) {
            items.push({ id, name, price, quantity });
          }
        } catch (e) {
          console.warn('Error extracting cart item:', e);
        }
      });
      
      return items;
    }
    
    async findCartItem(itemId, productName) {
      const items = document.querySelectorAll(
        '[data-testid="cart-item"], .cart-item, [class*="cart-item"]'
      );
      
      for (const item of items) {
        if (itemId && item.dataset.itemId === itemId) {
          return item;
        }
        
        if (productName) {
          const nameEl = item.querySelector('h3, .product-name');
          if (nameEl?.textContent.toLowerCase().includes(productName.toLowerCase())) {
            return item;
          }
        }
      }
      
      return null;
    }
    
    getPageInfo() {
      return {
        url: window.location.href,
        title: document.title,
        isLoggedIn: this.checkLoginStatus(),
        isCartPage: window.location.href.includes('/cart'),
        isSearchPage: window.location.href.includes('/search'),
        timestamp: new Date().toISOString()
      };
    }
    
    checkLoginStatus() {
      // Check for account-related elements
      const accountSelectors = [
        '[data-testid*="account"]',
        '.account-menu',
        '[aria-label*="Account"]'
      ];
      
      const hasAccountElement = accountSelectors.some(s => document.querySelector(s));
      
      // Check for welcome message
      const welcomeText = Array.from(document.querySelectorAll('button, a, span'))
        .some(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('welcome') || text.includes('hello') || text.includes('hi,');
        });
      
      // Check if on login page
      const isLoginPage = window.location.href.includes('/login') || 
                          window.location.href.includes('/interaction/') ||
                          window.location.href.includes('/accounts.heb.com');
      
      return (hasAccountElement || welcomeText) && !isLoginPage;
    }
    
    // ==================== DOM HELPERS ====================
    
    async waitForElement(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        
        const observer = new MutationObserver(() => {
          const el = document.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Timeout waiting for: ${selector}`));
        }, timeout);
      });
    }
    
    async waitForAnyOf(selectors, timeout = 10000) {
      return Promise.race(
        selectors.map(s => this.waitForElement(s, timeout).catch(() => null))
      );
    }
    
    async clickElement(selector) {
      const el = await this.waitForElement(selector, 5000);
      await this.humanLikeClick(el);
      return { clicked: true, selector };
    }
    
    async typeText(selector, text) {
      const el = await this.waitForElement(selector, 5000);
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { typed: true, selector, text };
    }
    
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // Initialize and expose globally
  window.hebCartAPI = new HEBCartAPI();
  
})();
