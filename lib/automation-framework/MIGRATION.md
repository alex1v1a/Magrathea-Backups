# Migration Guide: Legacy Scripts to Unified Framework

This guide helps migrate existing automation scripts to the new unified framework.

## Overview

The unified framework provides:
- Better resource management via BrowserPool
- Consistent anti-bot patterns
- Centralized logging and metrics
- Queue-based job processing
- Easier plugin development

## Step-by-Step Migration

### 1. Update Imports

**Before:**
```javascript
const { HEBAutomation } = require('./dinner-automation/browser');
```

**After:**
```javascript
const { Framework, HEBPlugin } = require('./lib/automation-framework');
```

### 2. Initialize Framework

**Before:**
```javascript
const heb = new HEBAutomation({
  profile: 'heb-main',
  headless: false
});
await heb.initialize();
```

**After:**
```javascript
const framework = new Framework();
await framework.initialize();

const heb = framework.createPlugin('heb', {
  profile: 'heb-main',
  headless: false
});
await heb.initialize();
```

### 3. Update Method Calls

Most method calls remain the same. Key differences:

| Old | New |
|-----|-----|
| `heb.browser.randomDelay()` | `heb.antiBot.sleep()` |
| `heb.browser.click()` | `heb.antiBot.humanClick()` |
| `heb.safeNavigate()` | `heb.navigate()` |
| `heb.execute()` | `heb.retryManager.execute()` |

### 4. Proper Shutdown

**Before:**
```javascript
await heb.shutdown();
```

**After:**
```javascript
await heb.shutdown();
await framework.shutdown();
```

## Complete Example Migration

### Before (Legacy)
```javascript
const { HEBAutomation } = require('./dinner-automation/browser');

async function buildCart() {
  const heb = new HEBAutomation({
    profile: 'heb-main',
    headless: false
  });
  
  try {
    await heb.initialize();
    
    // Login if needed
    const loggedIn = await heb.isLoggedIn();
    if (!loggedIn) {
      await heb.login();
    }
    
    // Add items
    const results = await heb.buildCart([
      { name: 'milk', quantity: 1 },
      { name: 'bread', quantity: 2 }
    ]);
    
    console.log(results);
    
  } finally {
    await heb.shutdown();
  }
}

buildCart();
```

### After (Unified Framework)
```javascript
const { Framework } = require('./lib/automation-framework');

async function buildCart() {
  const framework = new Framework();
  
  try {
    await framework.initialize();
    
    const heb = framework.createPlugin('heb', {
      profile: 'heb-main',
      headless: false
    });
    
    await heb.initialize();
    
    // Login if needed
    const loggedIn = await heb.isLoggedIn();
    if (!loggedIn) {
      await heb.login({
        email: process.env.HEB_EMAIL,
        password: process.env.HEB_PASSWORD
      });
    }
    
    // Add items
    const results = await heb.buildCart([
      { name: 'milk', quantity: 1 },
      { name: 'bread', quantity: 2 }
    ]);
    
    console.log(results);
    
    await heb.shutdown();
    
  } finally {
    await framework.shutdown();
  }
}

buildCart();
```

## Using the Job Queue

For batch operations or background tasks:

```javascript
const { Framework, JobPriority } = require('./lib/automation-framework');

const framework = new Framework();
await framework.initialize();

// Queue a cart building job
const job = framework.queueJob('heb:cart', {
  items: [
    { name: 'milk', quantity: 1 },
    { name: 'bread', quantity: 2 }
  ],
  credentials: {
    email: process.env.HEB_EMAIL,
    password: process.env.HEB_PASSWORD
  }
}, {
  priority: JobPriority.HIGH
});

// Wait for completion
const result = await framework.waitForJob(job.id);
console.log('Job completed:', result);

await framework.shutdown();
```

## Facebook Migration

### Before:
```javascript
const { FacebookAutomation } = require('./dinner-automation/browser');
const fb = new FacebookAutomation({ headless: false });
await fb.initialize();
await fb.searchMarketplace('vintage furniture');
```

### After:
```javascript
const { Framework } = require('./lib/automation-framework');
const framework = new Framework();
await framework.initialize();

const fb = framework.createPlugin('facebook', { headless: false });
await fb.initialize();
await fb.searchMarketplace('vintage furniture');
```

## Custom Script Migration

For scripts using `StealthBrowser` directly:

### Before:
```javascript
const { StealthBrowser } = require('./dinner-automation/browser/src/StealthBrowser');

const browser = new StealthBrowser({ profile: 'custom' });
await browser.launch();
await browser.navigate('https://example.com');
await browser.click('#button');
await browser.close();
```

### After:
```javascript
const { Framework } = require('./lib/automation-framework');

const framework = new Framework();
await framework.initialize();

// Use browser pool directly
const browser = await framework.browserPool.acquire('custom', {
  headless: false
});

const { AntiBot } = require('./lib/automation-framework');
const antiBot = new AntiBot();

await browser.page.goto('https://example.com');
await antiBot.humanClick(browser.page, '#button');

await framework.browserPool.release(browser.id);
await framework.shutdown();
```

## Configuration Migration

### Retry Configuration

**Before:**
```javascript
const automation = new HEBAutomation({
  maxRetries: 3,
  retryDelay: 5000
});
```

**After:**
```javascript
const heb = framework.createPlugin('heb', {
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000
  }
});

// Or register custom policy
heb.retryManager.registerPolicy('custom', {
  maxRetries: 5,
  baseDelay: 2000
});
```

### Anti-Bot Configuration

**Before:**
```javascript
const browser = new StealthBrowser({
  slowMo: 100
});
```

**After:**
```javascript
const heb = framework.createPlugin('heb', {
  slowMo: 100,
  antiBot: {
    delays: {
      minActionDelay: 500,
      maxActionDelay: 2000
    },
    mouse: {
      enableHumanMovement: true
    }
  }
});
```

## Common Issues and Solutions

### Issue: Browser not connecting
**Solution:** Ensure CDP port is correct and browser is running with `--remote-debugging-port`

### Issue: Profile data not persisting
**Solution:** Framework uses `profilesDir` option. Ensure the directory exists.

### Issue: Timeouts increased
**Solution:** The new framework has more conservative defaults. Adjust `slowMo` and delay settings.

### Issue: Memory usage
**Solution:** The framework limits concurrent browsers. Call `plugin.shutdown()` when done.

## Benefits of Migration

1. **Better Resource Management**: Automatic browser pooling and cleanup
2. **Improved Reliability**: Built-in retry and circuit breaker patterns
3. **Consistent Logging**: Centralized logging across all plugins
4. **Queue Support**: Background job processing for long-running tasks
5. **Health Monitoring**: Automatic browser health checks and reconnection
6. **Extensibility**: Easier to add new site plugins

## Backward Compatibility

The framework exports compatibility aliases:

```javascript
// These work for backward compatibility
const { HEBAutomation, FacebookAutomation } = require('./lib/automation-framework');
```

However, using the new Framework-based approach is recommended.
