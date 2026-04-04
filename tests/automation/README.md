# Browser Automation Test Suite

Comprehensive test suite for browser automation with CDP (Chrome DevTools Protocol), including anti-bot testing, visual regression, performance benchmarks, and error injection.

## Structure

```
tests/automation/
├── mocks/
│   ├── cdp-server.js          # Mock CDP server for testing without real browser
│   └── cdp-client.js          # CDP client wrapper
├── unit/
│   └── anti-bot.test.js       # Tests for delays, scrolls, mouse movements, stealth
├── integration/
│   ├── heb-flow.test.js       # Full HEB automation flow tests
│   └── error-injection.test.js # Network failure and timeout tests
├── benchmarks/
│   └── speed.test.js          # Performance benchmarks
└── README.md                  # This file
```

## Installation

```bash
# Install dependencies
npm install

# Or with yarn
yarn install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Benchmarks only
npm run test:benchmarks

# Watch mode for development
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Run Individual Test Files

```bash
# Anti-bot tests
npx vitest run tests/automation/unit/anti-bot.test.js

# HEB flow tests
npx vitest run tests/automation/integration/heb-flow.test.js

# Error injection tests
npx vitest run tests/automation/integration/error-injection.test.js

# Speed benchmarks
npx vitest run tests/automation/benchmarks/speed.test.js
```

## Test Categories

### 1. Anti-Bot Tests (`unit/anti-bot.test.js`)

Tests for anti-detection techniques:

- **HumanBehaviorSimulator**
  - Random delay generation
  - Human-like typing simulation
  - Scroll pattern generation
  - Mouse path generation with bezier curves
  
- **StealthUtils**
  - Webdriver property hiding
  - Plugin mocking
  - WebGL vendor spoofing
  - Canvas fingerprint randomization
  
- **TimingUtils**
  - Jitter application
  - Exponential backoff
  - Retry logic
  
- **MouseUtils**
  - Bezier curve calculations
  - Control point generation
  - Position noise addition
  
- **ScrollUtils**
  - Natural scroll delta generation
  - Momentum simulation
  - Duration calculation

### 2. HEB Flow Tests (`integration/heb-flow.test.js`)

Full integration tests for HEB automation:

- **Connection & Setup**
  - CDP connection
  - Domain enabling
  - Navigation
  - Stealth script injection
  
- **Search Flow**
  - Search box finding
  - Query typing with delays
  - Results waiting
  - Scrolling
  
- **Add to Cart**
  - Button finding
  - Human-like clicking
  - Cart verification
  - Out-of-stock handling
  
- **Multiple Items**
  - Batch adding
  - Substitution handling
  - Pause between items
  
- **Cart Verification**
  - Cart navigation
  - Item counting
  - Content verification
  
- **Error Recovery**
  - Timeout retry
  - CAPTCHA detection
  - Session expiration
  
- **Full E2E Flow**
  - Complete shopping flow
  - Duration measurement

### 3. Error Injection Tests (`integration/error-injection.test.js`)

Tests for error handling and recovery:

- **Connection Errors**
  - Connection refused
  - Connection timeout
  - Server disconnect
  
- **CDP Command Errors**
  - Unknown methods
  - Invalid parameters
  - Domain not enabled
  
- **Random Error Injection**
  - 10% error rate
  - 50% error rate with retry
  - 100% error rate
  
- **Network Failures**
  - Navigation timeout
  - Stalled responses
  - Intermittent errors
  
- **Target Management**
  - Invalid target ID
  - Target closed
  - Rapid create/destroy
  
- **Resource Exhaustion**
  - Excessive pending commands
  - Memory pressure
  
- **Recovery Strategies**
  - Transient error retry
  - Reconnection
  - Graceful degradation
  
- **Timeout Configurations**
  - Custom timeouts
  - Command cancellation

### 4. Performance Benchmarks (`benchmarks/speed.test.js`)

Performance tests with thresholds:

| Operation | Target Time |
|-----------|-------------|
| CDP Connection | < 100ms |
| Enable Domain | < 50ms |
| Page Navigation | < 500ms |
| DOM Query | < 50ms |
| JS Evaluation (simple) | < 20ms |
| Screenshot | < 200ms |
| Mouse Event | < 20ms |
| Full Click | < 100ms |
| 100 DOM Queries | < 2s |
| 50 JS Evaluations | < 1s |

## Mock CDP Server

The `MockCDPServer` simulates Chrome DevTools Protocol without requiring a real browser:

### Features

- WebSocket and HTTP endpoints
- Target management
- CDP command handling
- Configurable delays and error rates
- Event simulation
- Custom command handlers

### Usage

```javascript
const { MockCDPServer } = require('./mocks/cdp-server');

// Create server with options
const server = new MockCDPServer({
  port: 9222,
  delay: 50,        // Add 50ms delay to each command
  errorRate: 0.1    // 10% chance of random error
});

await server.start();

// Create a target
const target = server.createTarget(
  'https://www.heb.com',
  'HEB Page',
  'page'
);

// Add custom handler
server.onCommand('Runtime.evaluate', (params) => {
  return { result: { type: 'string', value: 'custom' } };
});

// Simulate element
server.addElement('button', { 'data-testid': 'add' }, 'Add to Cart');

// Clean up
await server.stop();
```

## CDP Client

The `CDPClient` provides a simplified interface to CDP:

```javascript
const { CDPClient } = require('./mocks/cdp-client');

const client = new CDPClient({ port: 9222 });
await client.connect();

// Enable domains
await client.enableDomain('Page');
await client.enableDomain('DOM');

// Navigate
await client.navigate('https://www.heb.com');

// Evaluate JS
const result = await client.evaluate('document.title');

// Query DOM
const element = await client.querySelector('button');

// Click
await client.click(500, 300);

// Type
await client.type('hello world', { delay: 50 });

// Screenshot
const screenshot = await client.screenshot();

// Clean up
await client.disconnect();
```

## Writing New Tests

### Unit Test Example

```javascript
const { describe, it, expect } = require('vitest');

describe('My Feature', () => {
  it('should do something', async () => {
    const result = await myFunction();
    expect(result).toBe(true);
  });
});
```

### Integration Test with Mock Server

```javascript
const { describe, it, beforeAll, afterAll } = require('vitest');
const { MockCDPServer } = require('../mocks/cdp-server');
const { CDPClient } = require('../mocks/cdp-client');

describe('My Integration Test', () => {
  let server;
  let client;

  beforeAll(async () => {
    server = new MockCDPServer({ port: 9999 });
    await server.start();
    server.createTarget('https://test.com', 'Test');
  });

  afterAll(async () => {
    if (client) await client.disconnect();
    if (server) await server.stop();
  });

  it('should test something', async () => {
    client = new CDPClient({ port: 9999 });
    await client.connect();
    
    const result = await client.evaluate('1 + 1');
    expect(result.value).toBe(2);
  });
});
```

## Continuous Integration

Run tests in CI with coverage:

```bash
# Run all tests with coverage
npx vitest run --coverage

# Run with specific reporter
npx vitest run --reporter=json > test-results.json
```

## Troubleshooting

### Port Already in Use

If you see "Port already in use", change the port in your test:

```javascript
const server = new MockCDPServer({ port: 9999 }); // Try different ports
```

### Tests Hanging

Add timeout to your tests:

```javascript
it('should do something', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Mock Server Not Responding

Ensure you're awaiting all async operations:

```javascript
await server.start();  // Don't forget await!
```

## License

MIT
