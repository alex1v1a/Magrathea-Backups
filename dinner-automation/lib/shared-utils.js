/**
 * Shared Utility Library for Dinner Automation
 * Common patterns extracted to reduce code duplication
 * 
 * Usage: const { CDPClient, RetryUtils, Logger } = require('../lib/shared-utils');
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════════
// Logger - Structured logging with levels
// ═══════════════════════════════════════════════════════════════

class Logger {
  constructor(context) {
    this.context = context;
    this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  _log(level, message, meta = {}) {
    if (this.levels[level] < this.levels[this.level]) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...meta
    };
    
    console.log(JSON.stringify(logEntry));
  }

  debug(msg, meta) { this._log('DEBUG', msg, meta); }
  info(msg, meta) { this._log('INFO', msg, meta); }
  warn(msg, meta) { this._log('WARN', msg, meta); }
  error(msg, meta) { this._log('ERROR', msg, meta); }
}

// ═══════════════════════════════════════════════════════════════
// RetryUtils - Exponential backoff and circuit breaker
// ═══════════════════════════════════════════════════════════════

class RetryUtils {
  static async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryableErrors = []
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (retryableErrors.length > 0) {
          const isRetryable = retryableErrors.some(e => 
            error.message?.includes(e) || error.code === e
          );
          if (!isRetryable) throw error;
        }

        if (attempt === maxRetries) break;

        // Calculate delay with jitter
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );
        const jitter = Math.random() * 0.3 * delay; // 30% jitter
        const finalDelay = Math.floor(delay + jitter);

        await new Promise(r => setTimeout(r, finalDelay));
      }
    }

    throw lastError;
  }

  static createCircuitBreaker(fn, options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitorPeriod = 60000
    } = options;

    let failures = 0;
    let lastFailureTime = null;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }

      try {
        const result = await fn(...args);
        
        if (state === 'HALF_OPEN') {
          failures = 0;
          state = 'CLOSED';
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          state = 'OPEN';
        }
        
        throw error;
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// CDPClient - Shared Chrome DevTools Protocol connection
// ═══════════════════════════════════════════════════════════════

class CDPClient {
  constructor(port = 9222, host = 'localhost') {
    this.port = port;
    this.host = host;
    this.logger = new Logger('CDPClient');
  }

  async connect() {
    return await RetryUtils.withRetry(async () => {
      const response = await fetch(`http://${this.host}:${this.port}/json/version`);
      if (!response.ok) throw new Error(`CDP not available: ${response.status}`);
      
      const version = await response.json();
      this.logger.info('CDP connected', { browser: version.Browser });
      
      return version;
    }, {
      maxRetries: 5,
      baseDelay: 2000,
      retryableErrors: ['ECONNREFUSED', 'fetch failed']
    });
  }

  async getPage(urlPattern) {
    const response = await fetch(`http://${this.host}:${this.port}/json/list`);
    const pages = await response.json();
    
    // Find page matching URL pattern
    const page = pages.find(p => 
      p.url?.includes(urlPattern) || 
      p.title?.includes(urlPattern)
    );
    
    if (!page) {
      this.logger.warn('Page not found', { urlPattern });
      return null;
    }
    
    return page;
  }

  async connectToPage(urlPattern) {
    const page = await this.getPage(urlPattern);
    if (!page) return null;

    // Connect to the page's WebSocket debugger URL
    const wsUrl = page.webSocketDebuggerUrl;
    return { page, wsUrl };
  }

  async close() {
    this.logger.info('CDP connection closed');
  }
}

// ═══════════════════════════════════════════════════════════════
// FileUtils - Safe file operations with backups
// ═══════════════════════════════════════════════════════════════

class FileUtils {
  static async safeWrite(filePath, data, options = {}) {
    const { backup = true, atomic = true } = options;
    const dir = path.dirname(filePath);
    const tempPath = atomic ? `${filePath}.tmp.${Date.now()}` : filePath;

    try {
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Create backup if file exists
      if (backup) {
        try {
          await fs.access(filePath);
          const backupPath = `${filePath}.backup`;
          await fs.copyFile(filePath, backupPath);
        } catch {
          // File doesn't exist, no backup needed
        }
      }

      // Write to temp file first (atomic)
      await fs.writeFile(tempPath, data);

      // Atomic rename
      if (atomic) {
        await fs.rename(tempPath, filePath);
      }

      return { success: true };
    } catch (error) {
      // Cleanup temp file on failure
      try {
        await fs.unlink(tempPath);
      } catch {}
      
      throw error;
    }
  }

  static async loadJSON(filePath, defaultValue = null) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return defaultValue;
      throw error;
    }
  }

  static async saveJSON(filePath, data, options = {}) {
    const json = JSON.stringify(data, null, 2);
    return await FileUtils.safeWrite(filePath, json, options);
  }
}

// ═══════════════════════════════════════════════════════════════
// AntiBotUtils - Human-like behavior patterns
// ═══════════════════════════════════════════════════════════════

class AntiBotUtils {
  static randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(r => setTimeout(r, delay));
  }

  static async humanLikeScroll(page, amount = null) {
    const scrollAmount = amount || Math.floor(Math.random() * 300) + 100;
    await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
    await this.randomDelay(200, 500);
  }

  static async humanLikeClick(page, selector) {
    await page.hover(selector);
    await this.randomDelay(100, 300);
    await page.click(selector);
    await this.randomDelay(200, 400);
  }

  static async sessionWarmup(page, url) {
    await page.goto(url);
    await this.randomDelay(2000, 4000);
    await this.humanLikeScroll(page, 400);
    await this.randomDelay(1000, 2000);
  }

  static async staggeredBatch(items, processor, options = {}) {
    const { batchSize = 5, interBatchDelay = [10000, 15000] } = options;
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      for (const item of batch) {
        try {
          const result = await processor(item);
          results.push({ item, success: true, result });
        } catch (error) {
          results.push({ item, success: false, error: error.message });
        }
        
        // Random delay between items
        await this.randomDelay(3000, 8000);
      }

      // Pause between batches (except last)
      if (i + batchSize < items.length) {
        const [min, max] = interBatchDelay;
        await this.randomDelay(min, max);
      }
    }

    return results;
  }
}

// ═══════════════════════════════════════════════════════════════
// ConfigLoader - Unified configuration management
// ═══════════════════════════════════════════════════════════════

class ConfigLoader {
  constructor(basePath) {
    this.basePath = basePath;
    this.cache = new Map();
    this.logger = new Logger('ConfigLoader');
  }

  async load(name, options = {}) {
    const { cache = true, required = false } = options;
    
    if (cache && this.cache.has(name)) {
      return this.cache.get(name);
    }

    const filePath = path.join(this.basePath, `${name}.json`);
    
    try {
      const data = await FileUtils.loadJSON(filePath);
      
      if (data === null && required) {
        throw new Error(`Required config not found: ${filePath}`);
      }

      if (cache) {
        this.cache.set(name, data);
      }

      return data;
    } catch (error) {
      this.logger.error('Config load failed', { name, error: error.message });
      throw error;
    }
  }

  invalidate(name) {
    this.cache.delete(name);
  }

  invalidateAll() {
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// Metrics - Performance tracking
// ═══════════════════════════════════════════════════════════════

class Metrics {
  constructor() {
    this.timers = new Map();
    this.counters = new Map();
  }

  startTimer(name) {
    this.timers.set(name, Date.now());
  }

  endTimer(name) {
    const start = this.timers.get(name);
    if (!start) return null;
    
    const duration = Date.now() - start;
    this.timers.delete(name);
    return duration;
  }

  increment(name, value = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  getCounter(name) {
    return this.counters.get(name) || 0;
  }

  report() {
    return {
      activeTimers: Array.from(this.timers.keys()),
      counters: Object.fromEntries(this.counters)
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  Logger,
  RetryUtils,
  CDPClient,
  FileUtils,
  AntiBotUtils,
  ConfigLoader,
  Metrics
};
