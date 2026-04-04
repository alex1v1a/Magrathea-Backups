/**
 * Connection Pool for CDP Browser Automation
 * 
 * Maintains a pool of persistent browser connections to reduce
 * connection overhead and improve script execution speed.
 * 
 * @module lib/connection-pool
 */

const { CDPClient } = require('./cdp-client');
const { logger } = require('./logger');

// Pool configuration
const POOL_CONFIG = {
  // Maximum connections in pool
  maxConnections: 3,
  // Minimum connections to maintain
  minConnections: 1,
  // Connection timeout (ms)
  connectionTimeout: 30000,
  // Idle timeout before closing (ms)
  idleTimeout: 300000, // 5 minutes
  // Health check interval (ms)
  healthCheckInterval: 30000,
  // Maximum concurrent operations per connection
  maxConcurrentOps: 5
};

/**
 * Pooled connection wrapper
 */
class PooledConnection {
  constructor(id, client) {
    this.id = id;
    this.client = client;
    this.inUse = false;
    this.lastUsed = Date.now();
    this.operations = 0;
    this.createdAt = Date.now();
  }

  /**
   * Mark connection as in use
   */
  acquire() {
    this.inUse = true;
    this.lastUsed = Date.now();
    this.operations++;
  }

  /**
   * Release connection back to pool
   */
  release() {
    this.inUse = false;
    this.lastUsed = Date.now();
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy() {
    try {
      return await this.client.ping();
    } catch {
      return false;
    }
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      id: this.id,
      inUse: this.inUse,
      operations: this.operations,
      age: Date.now() - this.createdAt,
      idleTime: this.inUse ? 0 : Date.now() - this.lastUsed
    };
  }
}

/**
 * CDP Connection Pool Manager
 */
class ConnectionPool {
  constructor(options = {}) {
    this.config = { ...POOL_CONFIG, ...options };
    this.connections = [];
    this.waitQueue = [];
    this.debugPort = options.debugPort || 9222;
    this.healthCheckTimer = null;
    this.nextId = 1;
  }

  /**
   * Initialize the pool with minimum connections
   */
  async initialize() {
    logger.info(`Initializing connection pool (min: ${this.config.minConnections})`);
    
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }
    
    this.startHealthChecks();
  }

  /**
   * Create a new pooled connection
   */
  async createConnection() {
    try {
      const client = new CDPClient({ debugPort: this.debugPort });
      await client.connect();
      
      const connection = new PooledConnection(this.nextId++, client);
      this.connections.push(connection);
      
      logger.debug(`Created connection ${connection.id}`);
      return connection;
      
    } catch (error) {
      logger.error('Failed to create connection:', error.message);
      throw error;
    }
  }

  /**
   * Acquire a connection from the pool
   * @returns {Promise<PooledConnection>}
   */
  async acquire() {
    // Try to find available connection
    const available = this.connections.find(c => !c.inUse && c.operations < this.config.maxConcurrentOps);
    
    if (available) {
      available.acquire();
      logger.debug(`Acquired connection ${available.id}`);
      return available;
    }

    // Create new connection if under max
    if (this.connections.length < this.config.maxConnections) {
      const connection = await this.createConnection();
      connection.acquire();
      return connection;
    }

    // Wait for connection to become available
    logger.debug('Waiting for available connection...');
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.findIndex(item => item.resolve === resolve);
        if (index > -1) this.waitQueue.splice(index, 1);
        reject(new Error('Connection pool timeout'));
      }, this.config.connectionTimeout);

      this.waitQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          connection.acquire();
          resolve(connection);
        },
        reject
      });
    });
  }

  /**
   * Release a connection back to the pool
   * @param {PooledConnection} connection
   */
  release(connection) {
    connection.release();
    logger.debug(`Released connection ${connection.id}`);

    // Check wait queue
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift();
      waiter.resolve(connection);
    }
  }

  /**
   * Execute function with pooled connection
   * @param {Function} fn - Function to execute
   * @returns {Promise<any>}
   */
  async withConnection(fn) {
    const connection = await this.acquire();
    
    try {
      const { page, context, browser } = connection.client.getConnection();
      return await fn(page, context, browser, connection);
    } finally {
      this.release(connection);
    }
  }

  /**
   * Start health check interval
   */
  startHealthChecks() {
    if (this.healthCheckTimer) return;
    
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  async performHealthCheck() {
    const now = Date.now();
    
    for (let i = this.connections.length - 1; i >= 0; i--) {
      const conn = this.connections[i];
      
      // Close idle connections above minimum
      if (!conn.inUse && 
          this.connections.length > this.config.minConnections &&
          now - conn.lastUsed > this.config.idleTimeout) {
        logger.debug(`Closing idle connection ${conn.id}`);
        await conn.client.disconnect();
        this.connections.splice(i, 1);
        continue;
      }
      
      // Check health of idle connections
      if (!conn.inUse) {
        const healthy = await conn.isHealthy();
        if (!healthy) {
          logger.warn(`Connection ${conn.id} unhealthy, removing`);
          await conn.client.disconnect().catch(() => {});
          this.connections.splice(i, 1);
        }
      }
    }

    // Ensure minimum connections
    while (this.connections.length < this.config.minConnections) {
      try {
        await this.createConnection();
      } catch (error) {
        logger.error('Failed to create replacement connection:', error.message);
        break;
      }
    }
  }

  /**
   * Get pool statistics
   * @returns {Object}
   */
  getStats() {
    return {
      total: this.connections.length,
      inUse: this.connections.filter(c => c.inUse).length,
      available: this.connections.filter(c => !c.inUse).length,
      waiting: this.waitQueue.length,
      connections: this.connections.map(c => c.getStats())
    };
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Reject all waiting promises
    while (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift();
      waiter.reject(new Error('Pool closing'));
    }

    // Close all connections
    await Promise.all(
      this.connections.map(conn => 
        conn.client.disconnect().catch(() => {})
      )
    );
    
    this.connections = [];
    logger.info('Connection pool closed');
  }
}

// Singleton instance
let poolInstance = null;

/**
 * Get or create connection pool
 * @param {Object} options
 * @returns {ConnectionPool}
 */
function getConnectionPool(options = {}) {
  if (!poolInstance) {
    poolInstance = new ConnectionPool(options);
  }
  return poolInstance;
}

/**
 * Reset connection pool (for testing)
 */
function resetConnectionPool() {
  poolInstance = null;
}

module.exports = {
  ConnectionPool,
  PooledConnection,
  POOL_CONFIG,
  getConnectionPool,
  resetConnectionPool
};
