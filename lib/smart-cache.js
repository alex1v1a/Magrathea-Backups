/**
 * @fileoverview Smart Cache - Multi-tier caching with TTL and persistence
 * 
 * Features:
 * - In-memory LRU cache
   - TTL support per item
   - Persistent disk cache for surviving restarts
   - Cache warming capability
   - Statistics and monitoring
 * 
 * @module lib/smart-cache
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SmartCache {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour
    this.persistPath = options.persistPath || null;
    
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      persistLoads: 0,
      persistSaves: 0
    };
    
    this.timers = new Map();
    
    // Load persisted cache if available
    if (this.persistPath) {
      this.loadPersisted();
    }
  }

  /**
   * Get item from cache
   * 
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    
    // Check TTL
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }
    
    // Update access order (LRU)
    this.updateAccessOrder(key);
    this.stats.hits++;
    
    return entry.value;
  }

  /**
   * Set item in cache
   * 
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   * @param {number} options.ttl - Time to live in ms
   * @param {boolean} options.persist - Whether to persist this item
   */
  set(key, value, options = {}) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const ttl = options.ttl || this.defaultTTL;
    const entry = {
      value,
      created: Date.now(),
      expires: ttl > 0 ? Date.now() + ttl : null,
      persist: options.persist || false,
      accessCount: 0
    };
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.stats.sets++;
    
    // Set expiration timer
    if (entry.expires) {
      this.clearTimer(key);
      this.timers.set(key, setTimeout(() => this.delete(key), ttl));
    }
    
    // Persist if requested
    if (options.persist && this.persistPath) {
      this.persist();
    }
  }

  /**
   * Get or compute value
   * 
   * @param {string} key - Cache key
   * @param {Function} factory - Async function to compute value if not cached
   * @param {Object} options - Cache options
   * @returns {Promise<*>} Cached or computed value
   */
  async getOrCompute(key, factory, options = {}) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Delete item from cache
   * 
   * @param {string} key - Cache key
   * @returns {boolean} Whether item was deleted
   */
  delete(key) {
    const existed = this.cache.delete(key);
    
    if (existed) {
      this.clearTimer(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats.deletes++;
    }
    
    return existed;
  }

  /**
   * Check if key exists and is not expired
   * 
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all items
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      utilization: `${(this.cache.size / this.maxSize * 100).toFixed(2)}%`
    };
  }

  /**
   * Warm cache with multiple items
   * 
   * @param {Array<{key, value, options}>} items - Items to pre-populate
   */
  warm(items) {
    for (const { key, value, options } of items) {
      this.set(key, value, options);
    }
  }

  /**
   * Get all keys (non-expired only)
   */
  keys() {
    return Array.from(this.cache.keys()).filter(key => this.has(key));
  }

  updateAccessOrder(key) {
    // Move to end (most recently used)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    // Update access count
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
    }
  }

  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    // Remove least recently used
    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
    this.stats.evictions++;
  }

  clearTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async loadPersisted() {
    try {
      const data = await fs.readFile(this.persistPath, 'utf8');
      const persisted = JSON.parse(data);
      
      for (const [key, entry] of Object.entries(persisted)) {
        // Only load non-expired persisted entries
        if (!entry.expires || entry.expires > Date.now()) {
          this.cache.set(key, entry);
          this.accessOrder.push(key);
          
          // Restore timer
          if (entry.expires) {
            const ttl = entry.expires - Date.now();
            if (ttl > 0) {
              this.timers.set(key, setTimeout(() => this.delete(key), ttl));
            }
          }
        }
      }
      
      this.stats.persistLoads++;
    } catch (error) {
      // File doesn't exist or is corrupted
    }
  }

  async persist() {
    if (!this.persistPath) return;
    
    const persistData = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.persist) {
        persistData[key] = entry;
      }
    }
    
    try {
      await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
      await fs.writeFile(this.persistPath, JSON.stringify(persistData, null, 2));
      this.stats.persistSaves++;
    } catch (error) {
      console.error('Failed to persist cache:', error.message);
    }
  }

  /**
   * Create a namespaced cache
   */
  namespace(prefix) {
    const parent = this;
    
    return {
      get: (key) => parent.get(`${prefix}:${key}`),
      set: (key, value, options) => parent.set(`${prefix}:${key}`, value, options),
      delete: (key) => parent.delete(`${prefix}:${key}`),
      has: (key) => parent.has(`${prefix}:${key}`),
      getOrCompute: (key, factory, options) => 
        parent.getOrCompute(`${prefix}:${key}`, factory, options)
    };
  }
}

/**
 * Memoize a function with caching
 */
function memoize(fn, options = {}) {
  const cache = new SmartCache({
    name: options.name || fn.name || 'memoized',
    maxSize: options.maxSize || 100,
    defaultTTL: options.ttl || 60000
  });
  
  const keyGenerator = options.keyGenerator || 
    ((...args) => crypto.createHash('md5').update(JSON.stringify(args)).digest('hex'));
  
  return async function(...args) {
    const key = keyGenerator(...args);
    return cache.getOrCompute(key, () => fn.apply(this, args), { ttl: options.ttl });
  };
}

module.exports = { SmartCache, memoize };
