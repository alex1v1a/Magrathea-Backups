# Archive: Debug

This folder contains debug and testing scripts used during development.

## Contents (27 files, 118.94 KB)

### Debug Scripts
- `debug-heb.js` - General HEB debugging
- `debug-heb-login.js` - Login-specific debugging
- `heb-cart-debug.js` - Cart debugging (active until 2026-02-15)
- `heb-cart-debug2.js` - Secondary debug script
- `heb-debug-run.js` - Debug runner
- `heb-no-debug.js` - Debug suppression test

### Test Scripts
- `test-simple.js` - Simple test harness
- `test-persistent.js` - Persistence testing
- `test-check-replies.js` - Reply checking tests
- `test-parser.js` - Parser unit tests
- `test-email.js` - Email system tests
- `test-heb-antidetect.js` - Anti-detection tests
- `test-heb-extension.js` - Extension tests
- `test-puppeteer-stealth.js` - Stealth mode tests
- `test-stealth-quick.js` - Quick stealth tests

### HEB-Specific Tests
- `heb-auto-test.js` - Automated HEB testing
- `heb-cart-slow-mode-test.js` - Slow mode testing
- `heb-test-add.js` - Add operation tests
- `heb-test-persistent.js` - Persistent session tests
- `heb-test-quick.js` - Quick tests

### Audit & Verification (superseded)
- `heb-cart-audit.js` - Cart auditing
- `heb-cart-detailed-audit.js` - Detailed auditing
- `heb-cart-verify.js` - Cart verification
- `heb-cart-quick.js` - Quick operations (test version)
- `heb-cart-reader.js` - Cart reading utility
- `heb-cart-screenshot.js` - Screenshot capture
- `heb-cart-snapshot.js` - State snapshots

## Note
These scripts were useful during active debugging but production versions now have
built-in logging and error handling. Keep for reference only.
