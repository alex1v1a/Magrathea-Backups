# Marvin Automation Framework v2.0

## Overview

Unified automation framework for all browser-based tasks. Built to replace scattered scripts with a maintainable, extensible system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Automation Tasks                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ HEB Plugin   │  │ Facebook     │  │ Your Plugin Here │  │
│  │              │  │ Plugin       │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼──────────────────┼───────────────────┼───────────┘
          │                  │                   │
          └──────────────────┼───────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │    AutomationTask Base       │
              │  • Logging  • Metrics        │
              │  • Retry    • Browser Mgmt   │
              └──────────────┬───────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
  ┌────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Browser    │    │ Anti-Bot     │    │ Retry        │
  │ Pool       │    │ Advanced     │    │ Manager      │
  │            │    │              │    │              │
  │ • CDP conn │    │ • Gaussian   │    │ • Exponential│
  │ • Health   │    │   delays     │    │   backoff    │
  │ • Recovery │    │ • Mouse sim  │    │ • Circuit    │
  └────────────┘    │ • Stealth    │    │   breaker    │
                    └──────────────┘    └──────────────┘
```

## Core Components

### 1. Browser Pool (`lib/browser-pool.js`)
- **Connection pooling**: Manages multiple CDP connections
- **Health monitoring**: Automatic recovery from failed connections
- **Site isolation**: Separate pools per site if needed
- **Wait queue**: Queue requests when all connections busy

### 2. Anti-Bot Advanced (`lib/anti-bot-advanced.js`)
- **Gaussian delays**: Bell-curve randomization (more human than uniform)
- **Mouse simulation**: Bezier curve movement paths
- **Typing simulation**: Variable speed with occasional "typos"
- **Stealth patches**: Removes `navigator.webdriver` and other automation flags
- **Session warmup**: Natural browsing before automation

### 3. Retry Manager (`lib/retry-manager.js`)
- **Exponential backoff**: Smart delays between retries
- **Circuit breaker**: Prevents cascading failures
- **Bulkhead pattern**: Limits concurrent operations
- **Error filtering**: Retry only specific error types

### 4. Automation Task Base (`lib/automation-task.js`)
All automation tasks extend this class:
```javascript
class MyTask extends AutomationTask {
  constructor() {
    super({ name: 'MyTask', site: 'example' });
  }
  
  async run() {
    const browser = await this.getBrowser();
    // Your automation logic
    this.releaseBrowser(browser);
  }
}
```

### 5. Metrics (`lib/metrics.js`)
- **Performance tracking**: Duration, success rate per task
- **Structured logging**: JSON lines for analysis
- **Time-series data**: Query by time period

### 6. Config (`lib/config.js`)
- **Centralized config**: All settings in one place
- **Environment overrides**: Environment variable support
- **Secrets management**: Separate from main config

## Plugins

### HEB Plugin (`lib/plugins/heb-plugin.js`)
Features:
- Automatic item loading from `heb-extension-items.json`
- Per-item cart verification
- Multiple button detection strategies
- Configurable delays and batch processing

Usage:
```bash
node lib/plugins/heb-plugin.js
```

### Facebook Plugin (`lib/plugins/facebook-plugin.js`)
Features:
- Login verification
- Message checking with unread alerts
- Listing sharing to groups

Usage:
```bash
# Check messages
node lib/plugins/facebook-plugin.js messages

# Share listings
node lib/plugins/facebook-plugin.js share
```

## Migration Guide

### From Old Scripts

**Old way (scattered, no reuse):**
```javascript
const { chromium } = require('playwright');
// Each script duplicates connection, retry, logging logic
```

**New way (unified framework):**
```javascript
const { HEBPlugin } = require('./lib/plugins/heb-plugin');
const task = new HEBPlugin();
await task.execute(); // Handles everything
```

### Step-by-Step Migration

1. **Identify the task** - What site? What action?
2. **Extend base class** - Create plugin extending `AutomationTask`
3. **Implement `run()`** - Put your automation logic here
4. **Use helpers** - `this.getBrowser()`, `this.withRetry()`, etc.
5. **Test** - Run with `node lib/plugins/your-plugin.js`

## Configuration

Create `config/local.json`:
```json
{
  "browser": {
    "debugPort": 9222,
    "headless": false
  },
  "antiBot": {
    "minDelay": 3000,
    "maxDelay": 8000
  }
}
```

Create `.secrets/config-secrets.json`:
```json
{
  "email": {
    "smtp": {
      "password": "your-app-specific-password"
    }
  }
}
```

## Anti-Bot Techniques Applied

### 1. Gaussian Delays
Uniform random delays are detectable. We use bell-curve distribution:
```javascript
await gaussianDelay(3000, 1000); // mean=3s, stddev=1s
```

### 2. Mouse Movement
Human mouse paths follow curves, not straight lines:
```javascript
await humanLikeMove(page, 'button');
```

### 3. Typing Simulation
Variable speed, occasional pauses:
```javascript
await humanLikeType(page, '#input', 'search term');
```

### 4. Stealth Patches
Removes automation fingerprints:
```javascript
await applyStealthPatches(page);
```

## Performance Metrics

View metrics:
```bash
node lib/metrics.js 24  # Last 24 hours
```

Output:
```
📊 AUTOMATION METRICS REPORT
============================================================
Period: Last 24 hours
Generated: 2/12/2026, 5:15:00 AM
============================================================

🟢 HEBCart
   Total runs: 5
   Success: 5 (100%)
   Failed: 0
   Avg duration: 18m 42s

🟡 FacebookMarketplace
   Total runs: 12
   Success: 10 (83%)
   Failed: 2
   Avg duration: 2m 15s
```

## Best Practices

1. **Always use the base class** - Don't write raw Playwright
2. **Verify actions** - Check cart count, page state
3. **Handle failures gracefully** - Record failures, continue batch
4. **Use appropriate delays** - Match human behavior for site
5. **Log everything** - Use `this.logger.info/debug/error`
6. **Test thoroughly** - Run against test environments first

## Future Enhancements

- [ ] Visual regression testing
- [ ] AI-powered element detection
- [ ] Automatic CAPTCHA solving
- [ ] Distributed execution across multiple browsers
- [ ] Real-time dashboard for monitoring

## Files Created

```
lib/
├── metrics.js              # Performance tracking
├── config.js               # Configuration management
├── anti-bot-advanced.js    # Advanced evasion techniques
├── retry-manager.js        # Retry with circuit breaker
├── browser-pool.js         # Connection pooling
├── logger.js               # Structured logging
├── automation-task.js      # Base class
└── plugins/
    ├── heb-plugin.js       # HEB automation
    └── facebook-plugin.js  # Facebook automation
```

## Credits

Framework built during 8-hour self-improvement sprint (Feb 11-12, 2026) based on:
- 2025 anti-bot research
- Production lessons from HEB automation
- Best practices from ScrapeOps, Scrapeless, BrightData
