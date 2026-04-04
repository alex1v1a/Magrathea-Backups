/**
 * HEB Bridge - Node.js script to control HEB via extension API - REFACTORED
 * 
 * Connects to Chrome/Edge via CDP and communicates with content script.
 * Refactored to use shared library utilities.
 * 
 * @module heb-bridge-refactored
 * @requires puppeteer-core
 * @requires express
 * @requires ./lib
 */

const puppeteer = require('puppeteer-core');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Shared library utilities
const {
  logger,
  getConfig,
  withRetry,
  sleep,
  validateRequired,
  validateArray,
  validateHEBCartItem,
  ValidationError,
  ValidationErrors
} = require('./lib');

// Component-specific logger
const log = logger.child('heb-bridge');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Browser connection
  cdpUrl: 'http://localhost:9222',
  
  // API server
  apiPort: 8765,
  
  // HEB
  hebUrl: 'https://www.heb.com',
  
  // Retry settings
  retry: {
    maxRetries: 3,
    delay: 1000,
    backoff: 2
  },
  
  // Rate limiting
  rateLimit: {
    addItemDelay: 2000
  }
};

// ============================================================================
// HEB BRIDGE CLASS
// ============================================================================

/**
 * Bridge between Node.js and HEB browser extension
 * Provides HTTP API for controlling HEB automation
 */
class HEBBridge {
  constructor(options = {}) {
    this.options = {
      port: CONFIG.apiPort,
      cdpUrl: CONFIG.cdpUrl,
      ...options
    };
    
    this.browser = null;
    this.hebPage = null;
    this.app = express();
    this.server = null;
    
    this._setupMiddleware();
    this._setupRoutes();
  }

  /**
   * Setup Express middleware
   * @private
   */
  _setupMiddleware() {
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      log.debug(`${req.method} ${req.path}`, { 
        query: req.query,
        body: req.body && Object.keys(req.body).length > 0 ? '[present]' : undefined
      });
      next();
    });
    
    // Error handling middleware
    this.app.use((err, req, res, next) => {
      log.error('Express error', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    });
  }

  /**
   * Setup API routes
   * @private
   */
  _setupRoutes() {
    // Health check
    this.app.get('/health', this._handleHealth.bind(this));
    
    // Cart operations
    this.app.get('/api/cart', this._handleGetCart.bind(this));
    this.app.post('/api/cart/add', this._handleAddToCart.bind(this));
    this.app.post('/api/cart/sync', this._handleSync.bind(this));
    this.app.post('/api/cart/clear', this._handleClearCart.bind(this));
    
    // Page info
    this.app.get('/api/page', this._handleGetPage.bind(this));
    
    // Generic command
    this.app.post('/api/command', this._handleCommand.bind(this));
  }

  /**
   * Handle health check
   * @private
   */
  _handleHealth(req, res) {
    res.json({
      status: 'ok',
      connected: !!this.hebPage,
      url: this.hebPage?.url(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle get cart request
   * @private
   */
  async _handleGetCart(req, res) {
    try {
      const result = await this._sendToHEB('getCart', {});
      res.json({ success: true, cart: result });
    } catch (error) {
      log.error('Get cart failed', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Handle add to cart request
   * @private
   */
  async _handleAddToCart(req, res) {
    try {
      // Validate request body
      validateRequired(req.body, ['items'], 'request.body');
      validateArray(req.body.items, validateHEBCartItem, 'items');
      
      const { items } = req.body;
      const results = [];

      log.info(`Adding ${items.length} items to cart`);

      for (const item of items) {
        log.info(`Adding: ${item.name || item.searchTerm}`);
        
        const result = await withRetry(
          () => this._sendToHEB('addToCart', {
            searchTerm: item.searchTerm || item.name,
            quantity: item.quantity || 1
          }),
          {
            maxRetries: CONFIG.retry.maxRetries,
            delay: CONFIG.retry.delay,
            backoff: CONFIG.retry.backoff,
            onRetry: ({ attempt, maxRetries, error }) => {
              log.warn(`Retry ${attempt}/${maxRetries} for ${item.name}`, { 
                error: error.message 
              });
            }
          }
        );
        
        results.push({
          item: item.name || item.searchTerm,
          success: result.success,
          result
        });

        // Rate limiting between items
        await sleep(CONFIG.rateLimit.addItemDelay);
      }

      res.json({ 
        success: true, 
        added: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      });
      
    } catch (error) {
      log.error('Add to cart failed', error);
      
      if (error instanceof ValidationError || error instanceof ValidationErrors) {
        res.status(400).json({
          success: false,
          error: error.message,
          validationErrors: error instanceof ValidationErrors ? error.messages : undefined
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Handle sync request
   * @private
   */
  async _handleSync(req, res) {
    try {
      validateRequired(req.body, ['items'], 'request.body');
      validateArray(req.body.items, validateHEBCartItem, 'items');
      
      const { items, clearFirst = false } = req.body;

      log.info(`Syncing ${items.length} items`, { clearFirst });

      // Optional: clear cart first
      if (clearFirst) {
        log.info('Clearing cart first...');
        await this._sendToHEB('clearCart', {});
        await sleep(1000);
      }

      // Add each item
      const results = [];
      for (const item of items) {
        log.info(`➕ Adding: ${item.name || item.searchTerm}`);

        try {
          const result = await this._sendToHEB('addToCart', {
            searchTerm: item.searchTerm || item.name,
            quantity: item.quantity || 1
          });

          results.push({
            item: item.name || item.searchTerm,
            success: result.success,
            result
          });
        } catch (error) {
          log.error(`Failed to add ${item.name}`, error);
          results.push({
            item: item.name || item.searchTerm,
            success: false,
            error: error.message
          });
        }

        // Rate limiting between items
        await sleep(CONFIG.rateLimit.addItemDelay);
      }

      // Get final cart state
      const cart = await this._sendToHEB('getCart', {});

      res.json({
        success: true,
        added: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results,
        cart
      });
      
    } catch (error) {
      log.error('Sync failed', error);
      
      if (error instanceof ValidationError || error instanceof ValidationErrors) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Handle clear cart request
   * @private
   */
  async _handleClearCart(req, res) {
    try {
      await this._sendToHEB('clearCart', {});
      res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
      log.error('Clear cart failed', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Handle get page info request
   * @private
   */
  async _handleGetPage(req, res) {
    try {
      const info = await this._sendToHEB('getPageInfo', {});
      res.json({ success: true, page: info });
    } catch (error) {
      log.error('Get page info failed', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Handle generic command
   * @private
   */
  async _handleCommand(req, res) {
    try {
      validateRequired(req.body, ['command'], 'request.body');
      
      const { command, payload = {} } = req.body;
      
      log.info(`Executing command: ${command}`);
      
      const result = await this._sendToHEB(command, payload);
      res.json({ success: true, result });
      
    } catch (error) {
      log.error('Command failed', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Start the bridge
   * @returns {Promise<void>}
   */
  async start() {
    log.section('STARTING HEB BRIDGE');
    log.info('Connecting to browser...');

    try {
      // Connect to existing browser
      this.browser = await puppeteer.connect({
        browserURL: this.options.cdpUrl,
        defaultViewport: null
      });

      log.success('Connected to browser');

      // Find or create HEB tab
      await this._findOrCreateHEBTab();

      // Inject API if not present
      await this._ensureAPIInitialized();

      // Start API server
      this.server = this.app.listen(this.options.port, () => {
        log.section('HEB BRIDGE API RUNNING');
        log.info(`Server: http://localhost:${this.options.port}`);
        log.info('');
        log.info('Available endpoints:');
        log.info(`  GET  http://localhost:${this.options.port}/health`);
        log.info(`  GET  http://localhost:${this.options.port}/api/cart`);
        log.info(`  GET  http://localhost:${this.options.port}/api/page`);
        log.info(`  POST http://localhost:${this.options.port}/api/cart/add`);
        log.info(`  POST http://localhost:${this.options.port}/api/cart/sync`);
        log.info(`  POST http://localhost:${this.options.port}/api/cart/clear`);
        log.info(`  POST http://localhost:${this.options.port}/api/command`);
      });

    } catch (error) {
      log.error('Failed to start bridge', error);
      log.info('');
      log.info('Make sure Edge is running with remote debugging:');
      log.info('  start msedge --remote-debugging-port=9222');
      throw error;
    }
  }

  /**
   * Find existing HEB tab or create new one
   * @private
   */
  async _findOrCreateHEBTab() {
    const pages = await this.browser.pages();

    // Look for existing HEB tab
    this.hebPage = pages.find(p => {
      const url = p.url();
      return url.includes('heb.com');
    });

    if (this.hebPage) {
      log.info('Found existing HEB tab');
      await this.hebPage.bringToFront();
    } else {
      log.info('Creating new HEB tab...');
      this.hebPage = await this.browser.newPage();
      await this.hebPage.goto(CONFIG.hebUrl, { waitUntil: 'networkidle2' });
    }
  }

  /**
   * Ensure HEB Cart API is initialized
   * @private
   */
  async _ensureAPIInitialized() {
    log.info('Checking API initialization...');

    try {
      // Check if API is already loaded
      const hasAPI = await this.hebPage.evaluate(() => {
        return typeof window.hebCartAPI !== 'undefined';
      });

      if (!hasAPI) {
        log.info('Injecting HEB Cart API...');

        // Read and inject the content script
        const apiScript = fs.readFileSync(
          path.join(__dirname, 'content-script-api.js'),
          'utf8'
        );

        await this.hebPage.evaluateOnNewDocument(apiScript);

        // Reload to apply
        await this.hebPage.reload({ waitUntil: 'networkidle2' });

        // Wait for API to initialize
        await this.hebPage.waitForFunction(() => {
          return typeof window.hebCartAPI !== 'undefined';
        }, { timeout: 10000 });

        log.success('API injected and ready');
      } else {
        log.success('API already initialized');
      }

    } catch (error) {
      log.warn('Could not verify API', { error: error.message });
    }
  }

  /**
   * Send command to HEB page
   * @private
   * @param {string} command - Command name
   * @param {Object} payload - Command payload
   * @returns {Promise<any>} Command result
   */
  async _sendToHEB(command, payload) {
    if (!this.hebPage) {
      throw new Error('No HEB page connected');
    }

    return await this.hebPage.evaluate(async (cmd, data) => {
      if (!window.hebCartAPI) {
        throw new Error('HEB Cart API not initialized');
      }

      return await window.hebCartAPI.executeCommand(cmd, data);
    }, command, payload);
  }

  /**
   * Stop the bridge
   * @returns {Promise<void>}
   */
  async stop() {
    log.info('Shutting down...');
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.browser) {
      await this.browser.disconnect();
    }
    
    log.success('Bridge stopped');
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const bridge = new HEBBridge();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await bridge.stop();
    process.exit(0);
  });

  try {
    await bridge.start();
  } catch (error) {
    log.error('Failed to start', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { HEBBridge };
