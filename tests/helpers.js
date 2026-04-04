/**
 * @fileoverview Test Helpers - Utilities for writing automation tests
 * 
 * @module tests/helpers
 */

const path = require('path');
const fs = require('fs');
const { MockCDPServer, MockCDPClient } = require('./mocks/cdp-server');

// ═══════════════════════════════════════════════════════════════
// TEST SETUP UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Create test environment with mock CDP
 * @param {Object} options - Setup options
 * @returns {Object} Test environment
 */
function createTestEnv(options = {}) {
  const server = new MockCDPServer(options.server);
  const client = new MockCDPClient(server);
  
  return {
    server,
    client,
    async setup() {
      await client.connect();
    },
    async teardown() {
      await client.disconnect();
      server.reset();
    }
  };
}

/**
 * Create temporary test directory
 * @param {string} name - Test name
 * @returns {string} Path to test directory
 */
function createTestDir(name) {
  const testDir = path.join(process.cwd(), 'tests', '.tmp', name);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  return testDir;
}

/**
 * Cleanup test directory
 * @param {string} name - Test name
 */
function cleanupTestDir(name) {
  const testDir = path.join(process.cwd(), 'tests', '.tmp', name);
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Assert that error matches pattern
 * @param {Function} fn - Function that should throw
 * @param {RegExp|string} pattern - Expected error pattern
 */
async function assertThrows(fn, pattern) {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    const message = error.message;
    if (pattern instanceof RegExp) {
      if (!pattern.test(message)) {
        throw new Error(`Expected error to match ${pattern}, got: ${message}`);
      }
    } else if (!message.includes(pattern)) {
      throw new Error(`Expected error to include "${pattern}", got: ${message}`);
    }
  }
}

/**
 * Assert that promise rejects with specific error
 * @param {Promise} promise - Promise to check
 * @param {string} errorType - Expected error type
 */
async function assertRejects(promise, errorType) {
  try {
    await promise;
    throw new Error('Expected promise to reject');
  } catch (error) {
    if (error.name !== errorType) {
      throw new Error(`Expected ${errorType}, got ${error.name}`);
    }
  }
}

/**
 * Wait for condition with timeout
 * @param {Function} condition - Condition function
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} intervalMs - Check interval
 * @returns {Promise<boolean>}
 */
async function waitFor(condition, timeoutMs = 5000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// MOCK HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create mock logger that captures log entries
 * @returns {Object} Mock logger
 */
function createMockLogger() {
  const entries = [];
  
  const logger = {
    trace: (msg, meta) => entries.push({ level: 'trace', msg, meta }),
    debug: (msg, meta) => entries.push({ level: 'debug', msg, meta }),
    info: (msg, meta) => entries.push({ level: 'info', msg, meta }),
    warn: (msg, meta) => entries.push({ level: 'warn', msg, meta }),
    error: (msg, meta) => entries.push({ level: 'error', msg, meta }),
    fatal: (msg, meta) => entries.push({ level: 'fatal', msg, meta }),
    
    getEntries() {
      return entries;
    },
    
    getEntriesByLevel(level) {
      return entries.filter(e => e.level === level);
    },
    
    clear() {
      entries.length = 0;
    },
    
    hasMessage(pattern) {
      return entries.some(e => pattern.test(e.msg));
    }
  };
  
  return logger;
}

/**
 * Create mock page with common elements
 * @param {Object} elements - Elements to mock
 * @returns {Object} Mock page
 */
function createMockPage(elements = {}) {
  const mockElements = new Map(Object.entries(elements));
  
  return {
    url: () => 'https://example.com',
    
    locator(selector) {
      const element = mockElements.get(selector);
      return {
        first: () => ({
          click: async () => {
            if (!element) throw new Error(`Element not found: ${selector}`);
            element.clicked = true;
          },
          fill: async (value) => {
            if (!element) throw new Error(`Element not found: ${selector}`);
            element.value = value;
          },
          type: async (text, options) => {
            if (!element) throw new Error(`Element not found: ${selector}`);
            element.value = text;
          },
          textContent: async () => element?.text || '',
          getAttribute: async (attr) => element?.attributes?.[attr],
          isVisible: async () => element?.visible ?? false,
          waitFor: async (options) => {
            if (!element) throw new Error(`Timeout waiting for ${selector}`);
          },
          scrollIntoViewIfNeeded: async () => {}
        }),
        count: async () => element ? 1 : 0,
        all: async () => element ? [{
          locator: (sel) => ({
            first: () => ({
              textContent: async () => element.childText || ''
            })
          })
        }] : []
      };
    },
    
    async goto(url) {
      this.currentUrl = url;
    },
    
    async screenshot(options) {
      return Buffer.from('mock-screenshot');
    },
    
    async evaluate(fn) {
      if (typeof fn === 'function') {
        return fn();
      }
      return null;
    },
    
    on: () => {},
    off: () => {}
  };
}

/**
 * Create delay mock that can be controlled in tests
 * @returns {Object} Mock delay controller
 */
function createMockDelay() {
  let pendingDelays = [];
  
  return {
    fn: (ms) => {
      return new Promise((resolve) => {
        pendingDelays.push({ ms, resolve });
      });
    },
    
    resolveAll() {
      pendingDelays.forEach(d => d.resolve());
      pendingDelays = [];
    },
    
    resolveNext() {
      const delay = pendingDelays.shift();
      if (delay) delay.resolve();
    },
    
    getPendingCount() {
      return pendingDelays.length;
    },
    
    reset() {
      pendingDelays = [];
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// FIXTURE LOADING
// ═══════════════════════════════════════════════════════════════

/**
 * Load test fixture
 * @param {string} name - Fixture name
 * @returns {any} Fixture data
 */
function loadFixture(name) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', `${name}.json`);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${name}`);
  }
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

/**
 * Save test fixture
 * @param {string} name - Fixture name
 * @param {any} data - Fixture data
 */
function saveFixture(name, data) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', `${name}.json`);
  const dir = path.dirname(fixturePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fixturePath, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// TEST DATA GENERATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate mock HEB cart items
 * @param {number} count - Number of items
 * @returns {Array} Cart items
 */
function generateCartItems(count = 5) {
  const items = [
    { name: 'Chicken Breast', hebSearch: 'boneless chicken breast', quantity: 2 },
    { name: 'Broccoli', hebSearch: 'fresh broccoli', quantity: 1 },
    { name: 'Rice', hebSearch: 'white rice', quantity: 1 },
    { name: 'Milk', hebSearch: 'whole milk gallon', quantity: 1 },
    { name: 'Eggs', hebSearch: 'large eggs dozen', quantity: 1 },
    { name: 'Bread', hebSearch: 'wheat bread', quantity: 1 },
    { name: 'Apples', hebSearch: 'gala apples', quantity: 3 },
    { name: 'Pasta', hebSearch: 'spaghetti pasta', quantity: 2 }
  ];
  
  return items.slice(0, count);
}

/**
 * Generate mock Facebook groups
 * @returns {Array} Group names
 */
function generateFacebookGroups() {
  return [
    'HAYS COUNTY LIST & SELL',
    'Buda/Kyle Buy, Sell & Rent',
    'Ventas De Austin, Buda, Kyle'
  ];
}

/**
 * Generate mock config
 * @param {Object} overrides - Config overrides
 * @returns {Object} Mock config
 */
function generateMockConfig(overrides = {}) {
  return {
    browser: {
      debugPort: 9222,
      headless: false,
      timeouts: {
        navigation: 30000,
        element: 10000
      }
    },
    antiBot: {
      minDelay: 500,
      maxDelay: 2000,
      retryAttempts: 3
    },
    heb: {
      baseUrl: 'https://www.heb.com',
      selectors: {}
    },
    facebook: {
      baseUrl: 'https://www.facebook.com'
    },
    logging: {
      level: 'info',
      console: false
    },
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Setup
  createTestEnv,
  createTestDir,
  cleanupTestDir,
  
  // Assertions
  assertThrows,
  assertRejects,
  waitFor,
  
  // Mocks
  createMockLogger,
  createMockPage,
  createMockDelay,
  
  // Fixtures
  loadFixture,
  saveFixture,
  
  // Generators
  generateCartItems,
  generateFacebookGroups,
  generateMockConfig
};
