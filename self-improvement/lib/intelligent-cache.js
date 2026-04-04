/**
 * Intelligent Cache Module
 * Smart caching with TTL, LRU eviction, and cache warming
 * 
 * @module lib/intelligent-cache
 * @version 1.0.0
 */

const EventEmitter = require('events');

// Default configuration
const DEFAULT_CONFIG = {
  maxSize: 1000,           // Maximum number of items
  defaultTTL: 3600000,     // 1 hour in milliseconds
  checkPeriod: 600000,     // Cleanup check every 10 minutes
  refreshBeforeExpiry: 0.1 // Refresh when 10% of TTL remains
};

/**
 * LRU Cache with TTL support
 */
class IntelligentCache extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.accessOrder = []; // For LRU tracking
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      refreshes: 0
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.checkPeriod);
  }
  
  /**
   * Generate cache key
   */
  generateKey(namespace, identifier) {
    return `${namespace}:${JSON.stringify(identifier)}`;
  }
  
  /**
   * Set value in cache
   */
  set(key, value, options = {}) {
    const ttl = options.ttl || this.config.defaultTTL;
    const now = Date.now();
    
    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const entry = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      ttl,
      accessCount: 0,
      lastAccessed: now
    };
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    
    this.emit('set', { key, ttl });
    
    return true;
  }
  
  /**
   * Get value from cache
   */
  get(key, options = {}) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.emit('miss', { key });
      return undefined;
    }
    
    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.emit('expired', { key });
      return undefined;
    }
    
    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateAccessOrder(key);
    
    // Check if we should refresh
    const timeRemaining = entry.expiresAt - now;
    const refreshThreshold = entry.ttl * this.config.refreshBeforeExpiry;
    
    if (timeRemaining < refreshThreshold && options.refreshFn) {
      this.refresh(key, options.refreshFn);
    }
    
    this.stats.hits++;
    this.emit('hit', { key, accessCount: entry.accessCount });
    
    return entry.value;
  }
  
  /**
   * Get or compute value
   */
  async getOrCompute(key, computeFn, options = {}) {
    const cached = this.get(key, options);
    if (cached !== undefined) {
      return cached;
    }
    
    try {
      const value = await computeFn();
      this.set(key, value, options);
      return value;
    } catch (error) {
      this.emit('computeError', { key, error: error.message });
      throw error;
    }
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete key from cache
   */
  delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    
    if (existed) {
      this.emit('delete', { key });
    }
    
    return existed;
  }
  
  /**
   * Refresh value before expiry
   */
  async refresh(key, refreshFn) {
    try {
      const newValue = await refreshFn();
      const entry = this.cache.get(key);
      
      if (entry) {
        entry.value = newValue;
        entry.createdAt = Date.now();
        entry.expiresAt = entry.createdAt + entry.ttl;
        this.stats.refreshes++;
        this.emit('refresh', { key });
      }
    } catch (error) {
      this.emit('refreshError', { key, error: error.message });
    }
  }
  
  /**
   * Evict least recently used item
   */
  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.stats.evictions++;
    
    this.emit('evict', { key: lruKey });
  }
  
  /**
   * Update access order for LRU tracking
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
  
  /**
   * Remove from access order
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.emit('cleanup', { removed: cleaned });
    }
    
    return cleaned;
  }
  
  /**
   * Warm cache with data
   */
  async warm(keys, fetchFn, options = {}) {
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        try {
          const value = await fetchFn(key);
          this.set(key, value, options);
          return { key, success: true };
        } catch (error) {
          return { key, success: false, error: error.message };
        }
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    this.emit('warm', { total: keys.length, successful });
    
    return {
      total: keys.length,
      successful,
      failed: keys.length - successful
    };
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      utilization: (this.cache.size / this.config.maxSize * 100).toFixed(2) + '%',
      hitRate: hitRate + '%',
      ...this.stats
    };
  }
  
  /**
   * Clear all entries
   */
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.emit('clear', { count });
    return count;
  }
  
  /**
   * Get all keys (non-expired only)
   */
  keys() {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.expiresAt > now)
      .map(([key, _]) => key);
  }
  
  /**
   * Destroy cache and cleanup
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
    this.removeAllListeners();
  }
}

// Predefined TTL values for common use cases
const TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 60 * 60 * 1000,    // 1 hour
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  SESSION: 23 * 60 * 60 * 1000 // 23 hours (refresh before expiry)
};

// Create singleton instance
const defaultCache = new IntelligentCache();

module.exports = {
  IntelligentCache,
  TTL,
  get: (key, options) => defaultCache.get(key, options),
  set: (key, value, options) => defaultCache.set(key, value, options),
  getOrCompute: (key, computeFn, options) => defaultCache.getOrCompute(key, computeFn, options),
  has: (key) => defaultCache.has(key),
  delete: (key) => defaultCache.delete(key),
  clear: () => defaultCache.clear(),
  getStats: () => defaultCache.getStats(),
  warm: (keys, fetchFn, options) => defaultCache.warm(keys, fetchFn, options),
  create: (config) => new IntelligentCache(config)
};
