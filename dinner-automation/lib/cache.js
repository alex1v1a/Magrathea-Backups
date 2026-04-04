/**
 * Intelligent Caching Layer
 * 
 * Provides multi-tier caching for automation data:
 * - Memory cache (fastest, volatile)
 * - File cache (persistent, JSON)
 * - TTL-based expiration
 * 
 * @module lib/cache
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');

// Default cache configuration
const CACHE_CONFIG = {
  // Default TTL in seconds
  defaultTtl: 3600, // 1 hour
  // Max memory cache entries
  maxMemoryEntries: 1000,
  // Cache directory
  cacheDir: path.join(process.cwd(), 'data', 'cache'),
  // Cleanup interval (ms)
  cleanupInterval: 300000, // 5 minutes
  // Compress values larger than this (bytes)
  compressionThreshold: 1024
};

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(key, value, ttl) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + (ttl * 1000);
    this.accessCount = 0;
    this.lastAccessed = this.createdAt;
  }

  /**
   * Check if entry is expired
   */
  isExpired() {
    return Date.now() > this.expiresAt;
  }

  /**
   * Mark as accessed
   */
  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }
}

/**
 * Multi-tier cache manager
 */
class Cache {
  constructor(options = {}) {
    this.config = { ...CACHE_CONFIG, ...options };
    this.memory = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      diskReads: 0,
      diskWrites: 0
    };
    this.cleanupTimer = null;
    this.initialized = false;
  }

  /**
   * Initialize cache (create directories)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      this.startCleanup();
      this.initialized = true;
      logger.debug('Cache initialized');
    } catch (error) {
      logger.error('Cache initialization failed:', error.message);
    }
  }

  /**
   * Generate cache key from input
   * @param {string} prefix - Key prefix
   * @param {any} data - Data to hash
   * @returns {string}
   */
  generateKey(prefix, data) {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);
    return `${prefix}_${hash}`;
  }

  /**
   * Get cache file path
   * @param {string} key
   * @returns {string}
   */
  getFilePath(key) {
    // Organize into subdirectories by first 2 chars
    const subdir = key.slice(0, 2);
    return path.join(this.config.cacheDir, subdir, `${key}.json`);
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {Promise<any>} Value or undefined
   */
  async get(key) {
    await this.initialize();

    // Check memory first
    const memEntry = this.memory.get(key);
    if (memEntry) {
      if (!memEntry.isExpired()) {
        memEntry.touch();
        this.stats.hits++;
        return memEntry.value;
      }
      // Expired, remove from memory
      this.memory.delete(key);
    }

    // Check disk cache
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      const entry = JSON.parse(data);
      
      if (entry.expiresAt > Date.now()) {
        // Restore to memory
        this.setMemory(key, entry.value, Math.floor((entry.expiresAt - Date.now()) / 1000));
        this.stats.hits++;
        this.stats.diskReads++;
        return entry.value;
      }
      
      // Expired, delete file
      await fs.unlink(filePath).catch(() => {});
    } catch {
      // File doesn't exist or is corrupt
    }

    this.stats.misses++;
    return undefined;
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttl - TTL in seconds (optional)
   */
  async set(key, value, ttl = null) {
    await this.initialize();
    
    const actualTtl = ttl || this.config.defaultTtl;
    
    // Set in memory
    this.setMemory(key, value, actualTtl);
    
    // Persist to disk
    await this.setDisk(key, value, actualTtl);
    
    this.stats.sets++;
  }

  /**
   * Set value in memory cache
   */
  setMemory(key, value, ttl) {
    // Evict oldest if at capacity
    if (this.memory.size >= this.config.maxMemoryEntries) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.memory.delete(oldestKey);
      }
    }

    this.memory.set(key, new CacheEntry(key, value, ttl));
  }

  /**
   * Set value in disk cache
   */
  async setDisk(key, value, ttl) {
    try {
      const filePath = this.getFilePath(key);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      const entry = {
        key,
        value,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl * 1000)
      };

      await fs.writeFile(filePath, JSON.stringify(entry), 'utf8');
      this.stats.diskWrites++;
    } catch (error) {
      logger.error('Cache disk write failed:', error.message);
    }
  }

  /**
   * Find oldest entry for eviction
   */
  findOldestEntry() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memory) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }

    return oldest;
  }

  /**
   * Delete value from cache
   * @param {string} key
   */
  async delete(key) {
    this.memory.delete(key);
    
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch {
      // File may not exist
    }
    
    this.stats.deletes++;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async has(key) {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Get or compute value
   * @param {string} key
   * @param {Function} factory - Async function to compute value
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<any>}
   */
  async getOrCompute(key, factory, ttl = null) {
    const cached = await this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    this.memory.clear();
    
    try {
      const files = await fs.readdir(this.config.cacheDir, { recursive: true });
      await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(f => fs.unlink(path.join(this.config.cacheDir, f)).catch(() => {}))
      );
    } catch (error) {
      logger.error('Cache clear failed:', error.message);
    }
    
    logger.info('Cache cleared');
  }

  /**
   * Start cleanup timer
   */
  startCleanup() {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory
    for (const [key, entry] of this.memory) {
      if (entry.isExpired()) {
        this.memory.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryEntries: this.memory.size,
      initialized: this.initialized
    };
  }

  /**
   * Close cache (stop cleanup timer)
   */
  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
let cacheInstance = null;

/**
 * Get or create cache instance
 * @param {Object} options
 * @returns {Cache}
 */
function getCache(options = {}) {
  if (!cacheInstance) {
    cacheInstance = new Cache(options);
  }
  return cacheInstance;
}

/**
 * Reset cache (for testing)
 */
function resetCache() {
  if (cacheInstance) {
    cacheInstance.close();
  }
  cacheInstance = null;
}

module.exports = {
  Cache,
  CacheEntry,
  CACHE_CONFIG,
  getCache,
  resetCache
};
