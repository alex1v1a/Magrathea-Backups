# Unified Automation Framework

A comprehensive browser automation framework with CDP connection management, anti-bot evasion, intelligent retry logic, and a plugin-based architecture for site-specific automations.

## Features

- **Browser Pool Management**: Efficient CDP connection handling with health monitoring
- **Anti-Bot Evasion**: Sophisticated humanization techniques including randomized delays, mouse movements, and fingerprint randomization
- **Intelligent Retry**: Exponential backoff with jitter and circuit breaker pattern
- **Plugin Architecture**: Extensible base for site-specific automations
- **Queue-Based Processing**: Priority job queue with persistence
- **Centralized Logging**: Consistent logging across all components

## Installation

```bash
npm install playwright-extra puppeteer-extra-plugin-stealth chrome-remote-interface winston
```

## Quick Start

```javascript
const { Framework, HEBPlugin, FacebookPlugin } = require('./lib/automation-framework');

async function main() {
  // Initialize framework
  const framework = new Framework();
  await framework.initialize();

  // Create HEB plugin instance
  const heb = framework.createPlugin('heb', {
    profile: 'heb-main',
    headless: false
  });
  
  await heb.initialize();
  
  // Login and build cart
  await heb.login({
    email: 'your@email.com',
    password: 'yourpassword'
  });
  
  const result = await heb.buildCart([
    { name: 'organic milk', quantity: 1 },
    { name: 'sourdough bread', quantity: 2 }
  ]);
  
  console.log('Cart built:', result);
  
  // Cleanup
  await heb.shutdown();
  await framework.shutdown();
}

main();
```

## API Reference

### Framework

#### `new AutomationFramework(options)`

Create a new framework instance.

**Options:**
- `profilesDir` - Directory for browser profiles (default: `./browser-profiles`)
- `screenshotsDir` - Directory for screenshots (default: `./screenshots`)
- `logsDir` - Directory for logs (default: `./logs`)
- `maxConcurrentJobs` - Maximum concurrent jobs (default: 1)
- `browserPool` - Custom browser pool instance
- `logger` - Custom logger (default: console)

#### `framework.initialize()`

Initialize the framework. Must be called before using other methods.

#### `framework.createPlugin(type, options)`

Create a plugin instance.

**Types:** `heb`, `facebook`

**Options:**
- `profile` - Browser profile name
- `headless` - Run in headless mode
- `slowMo` - Slow down operations by N milliseconds

#### `framework.queueJob(type, payload, options)`

Queue a job for background execution.

#### `framework.shutdown()`

Gracefully shutdown the framework.

### HEB Plugin

#### `heb.login(credentials)`

Login to HEB.com.

Returns: `{ success, alreadyLoggedIn, needs2FA }`

#### `heb.complete2FA(code)`

Complete two-factor authentication.

#### `heb.search(query, options)`

Search for products.

**Options:**
- `limit` - Maximum results to return

#### `heb.addToCart(product, quantity)`

Add a product to cart. Product can be a search string or product object.

#### `heb.buildCart(items, options)`

Build a complete cart with multiple items.

**Items:** Array of `{ name, quantity }`

**Options:**
- `clearFirst` - Clear existing cart before adding
- `credentials` - Auto-login if not already logged in
- `ensureLogin` - Ensure user is logged in

#### `heb.checkout()`

Proceed to checkout.

#### `heb.selectStore(storeName)`

Select pickup/delivery store.

### Facebook Plugin

#### `facebook.login(credentials)`

Login to Facebook.

#### `facebook.searchMarketplace(query, options)`

Search Facebook Marketplace.

**Options:**
- `limit` - Maximum results

#### `facebook.browseCategory(category)`

Browse by category. Available: `vehicles`, `property`, `electronics`, `furniture`, `clothing`, `sports`, `toys`, `pet`, `free`

#### `facebook.setPriceFilter(min, max)`

Apply price filter to current search.

#### `facebook.messageSeller(listingUrl, message)`

Send message to listing seller.

#### `facebook.viewListing(urlOrIndex)`

View specific listing details.

## Architecture

```
lib/automation-framework/
├── core/
│   ├── browser-pool.js      # CDP connection management
│   ├── anti-bot.js          # Anti-detection techniques
│   └── retry-manager.js     # Retry and circuit breaker
├── plugins/
│   ├── base-plugin.js       # Base plugin class
│   ├── heb-plugin.js        # HEB-specific automation
│   └── facebook-plugin.js   # Facebook-specific automation
├── queue/
│   └── job-queue.js         # Job processing queue
├── utils/
│   └── random.js            # Randomization utilities
└── index.js                 # Main entry point
```

## Anti-Bot Configuration

```javascript
const framework = new Framework({
  antiBot: {
    delays: {
      minActionDelay: 500,
      maxActionDelay: 2000,
      minTypingDelay: 50,
      maxTypingDelay: 150
    },
    mouse: {
      enableHumanMovement: true,
      movementSteps: { min: 5, max: 15 }
    },
    scroll: {
      enableHumanScroll: true,
      scrollSteps: { min: 10, max: 20 }
    }
  }
});
```

## Retry Configuration

```javascript
const { RetryManager } = require('./lib/automation-framework');

const retryManager = new RetryManager({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
});

// Register custom retry policy
retryManager.registerPolicy('custom', {
  maxRetries: 5,
  retryableErrors: ['timeout', 'network']
});

// Execute with retry
await retryManager.execute('custom', async () => {
  // Your operation here
});
```

## Job Queue

```javascript
const { JobQueue, JobPriority } = require('./lib/automation-framework');

const queue = new JobQueue({
  concurrency: 2,
  retryDelay: 5000
});

// Register handler
queue.registerHandler('my-task', async (payload, job) => {
  console.log('Processing:', payload);
  return { result: 'success' };
});

// Start processing
queue.start();

// Add job
queue.add({
  type: 'my-task',
  payload: { foo: 'bar' },
  priority: JobPriority.HIGH
});

// Get stats
console.log(queue.getStats());
```

## Creating Custom Plugins

```javascript
const { BasePlugin } = require('./lib/automation-framework');

class MySitePlugin extends BasePlugin {
  constructor(options) {
    super({
      name: 'mysite',
      baseUrl: 'https://example.com',
      ...options
    });
  }

  async isLoggedIn() {
    return this.safeEvaluate(() => {
      return !!document.querySelector('.user-menu');
    });
  }

  async login(credentials) {
    await this.navigate('/login');
    await this.antiBot.typeWithDelay(this.page, '#email', credentials.email);
    await this.antiBot.typeWithDelay(this.page, '#password', credentials.password);
    await this.antiBot.humanClick(this.page, '#login-button');
    return { success: await this.isLoggedIn() };
  }

  async performAction() {
    return this.retryManager.execute('mysite:action', async () => {
      // Your action here
    });
  }
}

module.exports = { MySitePlugin };
```

## Migration from Legacy Scripts

### Old Approach
```javascript
const { HEBAutomation } = require('./dinner-automation/browser');
const heb = new HEBAutomation({ headless: false });
await heb.initialize();
```

### New Approach
```javascript
const { Framework, HEBPlugin } = require('./lib/automation-framework');

const framework = new Framework();
await framework.initialize();

const heb = framework.createPlugin('heb', { headless: false });
await heb.initialize();
```

### Key Differences

1. **Browser Management**: Framework manages browser pool automatically
2. **Plugin Creation**: Use `framework.createPlugin()` instead of direct instantiation
3. **Shutdown**: Always call `framework.shutdown()` for proper cleanup
4. **Queue Operations**: Use `framework.queueJob()` for background tasks

## Environment Variables

```bash
# Browser paths
CHROME_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
EDGE_EXECUTABLE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# Debug settings
DEBUG_AUTOMATION=true
DEBUG_CDP=true
```

## Troubleshooting

### Connection Refused to CDP

Ensure the browser is launched with remote debugging enabled:

```bash
# Chrome
chrome.exe --remote-debugging-port=9222

# Edge
msedge.exe --remote-debugging-port=9222
```

### Bot Detection Issues

1. Increase delays in anti-bot config
2. Use non-headless mode
3. Use persistent browser profiles
4. Rotate user agents

### Memory Issues

1. Reduce `maxInstances` in browser pool
2. Enable `headless` mode
3. Call `plugin.shutdown()` after use
4. Use job queue for batch operations

## License

MIT
