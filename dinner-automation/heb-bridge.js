// HEB Bridge - Node.js script to control HEB via extension API
// Connects to Chrome/Edge via CDP and communicates with content script
// Run: node heb-bridge.js

const puppeteer = require('puppeteer-core');
const express = require('express');

const CONFIG = {
  // Edge debug port
  cdpUrl: 'http://localhost:9222',
  // API server port
  apiPort: 8765,
  // HEB base URL
  hebUrl: 'https://www.heb.com'
};

class HEBBridge {
  constructor() {
    this.browser = null;
    this.hebPage = null;
    this.app = express();
    this.setupRoutes();
  }
  
  setupRoutes() {
    this.app.use(express.json());
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connected: !!this.hebPage,
        url: this.hebPage?.url() 
      });
    });
    
    // Send command to HEB page
    this.app.post('/api/command', this.handleCommand.bind(this));
    
    // Get cart
    this.app.get('/api/cart', async (req, res) => {
      try {
        const result = await this.sendToHEB('getCart', {});
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Add items
    this.app.post('/api/cart/add', async (req, res) => {
      try {
        const { items } = req.body;
        const results = [];
        
        for (const item of items) {
          console.log(`Adding: ${item.name || item.searchTerm}`);
          const result = await this.sendToHEB('addToCart', {
            searchTerm: item.searchTerm || item.name,
            quantity: item.quantity || 1
          });
          results.push(result);
          
          // Rate limiting
          await this.sleep(2000);
        }
        
        res.json({ success: true, results });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Sync meal plan
    this.app.post('/api/cart/sync', this.handleSync.bind(this));
    
    // Get page info
    this.app.get('/api/page', async (req, res) => {
      try {
        const info = await this.sendToHEB('getPageInfo', {});
        res.json(info);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  async start() {
    console.log('🔌 Connecting to browser...');
    
    try {
      // Connect to existing browser
      this.browser = await puppeteer.connect({
        browserURL: CONFIG.cdpUrl,
        defaultViewport: null
      });
      
      console.log('✅ Connected to browser');
      
      // Find or create HEB tab
      await this.findOrCreateHEBTab();
      
      // Inject API if not present
      await this.ensureAPIInitialized();
      
      // Start API server
      this.app.listen(CONFIG.apiPort, () => {
        console.log(`🚀 HEB Bridge API running on http://localhost:${CONFIG.apiPort}`);
        console.log('');
        console.log('Available endpoints:');
        console.log(`  GET  http://localhost:${CONFIG.apiPort}/health`);
        console.log(`  GET  http://localhost:${CONFIG.apiPort}/api/cart`);
        console.log(`  GET  http://localhost:${CONFIG.apiPort}/api/page`);
        console.log(`  POST http://localhost:${CONFIG.apiPort}/api/cart/add`);
        console.log(`  POST http://localhost:${CONFIG.apiPort}/api/cart/sync`);
        console.log(`  POST http://localhost:${CONFIG.apiPort}/api/command`);
        console.log('');
        console.log('Example:');
        console.log(`  curl -X POST http://localhost:${CONFIG.apiPort}/api/cart/add \\\\`);
        console.log(`    -H "Content-Type: application/json" \\\\`);
        console.log(`    -d '{"items": [{"searchTerm": "milk", "quantity": 1}]}'`);
      });
      
    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      console.log('');
      console.log('Make sure Edge is running with remote debugging:');
      console.log('  start msedge --remote-debugging-port=9222');
      process.exit(1);
    }
  }
  
  async findOrCreateHEBTab() {
    const pages = await this.browser.pages();
    
    // Look for existing HEB tab
    this.hebPage = pages.find(p => {
      const url = p.url();
      return url.includes('heb.com');
    });
    
    if (this.hebPage) {
      console.log('📄 Found existing HEB tab');
      await this.hebPage.bringToFront();
    } else {
      console.log('📄 Creating new HEB tab...');
      this.hebPage = await this.browser.newPage();
      await this.hebPage.goto(CONFIG.hebUrl, { waitUntil: 'networkidle2' });
    }
  }
  
  async ensureAPIInitialized() {
    console.log('🔧 Checking API initialization...');
    
    try {
      // Check if API is already loaded
      const hasAPI = await this.hebPage.evaluate(() => {
        return typeof window.hebCartAPI !== 'undefined';
      });
      
      if (!hasAPI) {
        console.log('📥 Injecting HEB Cart API...');
        
        // Read and inject the content script
        const fs = require('fs');
        const path = require('path');
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
        
        console.log('✅ API injected and ready');
      } else {
        console.log('✅ API already initialized');
      }
      
    } catch (error) {
      console.warn('⚠️ Could not verify API:', error.message);
    }
  }
  
  async sendToHEB(command, payload) {
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
  
  async handleCommand(req, res) {
    try {
      const { command, payload } = req.body;
      const result = await this.sendToHEB(command, payload);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  async handleSync(req, res) {
    try {
      const { items, clearFirst = false } = req.body;
      
      // Optional: clear cart first
      if (clearFirst) {
        console.log('🧹 Clearing cart first...');
        await this.sendToHEB('clearCart', {});
      }
      
      // Add each item
      const results = [];
      for (const item of items) {
        console.log(`➕ Adding: ${item.name || item.searchTerm}`);
        
        try {
          const result = await this.sendToHEB('addToCart', {
            searchTerm: item.searchTerm || item.name,
            quantity: item.quantity || 1
          });
          
          results.push({ 
            item: item.name || item.searchTerm, 
            success: result.success,
            result 
          });
        } catch (error) {
          results.push({ 
            item: item.name || item.searchTerm, 
            success: false, 
            error: error.message 
          });
        }
        
        // Rate limiting between items
        await this.sleep(2000);
      }
      
      // Get final cart state
      const cart = await this.sendToHEB('getCart', {});
      
      res.json({
        success: true,
        added: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results,
        cart
      });
      
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

// Start the bridge
const bridge = new HEBBridge();
bridge.start().catch(console.error);
