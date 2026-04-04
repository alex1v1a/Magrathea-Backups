/**
 * CDP Client - Shared Chrome DevTools Protocol Connection
 * 
 * Provides unified connection management for Chrome/Edge automation.
 * Handles connection pooling, reconnection, and browser lifecycle.
 * 
 * @module lib/cdp-client
 */

const { chromium } = require('playwright');
const http = require('http');
const EventEmitter = require('events');

// Default configuration
const DEFAULT_CONFIG = {
  debugPort: 9222,
  connectTimeout: 30000,
  reconnectAttempts: 3,
  reconnectDelay: 2000,
  healthCheckInterval: 30000,
};

/**
 * CDP Connection Manager
 * Manages browser connections via Chrome DevTools Protocol
 */
class CDPClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isConnected = false;
    this.healthCheckTimer = null;
    this.connectionAttempts = 0;
  }

  /**
   * Get CDP endpoint URL
   * @returns {string}
   */
  getCdpUrl() {
    return `http://localhost:${this.config.debugPort}`;
  }

  /**
   * Check if browser is responding on debug port
   * @returns {Promise<boolean>}
   */
  async isBrowserRunning() {
    return new Promise((resolve) => {
      const req = http.get(`${this.getCdpUrl()}/json/version`, {
        timeout: 3000
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Connect to browser via CDP
   * @param {Object} options - Connection options
   * @returns {Promise<Object>} { browser, context, page }
   */
  async connect(options = {}) {
    const { createPage = true, url = null, timeout = this.config.connectTimeout } = options;

    try {
      // Check if already connected
      if (this.isConnected && this.browser) {
        const stillConnected = await this.ping();
        if (stillConnected) {
          this.emit('reconnect', { cached: true });
          return this.getConnection();
        }
      }

      // Wait for browser to be available
      const isRunning = await this.isBrowserRunning();
      if (!isRunning) {
        throw new Error(`No browser found on port ${this.config.debugPort}. Ensure Chrome/Edge is running with --remote-debugging-port=${this.config.debugPort}`);
      }

      // Connect via CDP
      this.emit('connecting', { url: this.getCdpUrl() });
      
      this.browser = await chromium.connectOverCDP(this.getCdpUrl(), { timeout });
      this.isConnected = true;
      this.connectionAttempts = 0;

      // Get or create context
      const contexts = this.browser.contexts();
      this.context = contexts[0] || await this.browser.newContext();

      // Get or create page
      if (createPage) {
        const pages = this.context.pages();
        this.page = pages[0] || await this.context.newPage();
        
        if (url) {
          await this.page.goto(url, { waitUntil: 'networkidle' });
        }
      }

      this.emit('connected', { browser: this.browser, context: this.context, page: this.page });
      this.startHealthCheck();

      return this.getConnection();

    } catch (error) {
      this.emit('error', error);
      
      // Attempt reconnection
      if (this.connectionAttempts < this.config.reconnectAttempts) {
        this.connectionAttempts++;
        this.emit('reconnecting', { attempt: this.connectionAttempts });
        await this.sleep(this.config.reconnectDelay * this.connectionAttempts);
        return this.connect(options);
      }

      throw error;
    }
  }

  /**
   * Get current connection objects
   * @returns {Object} { browser, context, page }
   */
  getConnection() {
    return {
      browser: this.browser,
      context: this.context,
      page: this.page
    };
  }

  /**
   * Ping the browser to check connection health
   * @returns {Promise<boolean>}
   */
  async ping() {
    try {
      if (!this.browser) return false;
      // Try to get browser version as a ping
      await this.browser.contexts();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect from browser (without closing it)
   */
  async disconnect() {
    this.stopHealthCheck();
    
    try {
      // Only disconnect if browser exists, is connected, and has disconnect method
      if (this.browser && this.isConnected && typeof this.browser.disconnect === 'function') {
        await this.browser.disconnect();
        this.emit('disconnected');
      }
    } catch (error) {
      // Suppress benign disconnect errors (browser may already be closed)
      const msg = error.message || '';
      const isBenign = msg.includes('disconnect is not a function') ||
                       msg.includes('Browser has been closed') ||
                       msg.includes('Target closed') ||
                       msg.includes('Protocol error');
      
      if (!isBenign) {
        this.emit('error', error);
      }
      // Silently ignore benign disconnect warnings
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isConnected = false;
    }
  }

  /**
   * Start health check interval
   */
  startHealthCheck() {
    if (this.healthCheckTimer) return;
    
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.ping();
      if (!healthy) {
        this.emit('unhealthy');
        this.isConnected = false;
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Execute function with automatic retry on disconnect
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Execution options
   * @returns {Promise<any>}
   */
  async execute(fn, options = {}) {
    const { reconnect = true, maxRetries = 2 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure connection
        if (!this.isConnected) {
          await this.connect();
        }
        
        return await fn(this.page, this.context, this.browser);
        
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Check if it's a connection error
        if (reconnect && this.isConnectionError(error)) {
          this.emit('reconnecting', { attempt, reason: error.message });
          this.isConnected = false;
          await this.sleep(1000 * attempt);
          await this.connect();
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Check if error is a connection error
   * @param {Error} error
   * @returns {boolean}
   */
  isConnectionError(error) {
    const msg = error.message.toLowerCase();
    return msg.includes('protocol error') ||
           msg.includes('target closed') ||
           msg.includes('connection closed') ||
           msg.includes('browser has been closed');
  }

  /**
   * Utility sleep function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    await this.disconnect();
    this.removeAllListeners();
  }
}

/**
 * Quick connect helper - creates client and connects in one call
 * @param {Object} options - Connection options
 * @returns {Promise<CDPClient>}
 */
async function connectToBrowser(options = {}) {
  const client = new CDPClient(options);
  await client.connect(options);
  return client;
}

/**
 * Get browser info from CDP endpoint
 * @param {number} port - Debug port
 * @returns {Promise<Object|null>}
 */
async function getBrowserInfo(port = 9222) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}/json/version`, {
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * List all pages/tabs from CDP endpoint
 * @param {number} port - Debug port
 * @returns {Promise<Array>}
 */
async function listPages(port = 9222) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}/json/list`, {
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

module.exports = {
  CDPClient,
  connectToBrowser,
  getBrowserInfo,
  listPages,
  DEFAULT_CONFIG
};
