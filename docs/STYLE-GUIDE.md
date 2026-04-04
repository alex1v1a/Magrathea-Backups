# Marvin Code Style Guide

This document defines coding standards and best practices for the Marvin Automation Framework.

## Table of Contents

1. [General Principles](#general-principles)
2. [Naming Conventions](#naming-conventions)
3. [Documentation](#documentation)
4. [Error Handling](#error-handling)
5. [File Organization](#file-organization)
6. [Async/Await Patterns](#asyncawait-patterns)
7. [Testing](#testing)

## General Principles

### DRY (Don't Repeat Yourself)
- Extract common functionality into shared utilities in `lib/`
- Use existing utility functions before writing new ones
- Refactor duplication when discovered

### Single Responsibility
- Each module/function should do one thing well
- Keep functions under 50 lines when possible
- Split complex operations into smaller, testable units

### Fail Fast
- Validate inputs early
- Throw meaningful errors
- Use the custom error classes from `lib/errors.js`

## Naming Conventions

### Files
- **JavaScript**: `kebab-case.js` (e.g., `email-utils.js`)
- **Configuration**: `default.json`, `production.json`
- **Tests**: `*.test.js` or `*.spec.js`
- **Documentation**: `UPPERCASE.md` for important docs

### Variables & Functions
```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;

// Variables: camelCase
let userName = 'alex';
const emailConfig = {};

// Functions: camelCase, action verbs
async function sendEmail() { }
function formatDate() { }
function isValidInput() { }

// Boolean functions: is/has/should prefix
function isRetryableError() { }
function hasPermission() { }
function shouldRetry() { }

// Private functions: underscore prefix (convention only)
function _internalHelper() { }
```

### Classes
```javascript
// PascalCase for class names
class MarvinError extends Error { }
class EmailClient { }
class BrowserPool { }

// Acronyms: Treat as words
class HEBPlugin { }  // Not HEBPlugin
class ImapClient { } // Not IMAPClient
```

## Documentation

### JSDoc Requirements
Every public function, class, and module must have JSDoc comments:

```javascript
/**
 * Brief description of what the function does.
 * 
 * @param {string} param1 - Description of param1
 * @param {number} [param2=42] - Optional param with default
 * @param {Object} options - Options object
 * @param {boolean} options.force - Whether to force the operation
 * @returns {Promise<Object>} Description of return value
 * @throws {ConfigError} When configuration is invalid
 * 
 * @example
 * const result = await myFunction('input', { force: true });
 * console.log(result.data);
 */
```

### Module Headers
Every file should have a module header:

```javascript
/**
 * @fileoverview Brief description of the module's purpose
 * @module lib/module-name
 * @author Marvin Automation Framework
 * @license MIT
 */
```

### Inline Comments
- Explain WHY, not WHAT (code should be self-documenting)
- Use `//` for single-line comments
- Use `/* */` for multi-line comments only when needed
- Mark TODOs clearly: `// TODO: Description of work needed`

## Error Handling

### Use Custom Error Classes
Always use error classes from `lib/errors.js`:

```javascript
const { MarvinError, ConfigError, NetworkError, TimeoutError } = require('./errors');

// Good
if (!config.host) {
  throw new ConfigError(
    'SMTP host is required',
    'SMTP_CONFIG_MISSING',
    { metadata: { configKeys: Object.keys(config) } }
  );
}

// Bad
if (!config.host) {
  throw new Error('Missing host');
}
```

### Always Include Error Codes
Error codes follow the pattern: `COMPONENT_ERROR_TYPE`

Examples:
- `EMAIL_SEND_FAILED`
- `BROWSER_CONNECTION_FAILED`
- `CONFIG_VALIDATION_FAILED`
- `TIMEOUT_NAVIGATION`

### Wrap External Errors
Wrap errors from external libraries with context:

```javascript
try {
  await externalLibrary.call();
} catch (error) {
  throw new NetworkError(
    'External service call failed',
    'SERVICE_CALL_FAILED',
    { cause: error, metadata: { service: 'external' } }
  );
}
```

### Async Error Handling
```javascript
// Always use try/catch in async functions
async function riskyOperation() {
  try {
    const result = await somethingAsync();
    return result;
  } catch (error) {
    logger.error('Operation failed', { error: error.message });
    throw error; // Re-throw or wrap
  }
}

// For fire-and-forget, use catch
fireAndForget().catch(err => 
  logger.error('Background task failed', { error: err.message })
);
```

## File Organization

### Directory Structure
```
lib/
├── index.js              # Main exports
├── errors.js             # Error classes
├── file-utils.js         # File operations
├── date-utils.js         # Date/time utilities
├── email-utils.js        # Email operations
├── browser-helpers.js    # Browser automation helpers
├── browser-pool.js       # Browser connection pooling
├── logger.js             # Logging utility
├── config.js             # Config management
├── retry-manager.js      # Retry patterns
├── metrics.js            # Metrics collection
├── plugins/              # Site-specific plugins
│   ├── heb-plugin.js
│   └── facebook-plugin.js
└── automation-task.js    # Base task class

config/
├── default.json          # Default configuration
├── development.json      # Development overrides
├── production.json       # Production overrides
├── local.json            # Local overrides (gitignored)
└── index.js              # Config loader

scripts/                  # Utility scripts
dinner-automation/scripts/ # Automation scripts
tests/                    # Test files
```

### Import Order
1. Node.js built-ins
2. Third-party packages
3. Local modules (absolute paths)
4. Local modules (relative paths)
5. Types (for TypeScript)

```javascript
// 1. Built-ins
const fs = require('fs');
const path = require('path');

// 2. Third-party
const nodemailer = require('nodemailer');

// 3. Local absolute (from project root)
const { logger } = require('../lib');

// 4. Local relative
const { helper } = require('./helpers');
```

## Async/Await Patterns

### Prefer Async/Await
```javascript
// Good
async function getData() {
  const result = await fetchData();
  return process(result);
}

// Avoid
function getData() {
  return fetchData().then(result => process(result));
}
```

### Parallel Operations
```javascript
// Good - proper parallel execution
const [users, orders, products] = await Promise.all([
  getUsers(),
  getOrders(),
  getProducts()
]);

// Good - with error handling
const results = await Promise.allSettled([
  task1(),
  task2(),
  task3()
]);

// Bad - sequential when parallel possible
const users = await getUsers();
const orders = await getOrders(); // Could run in parallel
```

### Timeout Patterns
```javascript
// Use the timeout utility
const { withTimeout } = require('./utils');

const result = await withTimeout(
  longRunningOperation(),
  5000,
  'Operation timed out'
);
```

## Testing

### Test File Location
- Place tests in `tests/` directory
- Mirror the source structure
- Name: `module-name.test.js`

### Test Structure
```javascript
describe('EmailClient', () => {
  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      // Arrange
      const client = new EmailClient(mockConfig);
      
      // Act
      const result = await client.sendEmail(validEmail);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should throw ConfigError for invalid config', async () => {
      const client = new EmailClient({});
      
      await expect(client.sendEmail(validEmail))
        .rejects
        .toThrow(ConfigError);
    });
  });
});
```

### Mocking
- Mock external services (SMTP, IMAP, HTTP)
- Use dependency injection for testability
- Reset mocks after each test

## Code Review Checklist

Before submitting code:

- [ ] JSDoc comments added for all public APIs
- [ ] Error handling uses custom error classes
- [ ] No hardcoded credentials or secrets
- [ ] Console.log replaced with logger calls
- [ ] Duplication checked - use existing utilities
- [ ] Async/await used instead of callbacks
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed

## Editor Configuration

### VS Code Settings
```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "editor.rulers": [80, 100],
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

### ESLint Rules (Recommended)
```javascript
module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

---

**Last Updated**: 2026-02-13
**Version**: 1.0.0
