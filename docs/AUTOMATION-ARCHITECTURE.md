# Automation Architecture Documentation

## Overview

The Marvin Automation Framework provides a unified, maintainable approach to browser automation for HEB grocery shopping and Facebook Marketplace management. This document describes the architecture, key components, and best practices.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTOMATION FRAMEWORK                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   AUTOMATION    │    │   AUTOMATION    │    │    CONFIG       │     │
│  │      TASKS      │    │     PLUGINS     │    │   MANAGEMENT    │     │
│  │                 │    │                 │    │                 │     │
│  │  • HEB Cart     │    │  • HEBPlugin    │    │  • Schema       │     │
│  │  • FB Share     │    │  • FBPlugin     │    │  • Validation   │     │
│  │  • Email Check  │    │                 │    │  • Secrets      │     │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
│           │                      │                      │              │
│           └──────────────────────┼──────────────────────┘              │
│                                  │                                     │
│                         ┌────────▼────────┐                           │
│                         │  SHARED UTILS   │                           │
│                         │   LIBRARY       │                           │
│                         │                 │                           │
│                         │ • Retry Logic   │                           │
│                         │ • CDP Manager   │                           │
│                         │ • Human Delays  │                           │
│                         │ • Selectors     │                           │
│                         │ • Logging       │                           │
│                         └────────┬────────┘                           │
│                                  │                                     │
│           ┌──────────────────────┼──────────────────────┐             │
│           │                      │                      │             │
│    ┌──────▼──────┐      ┌────────▼────────┐    ┌──────▼──────┐       │
│    │   BROWSER   │      │  ERROR HANDLING │    │   TESTING   │       │
│    │    POOL     │      │                 │    │             │       │
│    │             │      │ • Error Classes │    │ • Mocks     │       │
│    │ • Chrome    │      │ • Screenshots   │    │ • Helpers   │       │
│    │ • Edge      │      │ • Recovery      │    │ • Fixtures  │       │
│    │ • CDP Conn  │      │ • Circuit Break │    │ • Smoke     │       │
│    └──────┬──────┘      └─────────────────┘    └─────────────┘       │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      BROWSER INSTANCES                           │  │
│  │                                                                  │  │
│  │   ┌─────────────────┐        ┌─────────────────┐                │  │
│  │   │  Microsoft Edge │        │  Google Chrome  │                │  │
│  │   │  (Port 9222)    │        │  (Port 18800)   │                │  │
│  │   │                 │        │                 │                │  │
│  │   │ • HEB Only      │        │ • Facebook Only │                │  │
│  │   │ • Clean Profile │        │ • User Profile  │                │  │
│  │   │ • Extensions    │        │ • Persistent    │                │  │
│  │   └─────────────────┘        └─────────────────┘                │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Shared Utilities Library (`lib/automation-utils.js`)

The central utility library providing common functionality across all automation tasks.

#### Key Features:
- **Retry Logic**: Exponential backoff with jitter, circuit breaker pattern
- **CDP Management**: Connection pooling, health checks, automatic reconnection
- **Human Delays**: Realistic timing patterns to avoid bot detection
- **Site Selectors**: Centralized CSS selectors for HEB and Facebook
- **Structured Logging**: Timestamped, leveled logging to console and files

#### Usage:
```javascript
const {
  withRetry,
  CDPManager,
  humanDelay,
  SELECTORS,
  createLogger
} = require('./lib/automation-utils');

const logger = createLogger({ name: 'my-task', level: 'debug' });

const cdp = new CDPManager({ port: 9222, logger });
await cdp.connect();

await withRetry(async () => {
  await page.click(SELECTORS.heb.addToCartBtn);
}, { maxAttempts: 3 });
```

### 2. Error Handling (`lib/error-handling.js`)

Comprehensive error handling with automatic screenshots and recovery strategies.

#### Error Classes:
- `AutomationError`: Base error with context and screenshots
- `NetworkError`: Retryable network failures
- `SelectorError`: Element not found errors
- `AuthError`: Authentication failures
- `TimeoutError`: Operation timeouts
- `ConfigError`: Configuration issues

#### Features:
```javascript
const {
  AutomationError,
  withScreenshotOnError,
  ErrorRecovery
} = require('./lib/error-handling');

// Wrap operations with automatic screenshots
const result = await withScreenshotOnError(page, async () => {
  await riskyOperation();
});

// Use recovery strategies
const recovery = new ErrorRecovery();
const success = await recovery.recover(error, { page, selector });
```

### 3. Configuration Management (`lib/config-validator.js`)

Schema-based configuration validation with security auditing.

#### Features:
- JSON Schema validation
- Default value application
- Hardcoded secrets detection
- Environment variable support

#### Configuration Hierarchy:
1. Default values (from schema)
2. Environment-specific config (`config/{env}.json`)
3. Local overrides (`config/local.json`)
4. Secrets (`.secrets/*.json`)
5. Environment variables

### 4. Browser Architecture

#### Dual Browser Strategy:

| Chrome (Facebook) | Edge (HEB) |
|-------------------|------------|
| Profile for FB only | Clean profile for HEB |
| Port 18800 | Port 9222 |
| Persistent login | No HEB bot detection |
| alex@xspqr.com | alex@1v1a.com |

#### CDP Connection Flow:
```
Script → CDPManager → connectOverCDP → Browser Instance
            ↓
      Health Check Loop
            ↓
      Auto-reconnect on failure
```

### 5. Anti-Bot Detection

Human-like behavior patterns to avoid detection:

```javascript
// Timing patterns
humanDelay('type')    // 30-120ms between keystrokes
humanDelay('click')   // 200-800ms before/after clicks
humanDelay('navigate') // 2-5s page load waits
humanDelay('think')   // 0.8-2.5s between actions

// Random "distraction" pauses (10% chance)
// Batch processing with pauses
// Mouse movement simulation (future)
```

## Directory Structure

```
.
├── lib/                          # Shared libraries
│   ├── automation-utils.js       # Core utilities
│   ├── error-handling.js         # Error classes & recovery
│   ├── config-validator.js       # Config schema & validation
│   ├── browser-helpers.js        # Browser interaction helpers
│   ├── retry-manager.js          # Circuit breaker & retry
│   ├── logger.js                 # Logging utility
│   └── index.js                  # Unified exports
│
├── config/                       # Configuration files
│   ├── default.json              # Default settings
│   ├── development.json          # Dev overrides
│   ├── production.json           # Prod settings
│   └── local.json                # Local overrides (gitignored)
│
├── .secrets/                     # Sensitive data (gitignored)
│   ├── heb-credentials.json
│   ├── facebook-credentials.json
│   └── icloud-credentials.json
│
├── dinner-automation/            # Automation scripts
│   ├── scripts/                  # Task scripts
│   ├── browser/                  # CDP-based automation
│   └── data/                     # Data files
│
├── tests/                        # Test suite
│   ├── integration/              # Integration tests
│   ├── unit/                     # Unit tests
│   ├── mocks/                    # Mock implementations
│   └── fixtures/                 # Test data
│
├── docs/                         # Documentation
│   └── AUTOMATION-ARCHITECTURE.md
│
└── logs/                         # Runtime logs (gitignored)
    └── screenshots/              # Error screenshots
```

## Best Practices

### 1. Always Use Shared Utilities

**Don't:**
```javascript
// Anti-pattern: Hardcoded delays
await page.waitForTimeout(2000);
```

**Do:**
```javascript
// Pattern: Human-like delays
const { humanDelay } = require('./lib/automation-utils');
await humanDelay('navigate');
```

### 2. Handle Errors Gracefully

**Don't:**
```javascript
try {
  await page.click('#button');
} catch (e) {
  console.log('Failed');
}
```

**Do:**
```javascript
const { withScreenshotOnError, ErrorRecovery } = require('./lib/error-handling');

await withScreenshotOnError(page, async () => {
  await page.click('#button');
}, { errorCode: 'CLICK_FAILED' });
```

### 3. Never Hardcode Secrets

**Don't:**
```javascript
const password = 'mySecret123';
```

**Do:**
```javascript
const config = require('./config');
const password = config.heb.credentials.password; // From .secrets/
```

### 4. Use Retry for Network Operations

```javascript
const { withRetry } = require('./lib/automation-utils');

await withRetry(async () => {
  await page.goto(url);
}, { maxAttempts: 3, baseDelay: 2000 });
```

### 5. Log Structured Data

```javascript
const { createLogger } = require('./lib/automation-utils');
const logger = createLogger({ name: 'task' });

logger.info('Adding item to cart', { itemId, quantity });
logger.error('Failed to add item', { itemId, error: err.message });
```

## Testing Strategy

### Unit Tests
- Test utility functions in isolation
- Mock CDP connections
- Validate configuration schemas

### Integration Tests
- Test full automation flows
- Use test browser instances
- Verify error recovery

### Smoke Tests
- Quick health checks for critical paths
- Verify CDP connections
- Check config validation

## Security Considerations

1. **Secrets Management**: All credentials stored in `.secrets/` (gitignored)
2. **Config Validation**: Schema validation prevents misconfiguration
3. **Screenshot Sanitization**: Automatic screenshot capture on errors
4. **No Hardcoded Values**: Environment-based configuration

## Troubleshooting

### Common Issues:

**CDP Connection Failed:**
```bash
# Check if browser is running with debug port
# Chrome: --remote-debugging-port=18800
# Edge: --remote-debugging-port=9222
```

**Element Not Found:**
- Use retry with backoff
- Check if selector needs updating in `SELECTORS`
- Verify page is fully loaded

**Bot Detection:**
- Increase delays in `antiBot` config
- Use human-like typing
- Randomize action timing

## Future Enhancements

1. **Playwright Integration**: Migrate from CDP to Playwright for better stability
2. **Visual Testing**: Add visual regression tests
3. **Metrics Collection**: Track success rates and timing
4. **Dashboard**: Real-time automation status

## Contributing

When adding new automation tasks:
1. Use shared utilities from `lib/`
2. Add tests in `tests/`
3. Update this documentation
4. Follow error handling patterns
5. Never commit secrets
