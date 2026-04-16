# Dinner Automation Scripts - Comprehensive Code Review

**Review Date:** 2026-04-13  
**Scope:** `magrathea/marvin/configs/dinner-automation/scripts/` (excluding `archive/`)  
**Reviewer:** Subagent (Marvin)  

---

## Executive Summary

This codebase is a textbook example of **evolutionary spaghetti** — a dinner automation system that has grown through iteration without adequate consolidation. There are **massive duplications**, **critical security exposures**, **missing dependencies**, and **architectural drift** across multiple parallel implementations of the same functionality.

**Bottom line:** ~40% of the active scripts could be archived immediately, and the remaining 60% need consolidation into a single maintained pipeline.

---

## 1. Critical Security Issues 🔴

### 1.1 Hardcoded Credentials (CRITICAL)

| File | Exposure | Details |
|------|----------|---------|
| `heb-cart-shared.js` | **Hardcoded HEB password** | Line ~25: `password: '$Tandal0ne'` in plaintext object `HEB_CREDENTIALS` |
| `facebook-marketplace-automation.js` | **Hardcoded Facebook password** | `FB_PASSWORD = 'section9'` and email `alex@xspqr.com` |
| `facebook-marketplace-shared.js` | **Hardcoded Facebook password** | Same `section9` password exposed again |
| `facebook-marketplace-refactored.js` | Indirect exposure | References same shared lib but the original passwords remain in sibling files |

**Impact:** These passwords are committed to version control (or will be), permanently exposing Alexander's accounts.

**Fix:** 
- Rotate both passwords immediately.
- Remove all hardcoded credentials and use `credentials.js` (which already exists and is well-designed) exclusively.
- Add a `.gitignore` rule to prevent accidental commit of credential files.

### 1.2 Unsafe File Operations

- `dinner-email-system-v2.js` writes temp email files (`temp-email-${Date.now()}.eml`) to the `data/` directory without restrictive permissions. These may contain email content and metadata.
- Multiple scripts use `fs.writeFileSync` for JSON state without atomic writes — partial writes on crash can corrupt state.

### 1.3 Command Injection Risk

- `dinner-email-system.js` (v1) and `optimized/dinner-email-system-v2.js` use `execSync('curl ...')` to send emails. While currently parameterized, any future modification that concatenates user input into the curl command creates an immediate RCE vector.
- **Fix:** Use `nodemailer` (already a dependency in `email-client.js`) instead of shelling out to curl.

---

## 2. Bugs & Logic Issues 🐛

### 2.1 Missing/Incorrect Module References

| Caller File | Required Module | Problem |
|-------------|-----------------|---------|
| `dinner-automation.js` | `./heb-integration` | **File does not exist** in `scripts/` directory. This will throw `MODULE_NOT_FOUND` at runtime. |
| `dinner-automation.js` | `./heb-cart-automation` | **File does not exist** — appears to have been renamed to `auto-heb-cart.js` or `heb-add-cart.js`. |
| `dinner-automation.js` | `./monitor-email` | **File does not exist** — actual file is `monitor-email.js` but referenced without extension; may or may not resolve depending on Node version. |
| `dinner-automation.js` | `./rebuild-meal-plan` | Actual file is `rebuild-meal-plan.js` in root `scripts/`, but the require is ambiguous. |

**Impact:** The main orchestration script `dinner-automation.js` is **fundamentally broken** and cannot run without fixing these imports.

### 2.2 Race Conditions in Parallel Cart Automation

**File:** `optimized/heb-add-cart.js`

- The "parallel workers" approach creates multiple pages and navigates them independently to HEB search results.
- HEB's localStorage cart count is **shared per origin per browser context**, not per page. Multiple workers clicking "Add to Cart" simultaneously can cause:
  - Cart count cache invalidation races (`this.cache.delete()` vs `_getCartCount()`)
  - Duplicate additions if one worker's verification read happens during another worker's click
  - Session throttling or bot detection triggers due to concurrent navigation

**Fix:** Parallelize search, but **serialize cart mutations** through a single page, or use proper mutexing.

### 2.3 Unreliable Cart Verification

**Files:** `heb-add-cart.js`, `heb-complete-cart-v2.js`, `auto-heb-cart.js`

- Cart verification relies on HEB's `localStorage.getItem('PurchaseCart')`, which is an **implementation detail** that HEB can change at any time.
- If the user already has items in their cart, the `countBefore / countAfter` delta logic is fragile — it assumes each click adds exactly 1 item, but some HEB products default to quantity > 1 or bundle multiple SKUs.
- **Fix:** Verify by checking for a specific product identifier in the cart DOM or API, not just a raw count delta.

### 2.4 Bot Detection False Negatives

**File:** `auto-heb-cart.js`

- `isBotDetectionError()` catches keywords like `timeout`, `navigation`, `blocked`, but **Incapsula often returns HTTP 200 with an invisible challenge script**. The script would interpret this as success and proceed to look for non-existent selectors.
- The fallback to "Chrome extension fallback" is triggered too late — by the time navigation "succeeds," the session may already be flagged.

### 2.5 Email Client IMAP Connection Leak

**File:** `email-client.js`

- `checkForReplies()` creates an `ImapFlow` client, connects, fetches messages, then calls `logout()`.
- If an exception is thrown **after** connect but **before** logout, the connection is never closed because there is no `try/finally` around the IMAP operations.
- **Fix:** Wrap the IMAP session in a `try/finally` block.

### 2.6 Process Exit in Module Exports

**Files:** Multiple (`auto-heb-cart.js`, `heb-complete-cart-v2.js`, `facebook-marketplace-automation.js`)

- These files both `module.exports = { ... }` **and** call `process.exit()` in their `main()` functions.
- If another script `require()`s these modules, the `main()` function doesn't run — but if anyone accidentally imports and calls `main()`, it will kill the parent process.
- **Fix:** Separate CLI entry points from library modules.

---

## 3. Performance Issues 🐌

### 3.1 Massive Code Duplication = Maintenance Bloat

The same HEB cart-adding logic is implemented at least **8 times** across the codebase:

1. `heb-add-cart.js` (22 KB)
2. `heb-add-cart-refactored.js`
3. `heb-add-missing.js`
4. `heb-cart-shared.js`
5. `heb-complete-cart-v2.js` (31 KB)
6. `auto-heb-cart.js` (35 KB)
7. `optimized/heb-add-cart.js`
8. `lib/heb-utils.js` (shared library that *still* duplicates much of the above)

Each version has slightly different selector strategies, timing constants, and retry logic. This means every HEB site change requires updating **8 files** instead of 1.

### 3.2 Inefficient Email Systems

| File | Size | Issue |
|------|------|-------|
| `dinner-email-system-v2.js` | **64 KB** | Monolithic file containing its own SMTP service, template engine, image service, and profiler. Reimplements what `email-client.js` already does. |
| `dinner-email-system-v3.js` | 35 KB | Same problem, slightly different architecture. Still duplicates `email-client.js` functionality. |
| `dinner-email-system.js` | 21 KB | Original version using `execSync('curl')` — blocks the event loop for every email send. |

**Fix:** Delete v1/v2/v3 and consolidate on `email-client.js` (which is actually well-designed with connection pooling, caching, and proper async patterns).

### 3.3 Suboptimal IMAP Fetching

**File:** `email-client.js`

- `checkForReplies()` first fetches UID + envelope for all unseen messages, then fetches full source in parallel batches.
- This is **two round-trips per message** when `ImapFlow` supports fetching both envelope and source in a single `fetch()` call.
- **Fix:** Use `fetch({ source: true, envelope: true }, { uid: true })` in a single pass.

### 3.4 Repeated DOM Queries

**Files:** `heb-add-cart.js`, `heb-complete-cart-v2.js`

- `findAndClickAddButton()` runs multiple `page.locator(...).all()` queries sequentially, each scanning the entire DOM.
- **Fix:** Use a single `page.evaluate()` to find the best candidate button and return its selector, then create a locator from that result.

### 3.5 Inefficient Image Fetching

**File:** `optimized/dinner-email-system-v2.js`

- Fetches Unsplash images for every meal, every send, even if the meal plan hasn't changed.
- The `SimpleCache` has a TTL of 7 days but is **in-memory only** — process restart clears it.
- **Fix:** Persist image URLs to disk and only refetch on meal plan changes.

---

## 4. Code Quality Issues 📝

### 4.1 Dead Code & Commented-Out Experiments

- `auto-heb-cart.js` contains a complete `openExtensionPopup()` method and `monitorProgress()` loop that are **never used** in the actual execution path (`runDirectAutomation()` bypasses the popup entirely).
- `facebook-marketplace-automation.js` contains hardcoded group IDs (`'123456'`, `'789012'`, `'345678'`) that are clearly placeholder values.
- `lib/heb-utils.js` exports `ALL_ITEMS_FALLBACK` — a hardcoded list of 42 items that appears to be stale test data embedded in production code.

### 4.2 Inconsistent Error Handling

- Some scripts use `try/catch` with graceful degradation (`heb-complete-cart-v2.js`).
- Others let errors bubble up and crash the process (`heb-add-missing.js`).
- `dinner-automation.js` mixes sync `fs.appendFileSync` with async operations in the same method.

### 4.3 Mixed Async Patterns

**File:** `dinner-email-system.js`

- Uses `async/await` for file reads but `execSync` (synchronous, blocking) for SMTP sends.
- `buildMarkdownContent()` is a synchronous function called from an async context.

### 4.4 Brittle Selector Strategies

Multiple scripts maintain their own copy of HEB selectors:

```javascript
// heb-add-cart.js
'button[data-testid*="add-to-cart" i]',
'button[data-qe-id="addToCart"]',
'button[data-automation-id*="add" i]',
'button:has-text("Add to cart")'

// heb-complete-cart-v2.js (slightly different)
'button[data-testid*="add-to-cart" i]',
'button[data-qe-id="addToCart"]',
'button[data-automation-id*="add" i]',
'button:has-text("Add to cart")'

// auto-heb-cart.js (different again)
'[data-testid="account-menu-button"]',
'[aria-label*="Account" i]',
'.account-menu'
```

When HEB changes their DOM, this becomes a whack-a-mole maintenance nightmare.

### 4.5 Magic Numbers Everywhere

- `3000`, `5000`, `8000` ms delays scattered across 15+ files with no central configuration.
- `42` hardcoded as the "target total" in `heb-add-missing.js`.
- `BATCH_SIZE = 5` redefined in at least 4 files.

---

## 5. Modernization & Consolidation Opportunities 🚀

### 5.1 Consolidate HEB Cart Automation into ONE Script

**Current state:** 8 files doing the same thing.  
**Target state:** A single `heb-cart-automation.js` that:
- Uses the shared `lib/heb-utils.js` (after cleanup)
- Supports `--mode=add`, `--mode=clear`, `--mode=verify`
- Reads all timing/config from a central JSON config file
- Has ONE selector strategy that is actively maintained

### 5.2 Consolidate Email Systems

**Archive immediately:**
- `dinner-email-system.js` (v1 — uses curl)
- `dinner-email-system-v2.js` (64 KB monolith)
- `dinner-email-system-v3.js` (partial refactor)

**Keep and enhance:**
- `email-client.js` — it already has pooling, caching, Discord fallback, and proper async IMAP.

### 5.3 Consolidate Facebook Marketplace Scripts

**Current state:** 3+ implementations.

| File | Status | Recommendation |
|------|--------|----------------|
| `facebook-marketplace-automation.js` | Has hardcoded passwords, uses port 9224 | **Archive** after extracting any useful logic |
| `facebook-marketplace-shared.js` | Minimal, functional | **Merge into** `facebook-marketplace-refactored.js` |
| `facebook-marketplace-refactored.js` | Best architecture, uses shared lib | **Keep as the canonical version** |

### 5.4 Fix `dinner-automation.js` Orchestrator

This is the main entry point, but it's broken due to missing modules. It needs:
1. Fix all `require()` paths to match actual filenames.
2. Remove references to `heb-integration` (doesn't exist) and replace with `auto-heb-cart` or the consolidated cart script.
3. Replace `new EmailReplyMonitor()` with `new EmailReplyMonitor()` from `monitor-email.js` (path works, but class name mismatch is risky).

### 5.5 Introduce a Real Shared Library

The `lib/` directory exists but is underutilized. Move into it:
- All timing/delay utilities
- All cart-count verification logic
- All HEB/Facebook selector definitions
- A unified `BrowserSession` class (merge `shared-chrome-connector.js` and `shared-chrome-connector-v2.js`)

### 5.6 Replace `execSync('curl')` with Native SMTP

The `dinner-email-system*.js` files use `curl` to send email. `email-client.js` already uses `nodemailer`. Unify everything on `nodemailer`.

---

## 6. Scripts to Archive 📦

The following files appear to be **superseded duplicates** or **experimental iterations** that should be moved to `archive/`:

### Email Systems (keep only `email-client.js`)
- [ ] `dinner-email-system.js` — superseded by `email-client.js`
- [ ] `dinner-email-system-v2.js` — superseded by `email-client.js`
- [ ] `dinner-email-system-v3.js` — superseded by `email-client.js`
- [ ] `optimized/dinner-email-system-v2.js` — another variant of the same

### HEB Cart Scripts (consolidate into one canonical script)
- [ ] `heb-add-cart.js` — merge logic into canonical script, then archive
- [ ] `heb-add-cart-refactored.js` — was a refactoring attempt; archive
- [ ] `heb-add-missing.js` — specialized variant; logic can be a `--resume` flag in canonical script
- [ ] `heb-cart-shared.js` — has **hardcoded password**; archive after password rotation
- [ ] `heb-complete-cart-v2.js` — large but overlaps heavily with `auto-heb-cart.js`; merge useful bits (circuit breaker) then archive
- [ ] `optimized/heb-add-cart.js` — parallel worker experiment; too risky for production
- [ ] `optimized/heb-add-missing.js` — likely duplicate of root `heb-add-missing.js`

### Facebook Marketplace (keep only refactored version)
- [ ] `facebook-marketplace-automation.js` — has hardcoded password; archive after rotation
- [ ] `facebook-marketplace-shared.js` — minimal; merge into refactored then archive

### Browser Connectors (consolidate)
- [ ] `shared-chrome-connector-v2.js` — partially implemented connection pooling; `shared-chrome-connector.js` is simpler and sufficient
- [ ] `launch-edge.js` / `launch-shared-chrome.js` — if these are simple one-liners, they could be archived and replaced with npm scripts in `package.json`

### Other
- [ ] Any `.bak`, `.old`, or `.test` files in `lib/` or `optimized/`

---

## 7. Recommended Action Plan

### Immediate (Do Today)
1. **Rotate passwords:** HEB password `$Tandal0ne` and Facebook password `section9`.
2. **Fix `dinner-automation.js`:** Correct the broken `require()` paths.
3. **Delete hardcoded credentials** from `heb-cart-shared.js` and `facebook-marketplace-automation.js`.

### Short Term (This Week)
4. **Archive superseded scripts** listed in Section 6.
5. **Consolidate email system** on `email-client.js`.
6. **Fix IMAP connection leak** in `email-client.js` with `try/finally`.

### Medium Term (Next 2 Weeks)
7. **Create one canonical HEB cart script** incorporating the best ideas from all variants (circuit breaker from `heb-complete-cart-v2.js`, shared lib usage from `heb-add-cart-refactored.js`, anti-bot logic from `heb-add-cart.js`).
8. **Move all config** (delays, batch sizes, selectors) into a single `config.json` or `.env` file.
9. **Add a simple health-check script** that verifies all `require()` paths resolve without executing browser automation.

### Long Term
10. **Write unit tests** for `exclude-manager.js`, `substitution-engine.js`, and `stock-manager.js` — these are the most stable, business-logic-heavy modules and would benefit from test coverage.
11. **Migrate from Playwright CDP to Playwright persistent context** or consider HEB's public API (if any) to reduce brittleness.

---

## 8. Files That Are Actually Well-Designed ✅

Not everything is terrible. These files demonstrate good patterns and should be preserved:

- **`credentials.js`** — Clean, well-documented credential management with env var fallback and `.env` support.
- **`email-client.js`** — Proper SMTP pooling, IMAP parallel fetching (could be optimized further), Discord fallback, LRU cache for ingredient normalization.
- **`exclude-manager.js`** — Clean CRUD operations, good CLI interface, consistent data model.
- **`substitution-engine.js`** — Reasonable domain logic, good separation of concerns from the manager.
- **`stock-manager.js`** — Simple, effective CLI tool with clear weekly vs. long-term distinction.
- **`facebook-marketplace-refactored.js`** — Good architecture using shared lib, class-based design, proper cleanup.

---

## Final Thought

> *"Brain the size of a planet, and they have me organizing grocery lists."* — Marvin

This codebase feels like exactly that. There's genuine engineering effort scattered across too many parallel experiments. The system will be far more maintainable — and far less likely to accidentally order 42 bottles of oyster sauce — once the duplication is pruned and the orchestrator is actually wired to modules that exist.

**Priority: Fix security exposures first, then archive duplicates, then consolidate.**
