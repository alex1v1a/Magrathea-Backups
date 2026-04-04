# Marvin Automation Framework - Library Modules

This directory contains the shared utility modules for the Marvin Automation Framework.

## Module Overview

### Core Utilities

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `errors.js` | Error handling | `MarvinError`, `NetworkError`, `ConfigError`, etc. |
| `file-utils.js` | File operations | `ensureDir`, `readJsonSafe`, `writeJsonSafe` |
| `date-utils.js` | Date/time handling | `formatDate`, `parseDate`, `addTime` |
| `email-utils.js` | Email operations | `sendEmail`, `sendTemplateEmail` |
| `browser-helpers.js` | Browser automation | `waitForElement`, `safeClick`, `connectToChrome` |
| `retry-manager.js` | Retry patterns | `CircuitBreaker`, `retryWithBackoff` |
| `logger.js` | Structured logging | `MarvinLogger`, `logger` |

### Quick Start

```javascript
// Import everything
const { sendEmail, formatDate, logger } = require('./lib');

// Import specific modules
const { ConfigError, NetworkError } = require('./lib/errors');
const { readJsonSafe, writeJsonSafe } = require('./lib/file-utils');
```

## Module Details

### errors.js
Standardized error classes with metadata and retryability flags.

```javascript
const { ConfigError, isRetryableError } = require('./lib/errors');

throw new ConfigError('Missing config', 'CONFIG_MISSING');
```

### file-utils.js
Safe file operations with atomic writes and validation.

```javascript
const { ensureDir, readJsonSafe, writeJsonSafe } = require('./lib/file-utils');

ensureDir('./data');
const config = readJsonSafe('./config.json', { defaultValue: {} });
writeJsonSafe('./output.json', data);
```

### date-utils.js
Date formatting, parsing, and manipulation.

```javascript
const { formatDate, addTime, relativeTime } = require('./lib/date-utils');

formatDate(new Date(), 'FILENAME'); // '2024-02-13_10-30-00'
relativeTime(addTime(new Date(), -2, 'hours')); // '2 hours ago'
```

### email-utils.js
Unified email sending with templates and tracking.

```javascript
const { sendEmail, sendTemplateEmail } = require('./lib/email-utils');

await sendTemplateEmail('dinner-plan', { day, meal, ingredients }, { to, credentials });
```

### browser-helpers.js
Common browser automation patterns.

```javascript
const { waitForElement, safeClick, connectToChrome } = require('./lib/browser-helpers');

const browser = await connectToChrome(chromium, { port: 9222 });
await safeClick(page, '#submit');
```

## Legacy Modules

The following modules exist for backward compatibility:
- `utils.js` - General utilities (being migrated to specific modules)
- `browser-utils.js` - Browser utilities (being migrated to `browser-helpers.js`)

New code should use the specific modules listed above.

## CLI Usage

```bash
# Show help
node lib/index.js help

# Run HEB automation
node lib/index.js heb

# Run Facebook automation
node lib/index.js facebook

# Show system status
node lib/index.js status

# List all utilities
node lib/index.js utils
```

## Examples

See `examples.js` for usage examples of all utilities.

```javascript
const examples = require('./lib/examples');

// Run examples
examples.exampleDateUtilities();
await examples.exampleEmail();
```

## Configuration

Configuration is managed through the `config/` directory:

```javascript
const config = require('./config');
const cfg = config.getConfig();

const port = config.get(cfg, 'browser.debugPort', 9222);
```

## Style Guide

See `docs/STYLE-GUIDE.md` for coding standards.

---

**Version**: 2.1.0  
**Last Updated**: 2026-02-13
