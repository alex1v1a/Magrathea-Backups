/**
 * Common patterns and utilities for dinner automation
 * Extracted for reuse and testing
 */

// Retry utilities
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const delay = options.delay || 1000;
  const backoff = options.backoff || 2;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await sleep(waitTime);
    }
  }
  
  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function batchProcess(items, processor, options = {}) {
  const batchSize = options.batchSize || 10;
  const concurrency = options.concurrency || 5;
  
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (item, index) => {
        try {
          const result = await processor(item, i + index);
          return { success: true, result, index: i + index };
        } catch (error) {
          return { success: false, error: error.message, index: i + index };
        }
      })
    );
    
    results.push(...batchResults);
    
    // Respect concurrency by adding delay between batches
    if (i + batchSize < items.length) {
      await sleep(100);
    }
  }
  
  return results;
}

// Logger utilities
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  success: (...args) => console.log('[✓]', ...args),
  failure: (...args) => console.log('[✗]', ...args),
  debug: (...args) => process.env.DEBUG && console.log('[DEBUG]', ...args),
  section: (title) => console.log(`\n${'='.repeat(40)}\n${title}\n${'='.repeat(40)}`)
};

// Browser patterns
async function smartSelector(page, selectors, options = {}) {
  const timeout = options.timeout || 5000;
  const visible = options.visible !== false;
  
  for (const selector of selectors) {
    try {
      const element = await page.locator(selector).first();
      if (visible) {
        await element.waitFor({ state: 'visible', timeout: timeout / selectors.length });
      }
      return element;
    } catch {
      continue;
    }
  }
  
  return null;
}

async function smartClick(page, selectors, options = {}) {
  const element = await smartSelector(page, selectors, options);
  if (element) {
    await element.click();
    return true;
  }
  return false;
}

async function smartType(page, selectors, text, options = {}) {
  const element = await smartSelector(page, selectors, options);
  if (element) {
    await element.fill(text);
    return true;
  }
  return false;
}

async function checkLoginStatus(page, options = {}) {
  const { loginIndicators = [], logoutIndicators = [] } = options;
  
  for (const selector of loginIndicators) {
    const visible = await page.locator(selector).isVisible().catch(() => false);
    if (visible) return true;
  }
  
  for (const selector of logoutIndicators) {
    const visible = await page.locator(selector).isVisible().catch(() => false);
    if (visible) return false;
  }
  
  return null; // Unknown
}

// Session management
class SessionManager {
  constructor(options = {}) {
    this.debugPort = options.debugPort || 9222;
    this.page = null;
    this.browser = null;
  }
  
  async connect() {
    const { chromium } = require('playwright');
    this.browser = await chromium.connectOverCDP(`http://localhost:${this.debugPort}`);
    this.context = this.browser.contexts()[0] || await this.browser.newContext();
    this.page = this.context.pages()[0] || await this.context.newPage();
    return { browser: this.browser, context: this.context, page: this.page };
  }
  
  async screenshot(name) {
    if (!this.page) return;
    const fs = require('fs').promises;
    const path = require('path');
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    await this.page.screenshot({ 
      path: path.join(screenshotDir, `${name}-${Date.now()}.png`) 
    });
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Rate limiter
class RateLimiter {
  constructor(options = {}) {
    this.minDelay = options.minDelay || 1000;
    this.maxDelay = options.maxDelay || 3000;
    this.lastRequest = 0;
  }
  
  async wait() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    
    if (elapsed < delay) {
      await sleep(delay - elapsed);
    }
    
    this.lastRequest = Date.now();
  }
}

// Credential management (mock for testing)
function getCredentials(service, key) {
  // In production, this would load from secure storage
  const credentials = {
    heb: {
      username: process.env.HEB_USERNAME,
      password: process.env.HEB_PASSWORD
    },
    facebook: {
      username: process.env.FB_USERNAME,
      password: process.env.FB_PASSWORD,
      marketplace: {
        listingUrl: process.env.FB_LISTING_URL
      }
    },
    email: {
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  };
  
  const parts = key ? key.split('.') : [];
  let result = credentials[service];
  
  for (const part of parts) {
    if (result && typeof result === 'object') {
      result = result[part];
    } else {
      return undefined;
    }
  }
  
  return result;
}

module.exports = {
  withRetry,
  sleep,
  batchProcess,
  logger,
  smartSelector,
  smartClick,
  smartType,
  checkLoginStatus,
  SessionManager,
  RateLimiter,
  getCredentials
};
