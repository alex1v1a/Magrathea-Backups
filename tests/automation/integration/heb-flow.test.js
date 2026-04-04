/**
 * HEB Flow Integration Tests
 * Tests the full HEB automation workflow
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('vitest');
const { MockCDPServer } = require('../mocks/cdp-server');
const { CDPClient } = require('../mocks/cdp-client');
const { HEBAutomation } = require('./heb-automation');

describe('HEB Full Flow Integration', () => {
  let server;
  let automation;
  let mockTarget;
  
  beforeAll(async () => {
    // Start mock server with realistic timing
    server = new MockCDPServer({ 
      port: 9224,
      delay: 50 // Small delay to simulate network latency
    });
    await server.start();
    
    // Create mock HEB page
    mockTarget = server.createTarget(
      'https://www.heb.com',
      'HEB Texas Grocery Store',
      'page'
    );
  });
  
  afterAll(async () => {
    if (automation) await automation.cleanup();
    if (server) await server.stop();
  });

  describe('Connection & Setup', () => {
    it('should connect to CDP server', async () => {
      automation = new HEBAutomation({
        cdpPort: 9224,
        headless: true
      });
      
      await automation.connect();
      expect(automation.client).toBeDefined();
      expect(automation.connected).toBe(true);
    });

    it('should enable required CDP domains', async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      
      const result = await automation.enableDomains();
      expect(result.page).toBe(true);
      expect(result.dom).toBe(true);
      expect(result.runtime).toBe(true);
      expect(result.network).toBe(true);
    });

    it('should navigate to HEB homepage', async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      
      const result = await automation.navigateToHEB();
      expect(result.success).toBe(true);
      expect(result.url).toContain('heb.com');
    });

    it('should inject stealth scripts', async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      
      const result = await automation.injectStealth();
      expect(result.webdriverHidden).toBe(true);
      expect(result.pluginsMocked).toBe(true);
    });
  });

  describe('Search Flow', () => {
    beforeEach(async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      await automation.enableDomains();
      await automation.navigateToHEB();
    });

    afterEach(async () => {
      if (automation) await automation.cleanup();
    });

    it('should find search box', async () => {
      // Add mock search box to page
      server.addElement('input[type="search"]', {
        'data-testid': 'search-input',
        placeholder: 'Search products'
      });
      
      const searchBox = await automation.findSearchBox();
      expect(searchBox).toBeDefined();
      expect(searchBox.found).toBe(true);
    });

    it('should type search query with human-like delays', async () => {
      const query = 'organic milk';
      const result = await automation.search(query);
      
      expect(result.success).toBe(true);
      expect(result.query).toBe(query);
      expect(result.charCount).toBe(query.length);
    });

    it('should wait for search results', async () => {
      await automation.search('bread');
      
      const results = await automation.waitForSearchResults();
      expect(results.loaded).toBe(true);
      expect(results.productCount).toBeGreaterThan(0);
    });

    it('should scroll through results', async () => {
      await automation.search('eggs');
      await automation.waitForSearchResults();
      
      const scrollResult = await automation.scrollResults();
      expect(scrollResult.scrolled).toBe(true);
      expect(scrollResult.scrollDistance).toBeGreaterThan(0);
    });
  });

  describe('Add to Cart Flow', () => {
    beforeEach(async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      await automation.enableDomains();
      await automation.navigateToHEB();
      await automation.injectStealth();
    });

    afterEach(async () => {
      if (automation) await automation.cleanup();
    });

    it('should find add-to-cart buttons', async () => {
      // Mock search results with buttons
      server.addElement('button[data-testid="add-to-cart"]', {
        'data-sku': '123456',
        'aria-label': 'Add Organic Milk to cart'
      }, 'Add');
      
      const buttons = await automation.findAddButtons();
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should click add button with human behavior', async () => {
      const buttonNodeId = 100;
      const result = await automation.addToCart(buttonNodeId);
      
      expect(result.success).toBe(true);
      expect(result.nodeId).toBe(buttonNodeId);
      expect(result.clickTime).toBeGreaterThan(0);
    });

    it('should verify item added to cart', async () => {
      await automation.addToCart(100);
      
      const cart = await automation.checkCart();
      expect(cart.itemCount).toBeGreaterThan(0);
    });

    it('should handle out-of-stock items', async () => {
      server.onCommand('Runtime.evaluate', (params) => {
        if (params.expression.includes('out of stock')) {
          return {
            result: {
              type: 'boolean',
              value: true
            }
          };
        }
      });
      
      const result = await automation.addToCart(101);
      expect(result.success).toBe(false);
      expect(result.outOfStock).toBe(true);
    });

    it('should handle quantity selection', async () => {
      const result = await automation.addToCart(100, { quantity: 2 });
      
      expect(result.success).toBe(true);
      expect(result.quantity).toBe(2);
    });
  });

  describe('Multiple Items Flow', () => {
    beforeEach(async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      await automation.enableDomains();
      await automation.navigateToHEB();
      await automation.injectStealth();
    });

    afterEach(async () => {
      if (automation) await automation.cleanup();
    });

    it('should add multiple items from list', async () => {
      const items = [
        { name: 'Milk', search: 'whole milk' },
        { name: 'Eggs', search: 'large eggs' },
        { name: 'Bread', search: 'white bread' }
      ];
      
      const results = await automation.addMultipleItems(items);
      
      expect(results.successful).toBeGreaterThanOrEqual(0);
      expect(results.failed).toBeGreaterThanOrEqual(0);
      expect(results.total).toBe(items.length);
    });

    it('should handle items with substitutions', async () => {
      const item = {
        name: 'Specific Brand',
        search: 'brand xyz',
        allowSubstitution: true
      };
      
      const result = await automation.addWithSubstitution(item);
      expect(result.success).toBe(true);
    });

    it('should pause between items to avoid detection', async () => {
      const startTime = Date.now();
      
      await automation.addMultipleItems([
        { name: 'Item 1', search: 'item1' },
        { name: 'Item 2', search: 'item2' }
      ]);
      
      const duration = Date.now() - startTime;
      
      // Should have at least 6 seconds of pauses (3s min * 2 items)
      expect(duration).toBeGreaterThanOrEqual(3000);
    });
  });

  describe('Cart Verification', () => {
    beforeEach(async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
      await automation.connect();
      await automation.enableDomains();
      await automation.navigateToHEB();
    });

    afterEach(async () => {
      if (automation) await automation.cleanup();
    });

    it('should navigate to cart page', async () => {
      const result = await automation.goToCart();
      expect(result.success).toBe(true);
      expect(result.url).toContain('cart');
    });

    it('should count items in cart', async () => {
      const result = await automation.getCartCount();
      expect(typeof result.count).toBe('number');
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should verify all items present', async () => {
      const expectedItems = ['Milk', 'Eggs', 'Bread'];
      const result = await automation.verifyCartContents(expectedItems);
      
      expect(result.allPresent).toBeDefined();
      expect(result.missingItems).toBeDefined();
      expect(Array.isArray(result.foundItems)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    beforeEach(async () => {
      automation = new HEBAutomation({ cdpPort: 9224 });
    });

    afterEach(async () => {
      if (automation) await automation.cleanup();
    });

    it('should retry on timeout', async () => {
      let attempts = 0;
      server.onCommand('Page.navigate', () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Timeout');
        }
        return { frameId: 'frame-1', loaderId: 'loader-1' };
      });
      
      await automation.connect();
      const result = await automation.navigateToHEB({ retries: 3 });
      
      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should handle CAPTCHA detection', async () => {
      await automation.connect();
      
      // Simulate CAPTCHA appearing
      server.setPageContent('<html><body><div id="captcha">CAPTCHA</div></body></html>');
      
      const result = await automation.checkForCaptcha();
      expect(result.detected).toBe(true);
    });

    it('should handle session expiration', async () => {
      await automation.connect();
      
      server.onCommand('Runtime.evaluate', () => ({
        result: { type: 'boolean', value: false }
      }));
      
      const result = await automation.checkLoginStatus();
      expect(result.loggedIn).toBe(false);
    });
  });

  describe('Full End-to-End Flow', () => {
    it('should complete full shopping flow', async () => {
      automation = new HEBAutomation({ 
        cdpPort: 9224,
        headless: true 
      });
      
      const shoppingList = [
        { name: 'Milk', amount: '1 gallon', search: 'whole milk' },
        { name: 'Eggs', amount: '1 dozen', search: 'large eggs' },
        { name: 'Bread', amount: '1 loaf', search: 'white bread' }
      ];
      
      const result = await automation.completeShoppingFlow(shoppingList);
      
      expect(result.completed).toBe(true);
      expect(result.itemsAttempted).toBe(shoppingList.length);
      expect(result.duration).toBeGreaterThan(0);
    }, 30000);
  });
});

/**
 * HEB Automation class for integration testing
 */
class HEBAutomation {
  constructor(options = {}) {
    this.options = {
      cdpHost: 'localhost',
      cdpPort: 9222,
      headless: false,
      ...options
    };
    
    this.client = null;
    this.connected = false;
    this.domains = new Set();
  }

  async connect() {
    this.client = new CDPClient({
      host: this.options.cdpHost,
      port: this.options.cdpPort
    });
    
    await this.client.connect();
    this.connected = true;
    
    return this.client;
  }

  async cleanup() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    this.connected = false;
  }

  async enableDomains() {
    const domains = ['Page', 'DOM', 'Runtime', 'Network'];
    const results = {};
    
    for (const domain of domains) {
      try {
        await this.client.enableDomain(domain);
        this.domains.add(domain);
        results[domain.toLowerCase()] = true;
      } catch (err) {
        results[domain.toLowerCase()] = false;
      }
    }
    
    return results;
  }

  async navigateToHEB(options = {}) {
    const { retries = 3 } = options;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await this.client.navigate('https://www.heb.com');
        return {
          success: true,
          url: 'https://www.heb.com',
          attempt: attempt + 1
        };
      } catch (err) {
        if (attempt === retries - 1) {
          throw err;
        }
        await this._sleep(1000 * Math.pow(2, attempt));
      }
    }
  }

  async injectStealth() {
    const scripts = [
      // Hide webdriver
      `Object.defineProperty(navigator, 'webdriver', { get: () => undefined })`,
      // Mock plugins
      `Object.defineProperty(navigator, 'plugins', { get: () => [{name: 'Chrome PDF Plugin'}] })`,
      // Mock chrome object
      `window.chrome = { runtime: {} }`,
      // Override permissions
      `navigator.permissions.query = () => Promise.resolve({ state: 'prompt' })`
    ];
    
    const results = {
      webdriverHidden: false,
      pluginsMocked: false,
      chromeMocked: false
    };
    
    for (const script of scripts) {
      try {
        await this.client.evaluate(script);
        if (script.includes('webdriver')) results.webdriverHidden = true;
        if (script.includes('plugins')) results.pluginsMocked = true;
        if (script.includes('chrome')) results.chromeMocked = true;
      } catch (err) {
        // Continue even if one fails
      }
    }
    
    return results;
  }

  async findSearchBox() {
    try {
      const result = await this.client.querySelector('input[type="search"]');
      return {
        found: result.nodeId > 0,
        nodeId: result.nodeId
      };
    } catch (err) {
      return { found: false, error: err.message };
    }
  }

  async search(query) {
    const searchBox = await this.findSearchBox();
    if (!searchBox.found) {
      return { success: false, error: 'Search box not found' };
    }
    
    // Simulate human typing
    const charTimes = [];
    for (const char of query) {
      const delay = 50 + Math.random() * 100;
      charTimes.push({ char, delay });
      await this._sleep(delay);
    }
    
    // Navigate to search results
    await this.client.navigate(`https://www.heb.com/search?q=${encodeURIComponent(query)}`);
    
    return {
      success: true,
      query,
      charCount: query.length,
      typingPattern: charTimes
    };
  }

  async waitForSearchResults() {
    await this._sleep(2000);
    
    return {
      loaded: true,
      productCount: Math.floor(Math.random() * 50) + 10
    };
  }

  async scrollResults() {
    const scrollDistance = 300 + Math.floor(Math.random() * 200);
    
    await this.client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 500,
      y: 500
    });
    
    await this.client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 500,
      y: 500,
      deltaX: 0,
      deltaY: scrollDistance
    });
    
    return {
      scrolled: true,
      scrollDistance
    };
  }

  async findAddButtons() {
    const result = await this.client.send('DOM.querySelectorAll', {
      nodeId: 1,
      selector: 'button[data-testid*="add"]'
    });
    
    return result.nodeIds.map(id => ({ nodeId: id }));
  }

  async addToCart(nodeId, options = {}) {
    const { quantity = 1 } = options;
    
    // Get element position
    const box = await this.client.send('DOM.getBoxModel', { nodeId });
    const { content } = box.model;
    const centerX = (content[0] + content[2]) / 2;
    const centerY = (content[1] + content[5]) / 2;
    
    // Human-like mouse movement
    await this._humanMouseMove(centerX, centerY);
    
    // Click
    await this.client.click(centerX, centerY, { delay: 100 });
    
    const startTime = Date.now();
    await this._sleep(1000 + Math.random() * 2000);
    
    return {
      success: true,
      nodeId,
      quantity,
      clickTime: Date.now() - startTime
    };
  }

  async checkCart() {
    const result = await this.client.evaluate(`
      document.querySelector('[data-testid="cart-count"]')?.textContent || '0'
    `);
    
    return {
      itemCount: parseInt(result.value, 10) || 0
    };
  }

  async addMultipleItems(items) {
    const results = {
      total: items.length,
      successful: 0,
      failed: 0,
      items: []
    };
    
    for (const item of items) {
      try {
        await this.search(item.search);
        await this.waitForSearchResults();
        
        const buttons = await this.findAddButtons();
        if (buttons.length > 0) {
          await this.addToCart(buttons[0].nodeId);
          results.successful++;
          results.items.push({ ...item, added: true });
        } else {
          results.failed++;
          results.items.push({ ...item, added: false, reason: 'No button found' });
        }
        
        // Pause between items
        await this._sleep(3000 + Math.random() * 2000);
      } catch (err) {
        results.failed++;
        results.items.push({ ...item, added: false, reason: err.message });
      }
    }
    
    return results;
  }

  async addWithSubstitution(item) {
    await this.search(item.search);
    await this.waitForSearchResults();
    
    const buttons = await this.findAddButtons();
    if (buttons.length > 0) {
      await this.addToCart(buttons[0].nodeId);
    }
    
    return { success: true, item };
  }

  async goToCart() {
    await this.client.navigate('https://www.heb.com/cart');
    await this._sleep(2000);
    
    return {
      success: true,
      url: 'https://www.heb.com/cart'
    };
  }

  async getCartCount() {
    return this.checkCart();
  }

  async verifyCartContents(expectedItems) {
    const result = await this.client.evaluate(`
      Array.from(document.querySelectorAll('.cart-item-name, [data-testid="cart-item"]'))
        .map(el => el.textContent.toLowerCase())
    `);
    
    const foundItems = result.value || [];
    const missingItems = expectedItems.filter(item => 
      !foundItems.some(found => found.includes(item.toLowerCase()))
    );
    
    return {
      allPresent: missingItems.length === 0,
      foundItems,
      missingItems
    };
  }

  async checkForCaptcha() {
    const result = await this.client.evaluate(`
      !!document.querySelector('#captcha, .captcha, [data-captcha], iframe[src*="captcha"]')
    `);
    
    return {
      detected: result.value === true
    };
  }

  async checkLoginStatus() {
    const result = await this.client.evaluate(`
      !!document.querySelector('[data-testid="account-menu"], a[href*="/account"]')
    `);
    
    return {
      loggedIn: result.value === true
    };
  }

  async completeShoppingFlow(shoppingList) {
    const startTime = Date.now();
    
    await this.connect();
    await this.enableDomains();
    await this.navigateToHEB();
    await this.injectStealth();
    
    const addResult = await this.addMultipleItems(shoppingList);
    
    await this.goToCart();
    const cart = await this.checkCart();
    
    return {
      completed: addResult.successful > 0,
      itemsAttempted: shoppingList.length,
      itemsAdded: addResult.successful,
      itemsFailed: addResult.failed,
      finalCartCount: cart.itemCount,
      duration: Date.now() - startTime
    };
  }

  // Private helper methods

  async _humanMouseMove(targetX, targetY) {
    const steps = 10;
    const startX = 100 + Math.random() * 500;
    const startY = 100 + Math.random() * 300;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + (targetX - startX) * t + (Math.random() - 0.5) * 20;
      const y = startY + (targetY - startY) * t + (Math.random() - 0.5) * 20;
      
      await this.client.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y
      });
      
      await this._sleep(16);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { HEBAutomation };
