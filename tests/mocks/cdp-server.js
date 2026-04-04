/**
 * @fileoverview CDP Mock Server and Client
 * Simulates Chrome DevTools Protocol for testing without real browser
 * 
 * @module tests/mocks/cdp-server
 */

const { EventEmitter } = require('events');

/**
 * Mock CDP Server that simulates browser responses
 */
class MockCDPServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 9222;
    this.targets = options.targets || [{ id: 'page-1', type: 'page', url: 'about:blank' }];
    this.connected = false;
    this.commands = new Map();
    
    // Register default command handlers
    this._registerDefaultHandlers();
  }
  
  /**
   * Register a command handler
   * @param {string} method - CDP method name
   * @param {Function} handler - Handler function
   */
  onCommand(method, handler) {
    this.commands.set(method, handler);
  }
  
  /**
   * Register default CDP command handlers
   * @private
   */
  _registerDefaultHandlers() {
    // Target domain
    this.onCommand('Target.getTargets', () => ({
      targetInfos: this.targets
    }));
    
    this.onCommand('Target.attachToTarget', ({ targetId }) => ({
      sessionId: `session-${targetId}`
    }));
    
    // Runtime domain
    this.onCommand('Runtime.evaluate', ({ expression }) => {
      // Simulate simple evaluations
      if (expression.includes('document.title')) {
        return { result: { value: 'Mock Page Title', type: 'string' } };
      }
      if (expression.includes('navigator.webdriver')) {
        return { result: { value: undefined, type: 'undefined' } };
      }
      return { result: { value: null, type: 'object' } };
    });
    
    // DOM domain
    this.onCommand('DOM.querySelector', () => ({
      nodeId: 1
    }));
    
    this.onCommand('DOM.querySelectorAll', () => ({
      nodeIds: [1, 2, 3]
    }));
    
    // Input domain
    this.onCommand('Input.dispatchMouseEvent', () => ({}));
    this.onCommand('Input.dispatchKeyEvent', () => ({}));
    
    // Page domain
    this.onCommand('Page.navigate', ({ url }) => {
      this.emit('navigation', url);
      return { frameId: 'frame-1' };
    });
    
    this.onCommand('Page.enable', () => ({}));
  }
  
  /**
   * Simulate receiving a command
   * @param {Object} message - CDP message
   * @returns {Object} Response
   */
  receive(message) {
    const { method, params, id } = message;
    const handler = this.commands.get(method);
    
    if (handler) {
      try {
        const result = handler(params || {});
        return { id, result };
      } catch (error) {
        return { id, error: { message: error.message, code: -32000 } };
      }
    }
    
    return { id, error: { message: `Method not found: ${method}`, code: -32601 } };
  }
  
  /**
   * Simulate an event from the browser
   * @param {string} method - Event method name
   * @param {Object} params - Event parameters
   */
  emitEvent(method, params = {}) {
    this.emit('event', { method, params });
  }
  
  /**
   * Get mock WebSocket URL
   * @returns {string}
   */
  getWsUrl() {
    return `ws://localhost:${this.port}/devtools/browser/mock-session`;
  }
  
  /**
   * Simulate browser crash
   */
  simulateCrash() {
    this.emit('disconnect');
    this.connected = false;
  }
  
  /**
   * Simulate slow response
   * @param {number} delayMs - Delay in milliseconds
   */
  async simulateSlowResponse(delayMs = 5000) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  /**
   * Reset mock state
   */
  reset() {
    this.targets = [{ id: 'page-1', type: 'page', url: 'about:blank' }];
    this.connected = false;
    this.commands.clear();
    this._registerDefaultHandlers();
  }
}

/**
 * Mock CDP Client for testing
 */
class MockCDPClient extends EventEmitter {
  constructor(server) {
    super();
    this.server = server;
    this.sessionId = null;
    this.connected = false;
  }
  
  /**
   * Connect to mock server
   */
  async connect() {
    this.connected = true;
    this.server.connected = true;
    this.emit('connect');
  }
  
  /**
   * Disconnect from mock server
   */
  async disconnect() {
    this.connected = false;
    this.server.connected = false;
    this.emit('disconnect');
  }
  
  /**
   * Send CDP command
   * @param {string} method - CDP method
   * @param {Object} params - Method parameters
   * @returns {Promise<Object>}
   */
  async send(method, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to CDP server');
    }
    
    const message = { method, params, id: Date.now() };
    const response = this.server.receive(message);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }
  
  /**
   * Create new page
   * @returns {Promise<MockPage>}
   */
  async newPage() {
    const targetId = `page-${Date.now()}`;
    this.server.targets.push({ id: targetId, type: 'page', url: 'about:blank' });
    return new MockPage(this, targetId);
  }
}

/**
 * Mock Page for testing
 */
class MockPage extends EventEmitter {
  constructor(client, targetId) {
    super();
    this.client = client;
    this.targetId = targetId;
    this.url = 'about:blank';
    this.content = '<html><body></body></html>';
    this.selectors = new Map();
  }
  
  /**
   * Navigate to URL
   * @param {string} url 
   */
  async goto(url) {
    this.url = url;
    await this.client.send('Page.navigate', { url });
    this.emit('load');
  }
  
  /**
   * Set page content
   * @param {string} html 
   */
  async setContent(html) {
    this.content = html;
  }
  
  /**
   * Mock element selector
   * @param {string} selector 
   * @param {Object} element 
   */
  mockElement(selector, element) {
    this.selectors.set(selector, element);
  }
  
  /**
   * Click element
   * @param {string} selector 
   */
  async click(selector) {
    const element = this.selectors.get(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    element.clicked = true;
    element.emit?.('click');
  }
  
  /**
   * Type into element
   * @param {string} selector 
   * @param {string} text 
   */
  async type(selector, text) {
    const element = this.selectors.get(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    element.value = text;
  }
  
  /**
   * Get element text
   * @param {string} selector 
   * @returns {Promise<string>}
   */
  async textContent(selector) {
    const element = this.selectors.get(selector);
    return element?.text || '';
  }
  
  /**
   * Wait for selector
   * @param {string} selector 
   * @param {Object} options 
   */
  async waitForSelector(selector, options = {}) {
    if (!this.selectors.has(selector)) {
      throw new Error(`Timeout waiting for selector: ${selector}`);
    }
  }
  
  /**
   * Evaluate JavaScript
   * @param {Function|string} fn 
   * @param {...*} args 
   * @returns {Promise<*>}
   */
  async evaluate(fn, ...args) {
    if (typeof fn === 'function') {
      return fn(this, ...args);
    }
    // Simple expression evaluation
    if (fn.includes('document.title')) {
      return 'Mock Page';
    }
    return null;
  }
  
  /**
   * Take screenshot
   * @param {Object} options 
   * @returns {Promise<Buffer>}
   */
  async screenshot(options = {}) {
    // Return mock PNG buffer
    return Buffer.from('mock-screenshot-data');
  }
}

module.exports = {
  MockCDPServer,
  MockCDPClient,
  MockPage
};
