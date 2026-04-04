# Dinner Automation Code Style Guide

This document defines the coding standards and best practices for the dinner-automation codebase. Following these guidelines ensures consistency, maintainability, and reliability.

## Table of Contents

1. [General Principles](#general-principles)
2. [File Organization](#file-organization)
3. [Naming Conventions](#naming-conventions)
4. [Code Structure](#code-structure)
5. [Error Handling](#error-handling)
6. [Logging](#logging)
7. [Documentation](#documentation)
8. [Anti-Patterns](#anti-patterns)
9. [Testing](#testing)

---

## General Principles

### 1. DRY (Don't Repeat Yourself)
- Extract common patterns into shared utilities in `lib/`
- Use the shared library modules instead of duplicating code
- Create helper functions for repeated operations

### 2. Single Responsibility
- Each function should do one thing well
- Each module should have a clear, focused purpose
- Avoid "god" functions that do everything

### 3. Fail Fast
- Validate inputs early
- Throw meaningful errors instead of silent failures
- Use custom error types for better error handling

### 4. Defensive Programming
- Always handle edge cases
- Use timeouts for external operations
- Implement retry logic for flaky operations

---

## File Organization

```
dinner-automation/
├── lib/                    # Shared utilities (use these!)
│   ├── browser.js         # Browser automation helpers
│   ├── config.js          # Configuration management
│   ├── cdp-client.js      # CDP connection handling
│   ├── date-utils.js      # Date/time utilities
│   ├── index.js           # Main exports
│   ├── logger.js          # Structured logging
│   ├── retry-utils.js     # Retry and circuit breaker
│   ├── selectors.js       # CSS selector definitions
│   └── validation.js      # Input validation
├── scripts/               # Automation scripts
│   ├── lib/              # Script-specific utilities
│   └── archive/          # Old/deprecated scripts
├── data/                  # Data files (JSON, etc.)
├── docs/                  # Documentation
└── templates/             # Script templates
```

### File Naming
- **Scripts**: `kebab-case.js` (e.g., `heb-add-cart.js`)
- **Modules**: `camelCase.js` (e.g., `retryUtils.js`)
- **Classes**: `PascalCase` in filename (e.g., `CDPClient.js`)
- **Constants**: Use UPPER_SNAKE_CASE in code

---

## Naming Conventions

### Variables
```javascript
// ✅ Good
const userEmail = 'test@example.com';
let itemCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

// ❌ Bad
const user_email = 'test@example.com';
let x = 0;
const maxretry = 3;
```

### Functions
```javascript
// ✅ Good
async function addItemToCart(item) { }
function calculateTotalPrice(items) { }
const isValidEmail = (email) => { };

// ❌ Bad
async function add(item) { } // Too vague
function calc(items) { } // Abbreviated
const checkEmail = (email) => { } // Doesn't return boolean
```

### Classes
```javascript
// ✅ Good
class CartManager { }
class SessionManager { }
class HEBAutomationError extends Error { }

// ❌ Bad
class cart { } // lowercase
class manager { } // Too vague
class Error { } // Shadows built-in
```

### Constants
```javascript
// ✅ Good
const DEFAULT_TIMEOUT = 30000;
const HEB_BASE_URL = 'https://www.heb.com';
const SELECTORS = {
  addButton: '[data-testid="add-to-cart"]'
};

// ❌ Bad
const defaultTimeout = 30000; // Not constant case
const url = 'https://www.heb.com'; // Not descriptive
```

---

## Code Structure

### Module Imports
```javascript
// 1. Built-in modules
const fs = require('fs');
const path = require('path');

// 2. External dependencies
const { chromium } = require('playwright');

// 3. Internal modules (lib/)
const { logger, withRetry, HEB_SELECTORS } = require('../lib');

// 4. Local/relative imports
const { localHelper } = require('./helpers');
```

### Function Organization
```javascript
/**
 * Main function JSDoc comment
 */
async function mainFunction() {
  // 1. Configuration/Setup
  const config = loadConfig();
  
  // 2. Validation
  validateInputs(config);
  
  // 3. Initialization
  const manager = new Manager(config);
  
  // 4. Main logic
  await manager.run();
  
  // 5. Cleanup
  await manager.cleanup();
}

// Helper functions below main
function loadConfig() { }
function validateInputs(config) { }
```

### Async/Await Patterns
```javascript
// ✅ Good
async function processItems(items) {
  const results = [];
  
  for (const item of items) {
    try {
      const result = await processItem(item);
      results.push(result);
    } catch (error) {
      logger.error('Failed to process item', error, { item });
      // Continue with next item
    }
  }
  
  return results;
}

// ❌ Bad
function processItems(items) {
  return Promise.all(items.map(item => {
    return processItem(item); // No error handling!
  }));
}
```

---

## Error Handling

### Always Use try/catch for Async Operations
```javascript
// ✅ Good
async function addToCart(item) {
  try {
    await page.click(SELECTORS.addButton);
    await verifyCartUpdated();
  } catch (error) {
    logger.error('Failed to add item to cart', error, { item });
    throw new CartError(`Could not add ${item.name}: ${error.message}`);
  }
}

// ❌ Bad
async function addToCart(item) {
  await page.click(SELECTORS.addButton); // May throw
  await verifyCartUpdated(); // May throw
}
```

### Use Custom Error Types
```javascript
const { ValidationError } = require('../lib');

class CartError extends Error {
  constructor(message, item = null) {
    super(message);
    this.name = 'CartError';
    this.item = item;
  }
}

class TimeoutError extends Error {
  constructor(operation, timeout) {
    super(`${operation} timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeout = timeout;
  }
}
```

### Validate Early, Fail Fast
```javascript
// ✅ Good
async function searchProducts(query) {
  if (!query || typeof query !== 'string') {
    throw new ValidationError('Query must be a non-empty string', 'query', query);
  }
  
  if (query.length > 100) {
    throw new ValidationError('Query too long (max 100 chars)', 'query', query);
  }
  
  // Proceed with search...
}

// ❌ Bad
async function searchProducts(query) {
  await page.fill('[name="search"]', query); // Will fail with cryptic error
}
```

---

## Logging

### Use the Structured Logger
```javascript
const { logger } = require('../lib');

// ✅ Good
logger.info('Starting automation', { mode: 'cart', items: items.length });
logger.error('Failed to add item', error, { item: item.name });
logger.success('Cart updated', { total: cart.total });

// ❌ Bad
console.log('Starting automation'); // No context
console.error(error); // No message or context
```

### Log Levels
- **ERROR**: Failures that prevent operation completion
- **WARN**: Issues that don't stop execution but need attention
- **INFO**: Normal operation milestones
- **SUCCESS**: Successful completion of operations
- **DEBUG**: Detailed information for troubleshooting
- **TRACE**: Very detailed execution flow

### Child Loggers for Components
```javascript
const { logger } = require('../lib');

// Create component-specific logger
const log = logger.child('heb-cart');

log.info('Adding items to cart'); // Output: [INFO] [app.heb-cart] Adding items to cart
```

---

## Documentation

### JSDoc Comments
```javascript
/**
 * Add an item to the HEB cart
 * 
 * Searches for the item using the provided search term and adds the
 * first matching product to the cart. Includes retry logic and
 * verification of cart update.
 * 
 * @param {Page} page - Playwright page object
 * @param {Object} item - Item to add
 * @param {string} item.name - Display name of the item
 * @param {string} item.searchTerm - Search term for finding the item
 * @param {number} [item.quantity=1] - Quantity to add
 * @param {Object} [options={}] - Options
 * @param {number} [options.timeout=10000] - Timeout in milliseconds
 * @returns {Promise<Object>} Result object with success flag and details
 * @throws {CartError} If item cannot be added
 * 
 * @example
 * const result = await addToCart(page, {
 *   name: 'Organic Milk',
 *   searchTerm: 'organic whole milk',
 *   quantity: 2
 * });
 * 
 * if (result.success) {
 *   console.log(`Added ${result.added} items`);
 * }
 */
async function addToCart(page, item, options = {}) {
  // Implementation...
}
```

### File Headers
```javascript
/**
 * HEB Cart Automation Script
 * 
 * Automates adding items to HEB shopping cart using Playwright.
 * Connects to existing Edge browser via CDP.
 * 
 * Usage:
 *   node heb-add-cart.js [--items file.json] [--dry-run]
 * 
 * @module scripts/heb-add-cart
 * @requires playwright
 * @requires ../lib
 */
```

---

## Anti-Patterns

### 1. Magic Numbers
```javascript
// ❌ Bad
await sleep(2000);
if (count > 5) { }

// ✅ Good
const DELAY_BETWEEN_ACTIONS = 2000;
const MAX_RETRY_ATTEMPTS = 5;

await sleep(DELAY_BETWEEN_ACTIONS);
if (count > MAX_RETRY_ATTEMPTS) { }
```

### 2. Deep Nesting
```javascript
// ❌ Bad
async function process() {
  if (condition1) {
    if (condition2) {
      try {
        await something();
      } catch (e) {
        // handle
      }
    }
  }
}

// ✅ Good
async function process() {
  if (!condition1) return;
  if (!condition2) return;
  
  try {
    await something();
  } catch (error) {
    handleError(error);
  }
}
```

### 3. Silent Failures
```javascript
// ❌ Bad
try {
  await riskyOperation();
} catch (e) {
  // Silent failure!
}

// ✅ Good
try {
  await riskyOperation();
} catch (error) {
  logger.error('Risky operation failed', error);
  throw new OperationError('Could not complete risky operation', error);
}
```

### 4. Callback Hell
```javascript
// ❌ Bad
function process() {
  loadData((err, data) => {
    if (err) { /* handle */ }
    transform(data, (err, transformed) => {
      if (err) { /* handle */ }
      save(transformed, (err) => {
        // ...
      });
    });
  });
}

// ✅ Good
async function process() {
  const data = await loadData();
  const transformed = await transform(data);
  await save(transformed);
}
```

### 5. Hardcoded Paths
```javascript
// ❌ Bad
const data = fs.readFileSync('C:\\Users\\Admin\\data\\items.json');

// ✅ Good
const path = require('path');
const { getConfig } = require('../lib');

const config = getConfig();
const dataPath = path.join(config.getPath('data'), 'items.json');
const data = fs.readFileSync(dataPath);
```

### 6. Duplicate Selectors
```javascript
// ❌ Bad
// In file1.js
await page.click('[data-testid="add-to-cart"]');

// In file2.js
await page.click('button[data-testid*="add-to-cart"]');

// In file3.js
await page.click('[data-testid="addToCart"]');

// ✅ Good
const { HEB_SELECTORS } = require('../lib');
await smartClick(page, HEB_SELECTORS.cart.addButton);
```

### 7. No Input Validation
```javascript
// ❌ Bad
async function addItems(items) {
  for (const item of items) {
    await addToCart(item); // What if items is null?
  }
}

// ✅ Good
const { validateArray, validateHEBCartItem } = require('../lib');

async function addItems(items) {
  validateArray(items, validateHEBCartItem, 'items');
  
  for (const item of items) {
    await addToCart(item);
  }
}
```

### 8. Ignoring Return Values
```javascript
// ❌ Bad
async function checkLogin() {
  await page.goto('https://heb.com/login');
  const element = await page.$('[data-testid="account-menu"]');
  // What if element is null?
  return element !== null;
}

// ✅ Good
async function checkLogin() {
  const response = await page.goto('https://heb.com/login', { 
    waitUntil: 'networkidle' 
  });
  
  if (!response || response.status() >= 400) {
    throw new NavigationError('Failed to load login page');
  }
  
  const element = await page.waitForSelector('[data-testid="account-menu"]', { 
    timeout: 5000 
  }).catch(() => null);
  
  return element !== null;
}
```

---

## Testing

### Test Structure
```javascript
const { describe, it, expect } = require('@jest/globals');
const { validateEmail, validateRange } = require('../lib/validation');

describe('validation', () => {
  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
    });
    
    it('should reject invalid email', () => {
      expect(() => validateEmail('invalid')).toThrow(ValidationError);
    });
    
    it('should reject null email', () => {
      expect(() => validateEmail(null)).toThrow('Email is required');
    });
  });
});
```

### Test Data
```javascript
// Use factory functions for test data
function createMockItem(overrides = {}) {
  return {
    name: 'Test Item',
    searchTerm: 'test',
    quantity: 1,
    ...overrides
  };
}

// In tests
const item = createMockItem({ quantity: 5 });
```

---

## Summary Checklist

Before submitting code:

- [ ] All files use the shared library where applicable
- [ ] Error handling is comprehensive (no silent failures)
- [ ] All functions have JSDoc comments
- [ ] No magic numbers (use constants)
- [ ] No hardcoded paths (use config)
- [ ] No duplicate code (extract to utilities)
- [ ] Input validation at function entry points
- [ ] Structured logging used throughout
- [ ] Selectors defined in `lib/selectors.js`
- [ ] Follows naming conventions

---

## References

- [JSDoc Documentation](https://jsdoc.app/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Node.js Style Guide](https://github.com/felixge/node-style-guide)
