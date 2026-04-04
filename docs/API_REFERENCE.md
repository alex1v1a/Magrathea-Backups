# API Reference

> **Module and API documentation for the Marvin Automation Framework**

---

## 📚 Module Overview

| Module | Purpose | Location |
|--------|---------|----------|
| `automation-utils` | Core utilities (retry, delays, CDP) | `lib/automation-utils.js` |
| `error-handling` | Error classes and recovery | `lib/error-handling.js` |
| `browser-helpers` | Browser interaction helpers | `lib/browser-helpers.js` |
| `retry-manager` | Circuit breaker and retry logic | `lib/retry-manager.js` |
| `logger` | Structured logging | `lib/logger.js` |
| `shared-chrome-connector` | CDP connection manager | `dinner-automation/scripts/shared-chrome-connector.js` |

---

## 🔧 automation-utils

Core utility library for all automation tasks.

### Exports

```javascript
const {
  withRetry,           // Retry with exponential backoff
  CDPManager,          // Chrome DevTools Protocol manager
  humanDelay,          // Human-like random delays
  SELECTORS,           // Centralized CSS selectors
  createLogger,        // Structured logger factory
  randomDelay,         // Random delay helper
  staggeredBatch       // Batch processing with pauses
} = require('./lib/automation-utils');
```

### withRetry(asyncFn, options)

Retry an async function with exponential backoff.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `asyncFn` | Function | - | Async function to retry |
| `options.maxAttempts` | number | 3 | Maximum retry attempts |
| `options.baseDelay` | number | 2000 | Initial delay in ms |
| `options.maxDelay` | number | 30000 | Maximum delay in ms |
| `options.onRetry` | Function | null | Callback on retry |

**Example:**
```javascript
const { withRetry } = require('./lib/automation-utils');

await withRetry(async () => {
  await page.click('#submit');
}, {
  maxAttempts: 3,
  baseDelay: 2000,
  onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`)
});
```

---

### CDPManager

Manages Chrome DevTools Protocol connections.

**Constructor:**
```javascript
const cdp = new CDPManager({
  port: 9222,           // Debug port
  logger: console,      // Logger instance
  healthCheckInterval: 30000  // Health check interval
});
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | Promise<Browser> | Connect to browser |
| `disconnect()` | Promise<void> | Disconnect from browser |
| `isHealthy()` | boolean | Check connection health |
| `getPage()` | Promise<Page> | Get active page |

**Example:**
```javascript
const { CDPManager } = require('./lib/automation-utils');

const cdp = new CDPManager({ port: 9222 });
await cdp.connect();

const page = await cdp.getPage();
await page.goto('https://example.com');

await cdp.disconnect();
```

---

### humanDelay(type)

Generate human-like random delays.

**Parameters:**
| Type | Min (ms) | Max (ms) | Use Case |
|------|----------|----------|----------|
| `'type'` | 30 | 120 | Between keystrokes |
| `'click'` | 200 | 800 | Before/after clicks |
| `'navigate'` | 2000 | 5000 | Page load waits |
| `'think'` | 800 | 2500 | Between actions |
| `'batch'` | 10000 | 15000 | Between batches |

**Example:**
```javascript
const { humanDelay } = require('./lib/automation-utils');

// Type like a human
await page.type('#search', 'query', { delay: await humanDelay('type') });

// Wait naturally
await humanDelay('think');
```

---

### SELECTORS

Centralized CSS selectors for maintainability.

**HEB Selectors:**
```javascript
SELECTORS.heb = {
  searchBox: '[data-qe-id="searchField"]',
  searchBtn: 'button[data-qe-id="searchSubmit"]',
  addToCartBtn: 'button[data-qe-id="addToCart"]',
  cartLink: 'a[data-testid="cart-link"]',
  cartCount: '[data-testid="cart-badge"]'
};
```

**Facebook Selectors:**
```javascript
SELECTORS.facebook = {
  marketplaceNav: '[aria-label="Marketplace"]',
  sellingTab: '[aria-label="Selling"]',
  shareButton: '[aria-label="Share"]',
  groupSearch: '[placeholder*="Search groups"]'
};
```

---

### staggeredBatch(items, batchSize, processFn)

Process items in batches with random pauses.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `items` | Array | Items to process |
| `batchSize` | number | Items per batch |
| `processFn` | Function | Processor for each item |

**Example:**
```javascript
const { staggeredBatch } = require('./lib/automation-utils');

const results = await staggeredBatch(groceryItems, 5, async (item) => {
  await addToCart(item);
  return { item: item.name, success: true };
});
```

---

## 🛡️ error-handling

Comprehensive error handling with automatic screenshots.

### Exports

```javascript
const {
  AutomationError,         // Base error class
  NetworkError,            // Network failures
  SelectorError,           // Element not found
  AuthError,               // Authentication failed
  TimeoutError,            // Operation timeout
  ConfigError,             // Configuration error
  withScreenshotOnError,   // Auto-screenshot wrapper
  ErrorRecovery            // Recovery strategies
} = require('./lib/error-handling');
```

### Error Classes

All errors extend `AutomationError` with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `code` | string | Error code (e.g., 'HEB_CART_FAILED') |
| `context` | object | Additional context |
| `screenshot` | string | Path to screenshot (if captured) |
| `timestamp` | Date | When error occurred |

**Example:**
```javascript
const { SelectorError, withScreenshotOnError } = require('./lib/error-handling');

// Throw specific error
throw new SelectorError('Add to cart button not found', {
  selector: SELECTORS.heb.addToCartBtn,
  url: page.url()
});

// Wrap with auto-screenshot
const result = await withScreenshotOnError(page, async () => {
  await riskyOperation();
}, { errorCode: 'RISKY_OP_FAILED' });
```

---

### ErrorRecovery

Automatic recovery strategies for common failures.

**Methods:**

| Method | Description |
|--------|-------------|
| `recover(error, context)` | Attempt recovery based on error type |
| `registerStrategy(code, strategy)` | Add custom recovery strategy |

**Example:**
```javascript
const { ErrorRecovery } = require('./lib/error-handling');

const recovery = new ErrorRecovery();

// Register custom strategy
recovery.registerStrategy('SESSION_EXPIRED', async (context) => {
  await context.page.reload();
  await loginAgain();
  return true; // Recovered
});

// Use recovery
const success = await recovery.recover(error, { page, selector });
```

---

## 🔌 shared-chrome-connector

CDP connection manager for shared browser instances.

### Exports

```javascript
const {
  getBrowser,       // Get connected browser
  getPage,          // Get page (creates if needed)
  releaseBrowser,   // Release connection
  checkStatus       // Check browser status
} = require('./dinner-automation/scripts/shared-chrome-connector');
```

### getBrowser(options)

Get or create browser connection via CDP.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `options.port` | number | 9222 | Debug port |
| `options.headless` | boolean | false | Run headless |

**Returns:** Promise<Browser>

**Example:**
```javascript
const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');

async function automate() {
  const browser = await getBrowser({ port: 9222 });
  const { page } = await getPage(browser, 'https://facebook.com');
  
  // Do work...
  
  await releaseBrowser(browser);
}
```

---

## 📧 dinner-email-system-v2

Email system with NLP parsing and status tracking.

### CLI Usage

```bash
node dinner-email-system-v2.js [command] [options]
```

**Commands:**

| Command | Description |
|---------|-------------|
| `--send-test` | Send test email |
| `--check-reply` | Check for and process replies |
| `--status` | Show tracking status |
| `--send-sms` | Send SMS fallback |
| `--reset` | Reset tracking state |
| `--test-parser "text"` | Test NLP parser |
| `--simulate "reply"` | Simulate reply (for testing) |
| `--sync` | Sync to calendar and HEB |

**Examples:**
```bash
# Send dinner plan
node dinner-email-system-v2.js --send-test

# Check for replies
node dinner-email-system-v2.js --check-reply

# Test NLP parser
node dinner-email-system-v2.js --test-parser "Swap Monday to Chicken Alfredo"

# Simulate confirmation
node dinner-email-system-v2.js --simulate "Looks good!"
```

---

### Class: DinnerEmailSystem

Programmatic API for email system.

```javascript
const DinnerEmailSystem = require('./dinner-email-system-v2');

const email = new DinnerEmailSystem();
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `sendWeeklyPlan()` | Promise<void> | Send weekly dinner plan |
| `checkReplies()` | Promise<object> | Check and parse replies |
| `getStatus()` | object | Get current tracking status |
| `sendSMS(message)` | Promise<void> | Send SMS fallback |
| `applyChanges(changes)` | Promise<void> | Apply parsed changes |

**Example:**
```javascript
const email = new DinnerEmailSystem();

// Send plan
await email.sendWeeklyPlan();

// Check replies
const result = await email.checkReplies();
if (result.replied) {
  await email.applyChanges(result.changes);
}
```

---

### NLP Parser

Smart natural language parsing for email replies.

**Intents:**

| Intent | Example Triggers | Action |
|--------|-----------------|--------|
| `confirm` | "looks good", "perfect", "confirmed" | Mark as confirmed |
| `swap` | "swap Monday to...", "change Tuesday..." | Swap meal on day |
| `remove` | "remove Wednesday", "skip Friday" | Remove day's meal |
| `add` | "add Sunday: Spaghetti" | Add new meal |
| `replace` | "instead of tacos, do burgers" | Replace specific meal |

**Usage:**
```javascript
const { parseReply } = require('./dinner-email-system-v2');

const result = parseReply("Swap Monday to Chicken Alfredo");
// {
//   intent: 'swap',
//   day: 'Monday',
//   meal: 'Chicken Alfredo',
//   confidence: 0.95
// }
```

---

## 🛒 heb-add-cart

HEB cart automation via Playwright + CDP.

### CLI Usage

```bash
node heb-add-cart.js [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--status` | Check cart status |
| `--missing` | Add only missing items |
| `--verbose` | Enable verbose logging |
| `--headless` | Run headless (not recommended) |

**Examples:**
```bash
# Add all items
node heb-add-cart.js

# Check status
node heb-add-cart.js --status

# Add missing only
node heb-add-cart.js --missing
```

---

### Class: HEBCartAutomation

Programmatic API for HEB automation.

```javascript
const HEBCartAutomation = require('./heb-add-cart');

const heb = new HEBCartAutomation();
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | Promise<void> | Connect to Edge via CDP |
| `getCartCount()` | Promise<number> | Get current cart item count |
| `addItem(item)` | Promise<boolean> | Add single item to cart |
| `addAllItems(items)` | Promise<object> | Add all items with verification |
| `disconnect()` | Promise<void> | Disconnect from browser |

**Example:**
```javascript
const heb = new HEBCartAutomation();

await heb.connect();

const beforeCount = await heb.getCartCount();
console.log(`Cart has ${beforeCount} items`);

const result = await heb.addAllItems([
  { name: 'H-E-B Basmati Rice', quantity: 1 },
  { name: 'Stonefire Naan', quantity: 1 }
]);

console.log(`Added: ${result.added}, Failed: ${result.failed}`);

await heb.disconnect();
```

---

### Configuration

HEB automation configuration:

```javascript
const config = {
  browser: {
    port: 9222,           // CDP port
    type: 'edge'          // Only Edge supported
  },
  antiBot: {
    minDelay: 3000,       // Min delay between actions
    maxDelay: 8000,       // Max delay between actions
    batchSize: 5,         // Items per batch
    batchPause: 10000     // Pause between batches (ms)
  },
  verification: {
    retries: 3,           // Verification retries
    timeout: 5000         // Verification timeout
  }
};
```

---

## 📅 sync-dinner-to-icloud

Apple Calendar sync via CalDAV.

### CLI Usage

```bash
node sync-dinner-to-icloud.js [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without applying |
| `--force` | Force full sync (ignore cache) |
| `--calendar "Name"` | Target calendar name |

**Examples:**
```bash
# Sync dinners
node sync-dinner-to-icloud.js

# Dry run
node sync-dinner-to-icloud.js --dry-run

# Different calendar
node sync-dinner-to-icloud.js --calendar "Meals"
```

---

### Class: CalendarSync

Programmatic API for calendar sync.

```javascript
const CalendarSync = require('./sync-dinner-to-icloud');

const sync = new CalendarSync();
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | Promise<void> | Connect to iCloud |
| `findCalendar(name)` | Promise<Calendar> | Find calendar by name |
| `syncEvent(event)` | Promise<void> | Sync single event |
| `syncAll(events)` | Promise<object> | Sync all events |
| `disconnect()` | Promise<void> | Disconnect |

**Example:**
```javascript
const sync = new CalendarSync();

await sync.connect();

const calendar = await sync.findCalendar('Dinner');

await sync.syncAll([
  {
    title: 'Pan-Seared Cod',
    date: '2026-02-17',
    recipe: { /* recipe data */ }
  }
]);

await sync.disconnect();
```

---

## 🚗 facebook-marketplace-shared

Facebook Marketplace automation.

### CLI Usage

```bash
node facebook-marketplace-shared.js [command]
```

**Commands:**

| Command | Description |
|---------|-------------|
| `--messages` | Check Marketplace messages |
| `--share-f150` | Share F-150 to next group |
| `--share-thule` | Share Thule box to next group |
| `--status` | Check automation status |

**Examples:**
```bash
# Check messages
node facebook-marketplace-shared.js --messages

# Share F-150
node facebook-marketplace-shared.js --share-f150
```

---

### Class: FacebookMarketplace

Programmatic API for Facebook automation.

```javascript
const FacebookMarketplace = require('./facebook-marketplace-shared');

const fb = new FacebookMarketplace();
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | Promise<void> | Connect to Chrome |
| `checkMessages()` | Promise<object> | Check for messages |
| `shareToGroup(listing, group)` | Promise<boolean> | Share listing to group |
| `getSellingListings()` | Promise<Array> | Get your listings |
| `disconnect()` | Promise<void> | Disconnect |

**Example:**
```javascript
const fb = new FacebookMarketplace();

await fb.connect();

const messages = await fb.checkMessages();
console.log(`Unread: ${messages.unread}`);

// Share to group
const groups = [
  'HAYS COUNTY LIST & SELL',
  'Buda/Kyle Buy, Sell & Rent'
];

await fb.shareToGroup('F-150', groups[0]);

await fb.disconnect();
```

---

## 🔄 Data Files

### Recipe Database

Location: `dinner-automation/data/recipe-database.json`

**Schema:**
```json
{
  "recipes": {
    "Recipe Name": {
      "cuisine": "Mediterranean / Italian",
      "origin": "Coastal Italy and Greece",
      "story": "Historical context...",
      "prepTime": "10 min",
      "cookTime": "10 min",
      "totalTime": "20 min",
      "difficulty": "Easy",
      "servings": 4,
      "ingredients": ["1.5 lbs cod", "4 tbsp butter"],
      "instructions": ["Step 1...", "Step 2..."],
      "tips": "Don't overcook...",
      "winePairing": "Sauvignon Blanc",
      "cost": "$28-32"
    }
  }
}
```

---

### Weekly Plan

Location: `dinner-automation/data/weekly-plan.json`

**Schema:**
```json
{
  "weekOf": "2026-02-17",
  "meals": {
    "Monday": {
      "name": "Pan-Seared Cod with Lemon Butter",
      "hebSearch": "H-E-B Fresh Cod Fillets",
      "servings": 4,
      "confirmed": true
    }
  },
  "ingredients": [
    { "name": "Cod", "category": "meat_and_seafood", "quantity": 1.5, "unit": "lbs" }
  ],
  "status": "confirmed"
}
```

---

### Email State

Location: `dinner-automation/data/dinner-email-state-v2.json`

**Schema:**
```json
{
  "status": "sent|opened|replied|confirmed",
  "sessionId": "sess_1234567890_abc",
  "weekOf": "2026-02-17",
  "sentAt": "2026-02-15T09:05:00Z",
  "openedAt": null,
  "repliedAt": null,
  "confirmedAt": null,
  "smsSent": false,
  "changesApplied": []
}
```

---

## 🔐 Secrets Schema

### icloud-smtp.json

```json
{
  "host": "smtp.mail.me.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "MarvinMartian9@icloud.com",
    "pass": "xxxx-xxxx-xxxx-xxxx"
  }
}
```

### icloud-credentials.json

```json
{
  "username": "alex@1v1a.com",
  "password": "xxxx-xxxx-xxxx-xxxx",
  "serverUrl": "https://caldav.icloud.com"
}
```

### twilio.json

```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "fromNumber": "+1xxxxxxxxxx"
}
```

### unsplash.json

```json
{
  "accessKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

*Last Updated: February 15, 2026*
