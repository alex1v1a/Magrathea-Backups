# Dinner Automation Scripts Index

**Generated:** 2026-02-15  
**Purpose:** Document active production scripts vs archived iterations

---

## Quick Stats

| Category | Files | Size |
|----------|-------|------|
| **Active Scripts** | 65 | 649.68 KB |
| **Archived** | 149 | 850.10 KB |
| **Total Disk Saved** | - | 850.10 KB |

---

## Active Production Scripts

These are the current working versions. Use these for operations.

### HEB Grocery Automation (Primary System)
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `auto-heb-cart.js` | Main HEB cart automation entry point | 2026-02-11 |
| `heb-add-cart.js` | Add items to HEB cart | 2026-02-14 |
| `heb-add-cart-optimized.js` | Optimized version of add-cart | 2026-02-12 |
| `heb-add-missing.js` | Add missing items to cart | 2026-02-14 |
| `heb-add-weekly-plan.js` | Add weekly meal plan items | 2026-02-15 |
| `heb-cart-chrome.js` | Chrome-based HEB cart operations | 2026-02-11 |
| `heb-cart-shared.js` | Shared Chrome HEB operations | 2026-02-10 |
| `heb-check-cart.js` | Verify cart contents | 2026-02-15 |
| `heb-clear-cart.js` | Clear HEB cart | 2026-02-14 |
| `heb-complete-cart.js` | Complete cart checkout flow | 2026-02-15 |
| `heb-complete-full-cart.js` | Full cart completion | 2026-02-15 |
| `heb-extension-sync.js` | HEB extension sync | 2026-02-11 |
| `launch-heb-marvin.js` | Launch HEB on Marvin profile | 2026-02-11 |
| `update-heb-meal-plan.js` | Update HEB meal plan | 2026-02-10 |

### Facebook Marketplace (F-150 Sales)
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `facebook-marketplace-automation.js` | Main FB Marketplace automation | 2026-02-07 |
| `facebook-marketplace-chrome.js` | Chrome-based FB operations | 2026-02-10 |
| `facebook-marketplace-shared.js` | Shared Chrome FB operations | 2026-02-10 |
| `facebook-marketplace-shared-optimized.js` | Optimized FB shared ops | 2026-02-12 |
| `f150-aggressive-sales-chrome.js` | Aggressive F-150 sales | 2026-02-10 |
| `check-f150-listing.js` | Check F-150 listing status | 2026-02-14 |
| `fb-check-f150.js` | Check F-150 messages | 2026-02-12 |
| `fb-check-f150-status.js` | Check F-150 status | 2026-02-12 |
| `fb-restore-session.js` | Restore FB session | 2026-02-12 |
| `fb-share-fixed.js` | Share F-150 listing | 2026-02-13 |

### Email & Dinner Systems
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `dinner-automation.js` | Main dinner automation | 2026-02-07 |
| `dinner-email-system.js` | Email-based dinner system | 2026-02-10 |
| `dinner-email-system-v2.js` | Email system v2 | 2026-02-11 |
| `dinner-email-system-v2-optimized.js` | Optimized email v2 | 2026-02-12 |
| `email-client.js` | Email client operations | 2026-02-07 |
| `email-monitor.js` | Monitor email for dinner replies | 2026-02-07 |
| `email-reply-parser.js` | Parse dinner email replies | 2026-02-07 |
| `fetch-email.js` | Fetch emails | 2026-02-10 |
| `imap-email-monitor.js` | IMAP email monitoring | 2026-02-10 |
| `imap-reply-processor.js` | Process IMAP replies | 2026-02-10 |
| `send-email.js` | Send email notifications | 2026-02-10 |

### Chrome & Browser Management
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `launch-shared-chrome.js` | Launch shared Chrome instance | 2026-02-10 |
| `shared-chrome-connector.js` | Connect to shared Chrome | 2026-02-10 |
| `shared-chrome-connector-v2.js` | Connector v2 | 2026-02-10 |
| `chrome-marvin-profile.js` | Marvin Chrome profile | 2026-02-09 |
| `cleanup-tabs.js` | Clean up browser tabs | 2026-02-12 |
| `connect-to-chrome.js` | Chrome CDP connector | 2026-02-08 |
| `fix-chrome-crash.js` | Fix Chrome crash issues | 2026-02-09 |
| `reset-chrome-profile.js` | Reset Chrome profile | 2026-02-09 |

### Calendar & Scheduling
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `calendar-sync.js` | Sync dinner to calendar | 2026-02-07 |
| `update-calendar.js` | Update calendar events | 2026-02-07 |
| `cron-config.js` | Cron job configuration | 2026-02-05 |

### Inventory & Meal Planning
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `rebuild-meal-plan.js` | Rebuild weekly meal plan | 2026-02-07 |
| `stock-manager.js` | Manage pantry stock | 2026-02-10 |
| `substitution-engine.js` | Handle ingredient substitutions | 2026-02-07 |
| `exclude-manager.js` | Manage excluded ingredients | 2026-02-07 |
| `preference-manager.js` | Manage meal preferences | 2026-02-11 |
| `instacart-integration.js` | Instacart integration | 2026-02-07 |
| `generate-heb-items.js` | Generate HEB item list | 2026-02-10 |

### Monitoring & Utilities
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `automation-api.js` | Automation API endpoints | 2026-02-10 |
| `batch-processor.js` | Batch process operations | 2026-02-10 |
| `complete-dinner-auto.js` | Complete dinner automation | 2026-02-10 |
| `dashboard-data.js` | Dashboard data provider | 2026-02-10 |
| `discord-notifier.js` | Discord notifications | 2026-02-07 |
| `monitor-cart.js` | Monitor cart status | 2026-02-05 |
| `monitor-email.js` | Monitor email inbox | 2026-02-07 |
| `monitor-purchase.js` | Monitor purchase completion | 2026-02-05 |
| `self-test.js` | Self-test utilities | 2026-02-10 |
| `setup-fix.js` | Setup fixes | 2026-02-07 |
| `credentials.js` | Credential management | 2026-02-07 |

### YouTube & Media
| Script | Purpose | Last Updated |
|--------|---------|--------------|
| `build-youtube-cache.js` | Build YouTube video cache | 2026-02-10 |

---

## Archive Structure

### `/archive/iterations/` (64 files, 307.13 KB)
Iterative attempts at HEB cart automation. These were development iterations that led to the current production versions.

**Key archived iterations:**
- `heb-cart-*.js` - Various cart automation attempts (v3, simple, stable, sim, etc.)
- `heb-*-login.js` - Login automation attempts
- `heb-add-*.js` - Various add-to-cart implementations
- `run-heb-*.js` - Runner scripts
- `heb-edge-*.js` - Edge browser attempts

### `/archive/debug/` (27 files, 118.94 KB)
Debug and testing scripts used during development.

**Contents:**
- `debug-heb*.js` - HEB debugging utilities
- `heb-cart-debug*.js` - Cart debugging scripts
- `test-*.js` - Various test scripts
- `heb-cart-audit.js` - Cart auditing (superseded)
- `heb-cart-verify.js` - Cart verification (superseded)

### `/archive/deprecated/` (58 files, 424.03 KB)
Deprecated and disabled scripts no longer in use.

**Contents:**
- `*.DISABLED` - Explicitly disabled scripts
- `facebook-automation-selenium.js` - Selenium attempts
- `heb-automation*.js` - Early automation versions
- `heb-cart-fingerprint.js` - Fingerprinting attempts
- `heb-cart-session.js` - Session management (old)
- `heb-cart-stealth.js` - Stealth mode attempts
- `profiler*.js` - Profiling tools (unused)
- `selenium-automation.js` - Selenium framework
- `icloud-*.js` - iCloud sync attempts
- `launch-chrome-*.js` - Old Chrome launchers

---

## Usage Guidelines

### For HEB Operations
```bash
# Main automation
node dinner-automation/scripts/auto-heb-cart.js

# Add weekly meal plan
node dinner-automation/scripts/heb-add-weekly-plan.js

# Check cart status
node dinner-automation/scripts/heb-check-cart.js

# Clear cart
node dinner-automation/scripts/heb-clear-cart.js
```

### For Facebook Operations
```bash
# Check F-150 messages
node dinner-automation/scripts/fb-check-f150.js

# Share F-150 listing
node dinner-automation/scripts/fb-share-fixed.js
```

### For Email/Dinner System
```bash
# Monitor dinner emails
node dinner-automation/scripts/dinner-email-system-v2-optimized.js

# Check email replies
node dinner-automation/scripts/imap-reply-processor.js
```

---

## Maintenance Notes

- **Active scripts** are those modified in the last 7 days (as of 2026-02-15)
- **Archive** contains iterations older than 7 days or explicitly deprecated
- When creating new versions, archive the old version before replacing
- Keep `README.md` in each archive subfolder for context

---

## Disk Space Summary

| Location | Files | Size |
|----------|-------|------|
| Active scripts/ | 65 | 649.68 KB |
| archive/iterations/ | 64 | 307.13 KB |
| archive/debug/ | 27 | 118.94 KB |
| archive/deprecated/ | 58 | 424.03 KB |
| **Total** | **214** | **1.47 MB** |

**Space saved by archiving:** 850.10 KB (57.7% of total)
