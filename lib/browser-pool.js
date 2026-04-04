/**
 * Browser Pool Manager
 * Manages CDP connections with connection pooling, health checks, and automatic recovery
 */

const { chromium } = require('playwright');
const EventEmitter = require('events');
const { applyStealthPatches } = require('./anti-bot-advanced');

class BrowserPool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.debugPort = options.debugPort || 9222;
    this.maxConnections = options.maxConnections || 3;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    
    this.connections = new Map();
    this.available = [];
    this.waiting = [];
    this.isShuttingDown = false;
    
    this.startHealthChecks();
  }
  
  /**
   * Get or create a browser connection
   */
  async acquire(site = 'default') {
    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down');
    }
    
    // Check for existing available connection
    const existing = this.available.find(c => c.site === site || c.site === 'default');
    if (existing) {
      this.available = this.available.filter(c => c !== existing);
      existing.inUse = true;
      existing.lastUsed = Date.now();
      return existing.browser;
    }
    
    // Create new connection if under limit
    if (this.connections.size < this.maxConnections) {
      const conn = await this.createConnection(site);
      conn.inUse = true;
      this.connections.set(conn.id, conn);
      return conn.browser;
    }
    
    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiting = this.waiting.filter(w => w !== waiter);
        reject(new Error('Timeout waiting for browser connection'));
      }, this.connectionTimeout);
      
      const waiter = { resolve, reject, timeout, site };
      this.waiting.push(waiter);
    });
  }
  
  /**
   * Release a browser connection back to pool
   */
  release(browser) {
    const conn = Array.from(this.connections.values()).find(c => c.browser === browser);
    if (!conn) return;
    
    conn.inUse = false;
    conn.lastUsed = Date.now();
    this.available.push(conn);
    
    // Process waiting requests
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift();
      clearTimeout(waiter.timeout);
      
      const nextConn = this.available.find(c => 
        waiter.site === 'default' || c.site === waiter.site
      );
      
      if (nextConn) {
        this.available = this.available.filter(c => c !== nextConn);
        nextConn.inUse = true;
        waiter.resolve(nextConn.browser);
      } else {
        this.waiting.push(waiter); // Put back if no suitable connection
      }
    }
  }
  
  /**
   * Create new CDP connection
   */
  async createConnection(site) {
    const id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${this.debugPort}`);
      
      // Apply stealth patches to all pages
      const context = browser.contexts()[0];
      if (context) {
        context.on('page', async page => {
          await applyStealthPatches(page);
        });
        
        // Apply to existing pages
        for (const page of context.pages()) {
          await applyStealthPatches(page);
        }
      }
      
      const conn = {
        id,
        browser,
        site,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: true,
        healthChecks: 0,
        failedChecks: 0
      };
      
      browser.on('disconnected', () => {
        this.connections.delete(id);
        this.available = this.available.filter(c => c.id !== id);
        this.emit('disconnected', { id, site });
      });
      
      this.emit('connected', { id, site });
      return conn;
      
    } catch (error) {
      this.emit('error', { id, site, error });
      throw error;
    }
  }
  
  /**
   * Health check all connections
   */
  async healthCheck() {
    for (const [id, conn] of this.connections) {
      if (conn.inUse) continue;
      
      try {
        const context = conn.browser.contexts()[0];
        if (!context) {
          throw new Error('No context available');
        }
        
        // Simple health check - create and close a page
        const testPage = await context.newPage();
        await testPage.evaluate(() => navigator.userAgent);
        await testPage.close();
        
        conn.healthChecks++;
        conn.failedChecks = 0;
        
      } catch (error) {
        conn.failedChecks++;
        
        if (conn.failedChecks >= 3) {
          console.log(`💀 Removing unhealthy connection ${id}`);
          await this.removeConnection(id);
        }
      }
    }
  }
  
  /**
   * Remove a connection
   */
  async removeConnection(id) {
    const conn = this.connections.get(id);
    if (!conn) return;
    
    try {
      await conn.browser.close();
    } catch (e) {}
    
    this.connections.delete(id);
    this.available = this.available.filter(c => c.id !== id);
  }
  
  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck().catch(console.error);
    }, this.healthCheckInterval);
  }
  
  /**
   * Get pool statistics
   */
  getStats() {
    return {
      total: this.connections.size,
      available: this.available.length,
      inUse: this.connections.size - this.available.length,
      waiting: this.waiting.length,
      connections: Array.from(this.connections.values()).map(c => ({
        id: c.id,
        site: c.site,
        inUse: c.inUse,
        age: Date.now() - c.createdAt,
        healthChecks: c.healthChecks,
        failedChecks: c.failedChecks
      }))
    };
  }
  
  /**
   * Shutdown all connections
   */
  async shutdown() {
    this.isShuttingDown = true;
    clearInterval(this.healthCheckTimer);
    
    // Reject waiting requests
    for (const waiter of this.waiting) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Pool is shutting down'));
    }
    this.waiting = [];
    
    // Close all connections
    for (const [id, conn] of this.connections) {
      try {
        await conn.browser.close();
      } catch (e) {}
    }
    
    this.connections.clear();
    this.available = [];
  }
}

// Singleton instance
let pool = null;

function getPool(options) {
  if (!pool) {
    pool = new BrowserPool(options);
  }
  return pool;
}

async function shutdownPool() {
  if (pool) {
    await pool.shutdown();
    pool = null;
  }
}

module.exports = {
  BrowserPool,
  getPool,
  shutdownPool
};
