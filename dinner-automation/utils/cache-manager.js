/**
 * Cache Manager
 * Multi-tier caching with file and memory backends
 * 
 * Features:
 * - In-memory cache with TTL
 * - Persistent file-based cache
 * - Cache invalidation strategies
 * - Size-based eviction (LRU)
 * - Compression for large values
 * 
 * @module utils/cache-manager
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class CacheManager {
  /**
   * Create cache manager
   * @param {Object} options
   * @param {string} options.cacheDir - Directory for file cache
   * @param {number} options.defaultTTL - Default TTL in ms (default: 3600000 = 1 hour)
   * @param {number} options.maxMemoryItems - Max items in memory cache (default: 100)
   * @param {number} options.maxFileCacheMB - Max file cache size in MB (default: 100)
   * @param {boolean} options.compression - Compress values > 1KB (default: true)
   */
  constructor(options = {}) {
    this.config = {
      cacheDir: options.cacheDir || path.join(process.cwd(), '.cache'),
      defaultTTL: options.defaultTTL || 3600000,
      maxMemoryItems: options.maxMemoryItems || 100,
      maxFileCacheMB: options.maxFileCacheMB || 100,
      compression: options.compression !== false
    };

    // Memory cache: Map<key, {value, expires, size, lastAccess}>
    this.memoryCache = new Map();
    this.accessOrder = []; // LRU tracking
    
    this.stats = {
      hits: 0,
      misses: 0,
      memoryEvictions: 0,
      fileEvictions: 0,
      writes: 0
    };

    this._cleanupInterval = null;
    this._ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   * @private
   */
  async _ensureCacheDir() {
    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
    } catch (e) {
      // Directory may already exist
    }
  }

  /**
   * Generate cache key
   * @private
   */
  _generateKey(key) {
    if (typeof key === 'string') return key;
    return JSON.stringify(key);
  }

  /**
   * Generate file path for key
   * @private
   */
  _getFilePath(key) {
    const safeKey = Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
    return path.join(this.config.cacheDir, `${safeKey}.cache`);
  }

  /**
   * Check if memory cache entry is expired
   * @private
   */
  _isExpired(entry) {
    return entry.expires && Date.now() > entry.expires;
  }

  /**
   * Update LRU order
   * @private
   */
  _touch(key) {
    const idx = this.accessOrder.indexOf(key);
    if (idx > -1) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict oldest items from memory cache
   * @private
   */
  _evictIfNeeded() {
    while (this.memoryCache.size >= this.config.maxMemoryItems && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.memoryCache.delete(oldestKey);
      this.stats.memoryEvictions++;
    }
  }

  /**
   * Start cleanup interval
   * @param {number} intervalMs - Cleanup interval (default: 60000)
   */
  startCleanup(intervalMs = 60000) {
    this._cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @param {Object} options
   * @param {boolean} options.checkFile - Check file cache on miss (default: true)
   * @returns {Promise<*>} Cached value or undefined
   */
  async get(key, options = {}) {
    const cacheKey = this._generateKey(key);
    const checkFile = options.checkFile !== false;

    // Check memory cache first
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry) {
      if (!this._isExpired(memEntry)) {
        this._touch(cacheKey);
        this.stats.hits++;
        return memEntry.value;
      }
      // Expired - remove from memory
      this.memoryCache.delete(cacheKey);
    }

    if (!checkFile) {
      this.stats.misses++;
      return undefined;
    }

    // Check file cache
    try {
      const filePath = this._getFilePath(cacheKey);
      const data = await fs.readFile(filePath);
      
      let parsed;
      const isCompressed = data[0] === 0x1f && data[1] === 0x8b; // gzip magic bytes
      
      if (isCompressed) {
        const decompressed = await gunzip(data);
        parsed = JSON.parse(decompressed.toString());
      } else {
        parsed = JSON.parse(data.toString());
      }

      if (parsed.expires && Date.now() > parsed.expires) {
        // Expired - delete file
        await fs.unlink(filePath).catch(() => {});
        this.stats.misses++;
        return undefined;
      }

      // Promote to memory cache
      this._evictIfNeeded();
      this.memoryCache.set(cacheKey, {
        value: parsed.value,
        expires: parsed.expires,
        size: JSON.stringify(parsed.value).length
      });
      this._touch(cacheKey);
      this.stats.hits++;

      return parsed.value;

    } catch (e) {
      // File doesn't exist or is corrupt
      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options
   * @param {number} options.ttl - Time-to-live in ms
   * @param {boolean} options.memoryOnly - Don't persist to file
   * @param {boolean} options.compressed - Compress the value
   */
  async set(key, value, options = {}) {
    const cacheKey = this._generateKey(key);
    const ttl = options.ttl || this.config.defaultTTL;
    const expires = ttl > 0 ? Date.now() + ttl : null;
    const memoryOnly = options.memoryOnly || false;

    // Store in memory
    this._evictIfNeeded();
    const serialized = JSON.stringify(value);
    
    this.memoryCache.set(cacheKey, {
      value,
      expires,
      size: serialized.length
    });
    this._touch(cacheKey);

    // Store in file (unless memoryOnly)
    if (!memoryOnly) {
      try {
        const filePath = this._getFilePath(cacheKey);
        const data = { value, expires };
        let serializedData = JSON.stringify(data);

        // Compress if enabled and data is large
        const shouldCompress = this.config.compression && serializedData.length > 1024;
        
        if (shouldCompress) {
          serializedData = await gzip(serializedData);
        }

        await fs.writeFile(filePath, serializedData);
        this.stats.writes++;
      } catch (e) {
        // Failed to write file - log but don't fail
        console.warn('Cache write failed:', e.message);
      }
    }
  }

  /**
   * Get or compute value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} factory - Async function to compute value
   * @param {Object} options - Cache options
   * @returns {Promise<*>}
   */
  async getOrCompute(key, factory, options = {}) {
    const cached = await this.get(key, options);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    const cacheKey = this._generateKey(key);
    
    this.memoryCache.delete(cacheKey);
    
    const idx = this.accessOrder.indexOf(cacheKey);
    if (idx > -1) this.accessOrder.splice(idx, 1);

    try {
      const filePath = this._getFilePath(cacheKey);
      await fs.unlink(filePath);
    } catch (e) {
      // File may not exist
    }
  }

  /**
   * Check if key exists in cache (and not expired)
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async has(key) {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Clean up expired entries
   */
  async cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (this._isExpired(entry)) {
        this.memoryCache.delete(key);
        const idx = this.accessOrder.indexOf(key);
        if (idx > -1) this.accessOrder.splice(idx, 1);
        cleaned++;
      }
    }

    // Clean file cache
    try {
      const files = await fs.readdir(this.config.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.cache')) continue;
        
        try {
          const filePath = path.join(this.config.cacheDir, file);
          const data = await fs.readFile(filePath);
          let parsed;
          
          const isCompressed = data[0] === 0x1f && data[1] === 0x8b;
          if (isCompressed) {
            const decompressed = await gunzip(data);
            parsed = JSON.parse(decompressed.toString());
          } else {
            parsed = JSON.parse(data.toString());
          }

          if (parsed.expires && now > parsed.expires) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (e) {
          // Skip corrupt files
        }
      }
    } catch (e) {
      // Directory may not exist
    }

    return cleaned;
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.memoryCache.clear();
    this.accessOrder = [];

    try {
      const files = await fs.readdir(this.config.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache')) {
          await fs.unlink(path.join(this.config.cacheDir, file));
        }
      }
    } catch (e) {
      // Directory may not exist
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.config.maxMemoryItems
    };
  }

  /**
   * Create a namespaced cache instance
   * @param {string} namespace - Namespace prefix
   * @returns {Object} Namespaced cache methods
   */
  namespace(namespace) {
    const nsKey = (key) => `${namespace}:${key}`;
    
    return {
      get: (key, opts) => this.get(nsKey(key), opts),
      set: (key, value, opts) => this.set(nsKey(key), value, opts),
      delete: (key) => this.delete(nsKey(key)),
      has: (key) => this.has(nsKey(key)),
      getOrCompute: (key, factory, opts) => this.getOrCompute(nsKey(key), factory, opts)
    };
  }
}

// Singleton instance for quick use
let defaultCache = null;

function getDefaultCache() {
  if (!defaultCache) {
    defaultCache = new CacheManager();
    defaultCache.startCleanup();
  }
  return defaultCache;
}

module.exports = { CacheManager, getDefaultCache };
