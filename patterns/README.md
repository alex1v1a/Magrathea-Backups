# Patterns Library Documentation

Reusable automation patterns for OpenClaw/Marvin.

## Quick Start

```javascript
const { retry, logger, browser, email, calendar } = require('./patterns');

// Retry with exponential backoff
await retry.withRetry(async () => {
  // Your flaky operation
}, { maxRetries: 3 });

// Structured logging
logger.info('Starting process');
logger.section('PHASE 1');

// Browser automation
const session = new browser.SessionManager({ debugPort: 9224 });
await session.connect();
await browser.smartClick(session.page, ['text=Submit', 'button[type="submit"]']);
```

## Modules

### credentials.js
Secure credential management from environment variables.

```javascript
const { getCredentials, getIMAPConfig, getSMTPConfig } = require('./patterns');

const password = getCredentials('icloud', 'password');
const imapConfig = getIMAPConfig();
```

### retry-utils.js
Resilient execution patterns.

```javascript
const { withRetry, circuitBreaker, batchProcess } = require('./patterns');

// Retry with backoff
await withRetry(fn, { maxRetries: 3, baseDelay: 1000 });

// Circuit breaker
const protectedFn = circuitBreaker(fn, { failureThreshold: 5 });

// Batch processing
const results = await batchProcess(items, processor, { concurrency: 3 });
```

### logger.js
Structured logging with colors and file output.

```javascript
const { logger, log } = require('./patterns');

logger.info('Message');
logger.section('SECTION HEADER');
log.success('It worked!');
log.failure('It failed');
```

### browser-patterns.js
Reusable browser automation.

```javascript
const { 
  SessionManager, 
  smartSelector, 
  smartClick, 
  smartType,
  checkLoginStatus,
  RateLimiter 
} = require('./patterns');

const session = new SessionManager({ debugPort: 9224 });
await session.connect();

// Smart clicking (tries multiple selectors)
await smartClick(page, ['text=Submit', '#submit-btn', '[type="submit"]']);

// Rate limiting
const limiter = new RateLimiter({ minDelay: 1000, maxDelay: 3000 });
await limiter.wait();
```

### email-utils.js
Email operations with connection pooling.

```javascript
const { searchEmails, findVerificationCode, sendEmail } = require('./patterns');

// Search emails
const messages = await searchEmails([], { from: 'noreply@heb.com' });

// Find verification code
const result = await findVerificationCode({ 
  from: 'noreply@heb.com',
  pattern: /\d{6}/ 
});

// Send email
await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Message body'
});
```

### calendar-utils.js
Incremental calendar sync.

```javascript
const { incrementalSync, eventToICal } = require('./patterns');

// Sync only changed events
const { events, changes } = await incrementalSync();
console.log(`Added: ${changes.added.length}, Updated: ${changes.updated.length}`);
```

### metrics.js
Performance and reliability tracking.

```javascript
const { MetricsReporter, getMetricsSummary } = require('./patterns');

// Track execution
const reporter = new MetricsReporter('my-script');
reporter.start();
// ... do work ...
await reporter.end(true);

// Get summary
const summary = await getMetricsSummary(7);
console.log(`Success rate: ${summary.executions.successful / summary.executions.total}`);
```

## Security

All credentials must be set via environment variables:

```bash
# Required
ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Optional
ICLOUD_EMAIL=MarvinMartian9@icloud.com
FACEBOOK_EMAIL=...
FACEBOOK_PASSWORD=...
```

**Never hardcode passwords in scripts.**

## Examples

See `patterns/examples.js` for more usage examples.
