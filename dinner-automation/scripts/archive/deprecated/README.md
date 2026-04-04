# Archive: Deprecated

This folder contains deprecated, disabled, or abandoned scripts.

## Contents (58 files, 424.03 KB)

### Explicitly Disabled Files (*.DISABLED)
- `chrome-controller.js.DISABLED` + `.DISABLED.md`
- `edge-automation.js.DISABLED`
- `f150-aggressive-sales.js.DISABLED`
- `facebook-marketplace-edge.js.DISABLED`
- `heb-cart-edge.js.DISABLED`

### Early HEB Automation (superseded)
- `heb-automation.js` - First automation attempt
- `heb-automation-v2.js` - Second iteration
- `heb-automation-v3.js` - Third iteration
- `heb-automation-manual.js` - Manual mode
- `heb-automation-full.js` - Full automation (old)
- `heb-automation-production.js` - Production candidate (old)
- `heb-direct-automation.js` - Direct automation approach
- `heb-integration.js` - Integration script (old)

### Browser-Specific Attempts
- `facebook-automation-selenium.js` - Selenium-based Facebook
- `selenium-automation.js` - Selenium framework
- `fb-login-edge.js` - Edge-based FB login
- `fb-login-playwright.js` - Playwright FB login
- `fb-marketplace-unified.js` - Unified FB marketplace (old)
- `fb-check.js` - Basic FB checker

### Advanced/Experimental
- `heb-cart-fingerprint.js` - Browser fingerprinting
- `heb-cart-session.js` - Advanced session management
- `heb-cart-stealth.js` - Stealth automation
- `heb-cart-slow-mode.js` - Slow mode operations
- `heb-cart-sync-bidirectional.js` - Bidirectional sync

### Other Attempts
- `heb-final-selenium.js` - Final Selenium attempt
- `heb-final-attempt.js` - Final pre-Playwright attempt
- `heb-mobile-attempt.js` - Mobile emulation
- `heb-human-behavior.js` - Human behavior simulation
- `heb-create-manual-list.js` - Manual list creation
- `heb-list-generator.js` - List generation (old)

### iCloud Integration (deprecated approach)
- `icloud-caldav.js`
- `icloud-calendar-sync.js`
- `sync-icloud-direct.js`
- `sync-dinner-to-icloud.js`
- `reply-sync-handler.js`

### Chrome Launchers (old)
- `launch-chrome-direct.js`
- `launch-chrome-ext.js`
- `launch-chrome-fixed.js`
- `launch-chrome-safe.js`
- `launch-chrome-stable.js`
- `launch-chrome-visible.js`
- `launch-heb-chrome.bat`

### Utilities (unused)
- `export-heb-cookies.js` - Cookie export
- `check-chrome-status.js` - Chrome status check
- `check-heb-status.js` - HEB status check
- `check-login.js` - Login checker
- `profiler.js`, `profiler-v2.js` - Performance profiling
- `send-heb-notification.js` - Notification sender
- `trigger-heb-extension.js`, `trigger-heb-extension-sync.js` - Extension triggers
- `validate-e2e.js` - E2E validation
- `auto-everything.js`, `auto-heb-cart-chrome.js`, `auto-heb-foreground.js`
- `full-integration.js`, `fully-automatic.js`

## Why Deprecated

- **Selenium/Playwright approaches** - Replaced by CDP/Extension-based automation
- **Edge browser** - Replaced by dedicated Chrome profiles
- **iCloud sync** - Replaced by direct calendar integration
- **Fingerprinting/Stealth** - HEB detection improved; approach changed
- **Old launchers** - Consolidated into `launch-shared-chrome.js`
