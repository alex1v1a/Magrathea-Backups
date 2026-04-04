# Marvin Automation Framework - Testing Strategy

## Overview

This document outlines the testing strategy for the Marvin Automation Framework, covering unit tests, integration tests, benchmarks, and validation procedures.

## Testing Goals

1. **Ensure reliability** - Catch bugs before they reach production
2. **Prevent regressions** - Verify changes don't break existing functionality
3. **Document behavior** - Tests serve as executable documentation
4. **Enable confident refactoring** - Tests provide safety net for improvements
5. **Validate performance** - Ensure optimizations don't degrade performance

## Test Architecture

```
tests/
├── run-tests.js              # Main test runner (entry point)
├── package.json              # Test dependencies
│
├── unit/                     # Unit tests (isolated, fast)
│   ├── utils.test.js         # Utility function tests
│   ├── email-reply.test.js   # Email parsing tests
│   ├── circuit-breaker.test.js
│   ├── retry-manager.test.js
│   └── config-validator.test.js
│
├── integration/              # Integration tests (component interactions)
│   ├── data-flow.test.js     # meal plan → email → calendar → cart
│   ├── heb-cart.test.js      # HEB cart automation tests
│   ├── email-system.test.js  # Email system tests
│   └── facebook-marketplace.test.js
│
├── e2e/                      # End-to-end tests (full workflows)
│   └── dinner-automation.test.js
│
├── benchmarks/               # Performance benchmarks
│   ├── cart-addition.bench.js
│   ├── email-parsing.bench.js
│   └── facebook-check.bench.js
│
├── mocks/                    # Mock implementations
│   ├── browser.mock.js
│   ├── cdp-server.mock.js
│   └── email-server.mock.js
│
└── fixtures/                 # Test data
    ├── meal-plans/
    ├── email-replies/
    └── cart-items/
```

## Test Categories

### 1. Unit Tests

**Purpose:** Test individual functions in isolation

**Characteristics:**
- Fast execution (< 10ms per test)
- No external dependencies
- Deterministic results
- High coverage of edge cases

**Coverage Areas:**
- Utility functions (lib/utils.js)
- Email reply parsing (scripts/email-reply-parser.js)
- Circuit breaker logic (lib/retry-manager.js)
- Config validation (lib/config-validator.js)
- Date formatting (lib/date-utils.js)

**Running:**
```bash
node tests/run-tests.js --unit
```

### 2. Integration Tests

**Purpose:** Test component interactions and data flow

**Characteristics:**
- Test real component interactions
- May use mocks for external services
- Verify data transformation between components
- Test error handling across boundaries

**Coverage Areas:**
- **Data Flow:** meal plan → email → calendar → cart
- **HEB Cart:** Cart addition, search, substitution
- **Email System:** Send, receive, parse, reply processing
- **Facebook:** Message checking, marketplace sharing

**Running:**
```bash
node tests/run-tests.js --integration
```

### 3. End-to-End Tests

**Purpose:** Test complete user workflows

**Characteristics:**
- Full automation scenarios
- Minimal mocking
- Test against real (or staging) services
- Slower but most realistic

**Coverage Areas:**
- Complete dinner automation workflow
- Emergency substitution handling
- Multi-day meal plan processing

**Running:**
```bash
node tests/run-tests.js --e2e
```

### 4. Benchmarks

**Purpose:** Measure and track performance

**Characteristics:**
- Measure execution time
- Compare before/after optimizations
- Detect performance regressions
- Establish baseline metrics

**Coverage Areas:**
- Cart addition speed
- Email parsing performance
- Facebook marketplace check latency
- Image fetching from Unsplash

**Running:**
```bash
node tests/run-tests.js --benchmark
```

## Test Runner Features

### Command Line Interface

```bash
# Run all tests
node tests/run-tests.js

# Run specific categories
node tests/run-tests.js --unit
node tests/run-tests.js --integration
node tests/run-tests.js --e2e
node tests/run-tests.js --benchmark

# Run specific test file
node tests/run-tests.js --file=unit/utils.test.js

# Run with coverage
node tests/run-tests.js --coverage

# Run with specific reporter
node tests/run-tests.js --reporter=junit

# Filter tests by pattern
node tests/run-tests.js --grep="cart"

# Fail fast (stop on first failure)
node tests/run-tests.js --bail

# Verbose output
node tests/run-tests.js --verbose
```

### Output Formats

- **Console:** Human-readable with colors
- **JSON:** Machine-parseable for CI
- **JUnit:** For integration with CI systems
- **HTML:** Detailed report with coverage

## Validation Checklist

### HEB Cart Automation

- [x] **Unit:** Cart item validation works correctly
- [x] **Unit:** Search query generation produces valid queries
- [x] **Unit:** Substitution logic handles edge cases
- [x] **Integration:** Cart addition flow completes successfully
- [x] **Integration:** Error recovery works when items not found
- [x] **Integration:** Quantity updates work correctly
- [ ] **E2E:** Full cart build with real HEB site (manual)

### Email System

- [x] **Unit:** Email reply parser extracts exclusions correctly
- [x] **Unit:** Email reply parser extracts stock items correctly
- [x] **Unit:** Approval/rejection detection works
- [x] **Unit:** Day/meal adjustments are parsed correctly
- [x] **Integration:** Email sending with circuit breaker
- [x] **Integration:** Image fetching with fallback
- [ ] **E2E:** Full email send/receive cycle (manual)

### Calendar Sync

- [x] **Unit:** Date formatting for calendar events
- [x] **Unit:** Event data structure validation
- [x] **Integration:** Calendar event creation flow
- [x] **Integration:** Duplicate event detection

### Facebook Marketplace

- [x] **Unit:** Message parsing works correctly
- [x] **Unit:** Group rotation logic functions properly
- [x] **Integration:** Session state management
- [x] **Integration:** Quick status check flow
- [x] **Integration:** F-150 mention detection

### Error Handling

- [x] **Unit:** Circuit breaker state transitions
- [x] **Unit:** Exponential backoff calculation
- [x] **Unit:** Error classification (retryable vs fatal)
- [x] **Integration:** Recovery from network errors
- [x] **Integration:** Graceful degradation when services fail

## Performance Baselines

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Cart item addition | < 3s | 5s |
| Email reply parsing | < 50ms | 100ms |
| Facebook status check | < 5s | 10s |
| Image fetch (cached) | < 100ms | 200ms |
| Image fetch (fresh) | < 3s | 5s |
| Full dinner plan send | < 10s | 20s |

## Continuous Integration

### Pre-commit Checks

```bash
# Run before committing
npm run test:unit
npm run test:lint
```

### CI Pipeline

```yaml
stages:
  - unit-tests
  - integration-tests
  - benchmarks
  
unit-tests:
  script:
    - node tests/run-tests.js --unit --coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'

integration-tests:
  script:
    - node tests/run-tests.js --integration
  
benchmarks:
  script:
    - node tests/run-tests.js --benchmark
  artifacts:
    paths:
      - tests/reports/benchmark-results.json
```

## Test Data Management

### Fixtures

Static test data stored in `tests/fixtures/`:
- `meal-plans/` - Sample weekly meal plans
- `email-replies/` - Sample email reply texts
- `cart-items/` - Sample cart item configurations

### Mocks

Mock implementations in `tests/mocks/`:
- `browser.mock.js` - Mock Playwright browser
- `cdp-server.mock.js` - Mock Chrome DevTools Protocol
- `email-server.mock.js` - Mock SMTP/IMAP server

### Test Isolation

Each test:
1. Creates temporary test directory
2. Uses unique identifiers to avoid conflicts
3. Cleans up after completion (success or failure)
4. Resets mocks between tests

## Debugging Tests

### Verbose Output

```bash
DEBUG=1 node tests/run-tests.js --verbose
```

### Single Test

```bash
node tests/run-tests.js --file=unit/email-reply.test.js --grep="exclusion"
```

### With Debugger

```bash
node --inspect-brk tests/run-tests.js --file=unit/email-reply.test.js
```

## Coverage Goals

| Module | Target Coverage | Current |
|--------|-----------------|---------|
| lib/utils.js | 90% | - |
| lib/retry-manager.js | 85% | - |
| lib/error-handling.js | 80% | - |
| scripts/email-reply-parser.js | 90% | - |
| lib/config-validator.js | 75% | - |

## Known Limitations

1. **Browser Automation:** Full E2E tests require running Chrome instance
2. **External APIs:** Some tests mock external services (Unsplash, Twilio)
3. **Email:** IMAP tests may be flaky due to network conditions
4. **Facebook:** Marketplace tests require active Facebook session

## Future Improvements

- [ ] Add visual regression tests for UI components
- [ ] Implement parallel test execution
- [ ] Add property-based testing (fuzzing)
- [ ] Create test doubles for all external dependencies
- [ ] Add contract tests for API boundaries
- [ ] Implement chaos engineering tests

## Resources

- [Test Runner Documentation](./run-tests.js --help)
- [API Reference](./API.md)
- [Contributing Guide](./CONTRIBUTING.md)
