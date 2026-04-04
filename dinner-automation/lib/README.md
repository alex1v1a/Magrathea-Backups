# Dinner Automation Shared Library

Centralized utilities for the dinner-automation codebase. This library provides consistent patterns for common operations.

## Quick Start

```javascript
const { 
  logger,           // Structured logging
  withRetry,        // Exponential backoff retry
  getConfig,        // Configuration management
  smartClick,       // Smart browser clicking
  HEB_SELECTORS,    // HEB CSS selectors
  validateEmail     // Input validation
} = require('./lib');
```

## Modules

### logger.js - Structured Logging

Provides consistent, structured logging with support for multiple levels.

```javascript
const { logger, LOG_LEVELS } = require('./lib');

// Basic logging
logger.info('Starting automation');
logger.error('Operation failed', error);
logger.success('Cart updated');

// With metadata
logger.info('Adding item', { name: 'milk', quantity: 2 });

// Component-specific logger
const log = logger.child('heb-cart');
log.info('Processing items'); // Output: [INFO] [app.heb-cart] Processing items

// Set log level
logger.setLevel(LOG_LEVELS.DEBUG);
```

### retry-utils.js - Retry Logic

Exponential backoff and circuit breaker patterns.

```javascript
const { withRetry, CircuitBreaker, sleep } = require('./lib');

// Simple retry
await withRetry(async () => {
  await riskyOperation();
}, { maxRetries: 3, delay: 1000 });

// With circuit breaker
const breaker = new CircuitBreaker({ failureThreshold: 5 });
await breaker.execute(() => riskyOperation());

// Sleep with jitter
await sleep(1000, true);
```

### config.js - Configuration Management

Centralized configuration with environment variable support.

```javascript
const { getConfig, createConfig } = require('./lib');

// Get singleton instance
const config = getConfig();

// Get values (dot notation)
const port = config.get('browser.debugPort'); // 9222
const email = config.get('heb.email');

// Get resolved path
const dataDir = config.getPath('data');

// Validate required config
const validation = config.validate(['heb.email', 'heb.password']);
if (!validation.valid) {
  console.error('Missing:', validation.missing);
}
```

### browser.js - Browser Automation

High-level browser automation patterns.

```javascript
const { 
  smartSelector, 
  smartClick, 
  smartNavigate,
  SessionManager,
  checkLoginStatus 
} = require('./lib');

// Smart clicking with fallback selectors
await smartClick(page, [
  '[data-testid="add-to-cart"]',
  'button:has-text("Add to Cart")',
  '.add-cart-btn'
]);

// Check login status
const isLoggedIn = await checkLoginStatus(page, {
  loginIndicators: ['[data-testid="account-menu"]'],
  logoutIndicators: ['input[name="email"]']
});

// Session management
const session = new SessionManager({ debugPort: 9222 });
await session.connect();
await session.screenshot('debug');
await session.close();
```

### selectors.js - CSS Selectors

Centralized selector definitions for HEB and Facebook.

```javascript
const { HEB_SELECTORS, FB_SELECTORS, getSelectorByPath } = require('./lib');

// Use selector chains
await smartClick(page, HEB_SELECTORS.cart.addButton);

// Get specific selector
const selectors = getSelectorByPath(HEB_SELECTORS, 'login.emailInput');
// Returns: ['input[type="email"]', 'input[name="email"]', ...]

// Merge custom selectors
const customSelectors = mergeSelectors(HEB_SELECTORS, {
  cart: {
    customButton: ['.my-custom-btn']
  }
});
```

### validation.js - Input Validation

Comprehensive input validation utilities.

```javascript
const { 
  validateEmail, 
  validateUrl, 
  validateRange,
  validateHEBCartItem,
  ValidationError 
} = require('./lib');

// Validate email
try {
  validateEmail('user@example.com');
} catch (error) {
  console.error(error.message); // Invalid email format
}

// Validate HEB cart item
try {
  validateHEBCartItem({
    name: 'Organic Milk',
    searchTerm: 'organic whole milk',
    quantity: 2
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.field, error.message);
  }
}

// Schema validation
const schema = {
  name: { type: 'string', required: true, min: 1 },
  email: { type: 'email', required: true }
};

validateSchema(data, schema);
```

### cdp-client.js - CDP Connection

Chrome DevTools Protocol connection management.

```javascript
const { CDPClient, connectToBrowser } = require('./lib');

// Quick connect
const client = await connectToBrowser({ debugPort: 9222 });
const { page, browser } = client.getConnection();

// Or with event handling
const client = new CDPClient({ debugPort: 9222 });
client.on('connected', () => console.log('Connected!'));
client.on('error', (err) => console.error('Error:', err));
await client.connect();
```

### date-utils.js - Date Utilities

Date formatting and manipulation.

```javascript
const { 
  formatDateTime, 
  formatDuration, 
  timestampForFilename 
} = require('./lib');

// Format dates
formatDateTime(new Date(), 'iso');      // 2024-01-15T10:30:00.000Z
formatDateTime(new Date(), 'short');    // 01/15/2024
formatDateTime(new Date(), 'readable'); // January 15, 2024 at 10:30 AM

// Format duration
formatDuration(65000);        // 1 minute, 5 seconds
formatDuration(65000, { short: true }); // 1m

// Timestamp for filenames
timestampForFilename(); // 2024-01-15_10-30-00
```

## Error Handling Pattern

```javascript
const { logger, ValidationError } = require('./lib');

async function processItems(items) {
  try {
    // Validate inputs
    validateArray(items, validateHEBCartItem, 'items');
    
    // Process with retry
    await withRetry(() => process(items), {
      maxRetries: 3,
      onRetry: ({ attempt, error }) => {
        logger.warn(`Retry ${attempt}`, { error: error.message });
      }
    });
    
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error('Validation failed', error, { field: error.field });
    } else {
      logger.error('Processing failed', error);
    }
    throw error;
  }
}
```

## Configuration

Create a `config.json` in the `data/` directory:

```json
{
  "heb": {
    "email": "your@email.com"
  },
  "automation": {
    "delayMin": 1000,
    "delayMax": 3000,
    "batchSize": 5
  }
}
```

Or use environment variables:

```bash
export HEB_EMAIL=your@email.com
export LOG_LEVEL=debug
```

## Script Template

See `templates/script-template.js` for a starting point:

```javascript
const { logger, getConfig, withRetry } = require('../lib');
const log = logger.child('my-script');

class MyAutomation {
  async run() {
    log.info('Starting...');
    // Your logic here
  }
}
```

## Best Practices

1. **Always use the logger** - Don't use `console.log` directly
2. **Validate inputs** - Use validation utilities
3. **Use smart selectors** - Don't hardcode selectors
4. **Handle errors** - Use try/catch with proper error types
5. **Use retry logic** - Network operations can fail
6. **Read from config** - Don't hardcode paths or timeouts
