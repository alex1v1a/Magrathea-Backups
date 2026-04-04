# Automation Test Suite

Test suite for the Marvin Automation Framework.

## Quick Start

```bash
# Run all tests
node tests/runner.js

# Run smoke tests only (fast, critical paths)
node tests/runner.js --smoke

# Run specific test file
node tests/integration/smoke.test.js
```

## Test Structure

```
tests/
├── runner.js              # Main test runner
├── helpers.js             # Test utilities
├── README.md              # This file
│
├── unit/                  # Unit tests
│   └── (module-specific tests)
│
├── integration/           # Integration tests
│   └── smoke.test.js      # Critical path tests
│
├── mocks/                 # Mock implementations
│   └── cdp-server.js      # Mock CDP server/client
│
└── fixtures/              # Test data
    └── (JSON fixtures)
```

## Test Types

### Smoke Tests
Quick tests to verify critical functionality:
- Library exports are correct
- Error classes work properly
- Configuration validation works
- Retry logic functions correctly

Run: `node tests/runner.js --smoke`

### Unit Tests
Tests for individual functions/modules:
- Delay utilities
- Selector helpers
- Logger functionality
- Config validation

Run: `node tests/runner.js --unit`

### Integration Tests
Tests for component interactions:
- CDP connection flow
- Error recovery patterns
- Retry with circuit breaker
- Full automation workflows

Run: `node tests/runner.js --integration`

## Writing Tests

### Basic Test Structure

```javascript
const { createMockLogger, assertThrows } = require('../helpers');
const { myFunction } = require('../../../lib/my-module');

test('description of what is being tested', async () => {
  // Setup
  const logger = createMockLogger();
  
  // Execute
  const result = await myFunction({ logger });
  
  // Assert
  assert.strictEqual(result, expectedValue);
  assert(logger.hasMessage(/success/));
});
```

### Using Mocks

```javascript
const { createTestEnv, createMockPage } = require('../helpers');

// Mock CDP environment
const { server, client, setup, teardown } = createTestEnv();
await setup();

// Mock page
const page = createMockPage({
  '#submit': { visible: true, text: 'Submit' }
});

// Cleanup
await teardown();
```

### Testing with Delays

```javascript
const { createMockDelay } = require('../helpers');

const mockDelay = createMockDelay();

// Replace delay in module
const module = proxyquire('../lib/module', {
  './utils': { delay: mockDelay.fn }
});

// Control delays in tests
mockDelay.resolveAll(); // Resolve all pending delays
mockDelay.resolveNext(); // Resolve one delay
```

## Test Helpers

### createMockLogger()
Creates a logger that captures all log entries for assertions.

```javascript
const logger = createMockLogger();
logger.info('test message', { foo: 'bar' });

logger.getEntries(); // Get all entries
logger.getEntriesByLevel('error'); // Get error entries
logger.hasMessage(/test/); // Check for message pattern
```

### createMockPage(elements)
Creates a mock Playwright page for testing.

```javascript
const page = createMockPage({
  '#button': { visible: true, clicked: false },
  '#input': { value: '', visible: true }
});

await page.click('#button');
await page.type('#input', 'text');
```

### createTestEnv(options)
Creates mock CDP server and client.

```javascript
const { server, client, setup, teardown } = createTestEnv({
  port: 9222,
  targets: [{ id: 'page-1', type: 'page' }]
});

await setup();
// ... run tests ...
await teardown();
```

### assertThrows(fn, pattern)
Asserts that a function throws an error matching pattern.

```javascript
await assertThrows(
  () => riskyOperation(),
  /expected error message/
);
```

### waitFor(condition, timeout, interval)
Waits for a condition to become true.

```javascript
const success = await waitFor(
  () => element.isVisible(),
  5000,  // timeout
  100    // check interval
);
```

## Fixtures

Test data is stored in `tests/fixtures/` as JSON files.

```javascript
const { loadFixture } = require('../helpers');

const cartData = loadFixture('cart-items');
```

## CI/CD Integration

Tests return exit code 0 on success, 1 on failure:

```bash
# In CI pipeline
node tests/runner.js --smoke || exit 1
```

## Adding New Tests

1. Create test file in appropriate directory (`unit/` or `integration/`)
2. Name file with `.test.js` suffix
3. Import helpers from `../helpers`
4. Use `test()` function to define tests
5. Run with `node tests/runner.js`

## Troubleshooting

**Tests timeout:**
- Check if mock delays need to be resolved
- Increase timeout in runner.js

**Module not found:**
- Verify relative paths from test file location
- Check that module exports are correct

**Flaky tests:**
- Add retries for network-dependent tests
- Use deterministic mocks instead of random data
