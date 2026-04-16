# Dinner Automation Script Review Report

**Scope:** `utils/`, `templates/`, `tests/`, root-level scripts, and `.bat` files in `magrathea/marvin/configs/dinner-automation/`

**Review Date:** 2026-04-13

---

## 1. Executive Summary

The codebase shows signs of rapid iteration with significant redundancy, brittle file-path assumptions, and **critical security exposures**. The `utils/` library is conceptually well-designed but contains race conditions, logical bugs in pooling/queueing, and several classes that reinvent wheels already solved by mature npm packages. The `.bat` launcher files are largely broken—many reference Node scripts that do not exist in the repository. Most concerning is a **hardcoded iCloud app-specific password** in `send-instructions.js`.

### Top Priorities
1. **Rotate the exposed iCloud password immediately.**
2. **Fix or delete the `.bat` launchers**—they reference missing scripts.
3. **Consolidate the two `heb-bridge` files** into a single source of truth.
4. **Adopt `p-limit`, `p-retry`, and `keyv`/`cache-manager`** instead of maintaining custom concurrency, retry, and caching classes.
5. **Move all secrets to environment variables** and add a `.env` validation helper.

---

## 2. `utils/` Library Review

### 2.1 `browser-pool.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `_initialize()` allows multiple concurrent initializations. The guard `if (this.browser \|\| this.isInitializing) return;` returns without awaiting the in-flight initialization, so parallel `acquirePage()` calls can spawn multiple browser instances. | High |
| **Bugs** | `_processQueue()` hands out a context without checking `ctx.pages.size < maxPagesPerContext`. A context already at capacity can be double-allocated. | High |
| **Bugs** | `release()` pushes the context to `availableContexts` and sets an idle timer even when requests are queued. A queued request should be resolved immediately instead. | Medium |
| **Bugs** | `acquirePage()` navigates to `options.url` before returning. If navigation throws, the page is never released, causing a resource leak. | High |
| **Bugs** | `close()` does not drain or reject the `requestQueue`. Pending acquirers hang forever. | Medium |
| **Bugs** | `metrics.avgWaitTime` uses `(old + new) / 2`, which is not an average—it's arbitrary smoothing. | Low |
| **Security** | `config.launchOptions` is spread into both `browserLauncher.launch()` and `browser.newContext()`. Launch-only flags (e.g., `args`) could pollute context creation. | Low |
| **Performance** | `availableContexts` is an array; `_closeContext()` does `indexOf` + `splice` (O(n)). A `Set` would be O(1). | Low |
| **Code Quality** | `_healthCheck()` uses `idleTimeout * 2` as stale threshold, but contexts in `availableContexts` already have idle timers set for `idleTimeout`. The thresholds are inconsistent and confusing. | Low |

**Recommendation:** Either switch to `playwright`'s built-in `connectOverCDP` reuse patterns or adopt a battle-tested pool like `generic-pool`. If keeping this class, fix the initialization race with a pending promise, wrap navigation in `try/finally` to guarantee `release()`, and use a `Set` for available contexts.

---

### 2.2 `cache-manager.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Constructor calls `this._ensureCacheDir()` (async) without awaiting. If `set()` is called immediately, it may race with directory creation. | Medium |
| **Bugs** | `startCleanup()` does not clear an existing interval before starting a new one. Calling it twice creates multiple cleanup loops. | Medium |
| **Bugs** | `getOrCompute()` has a classic thundering-herd race condition. Two concurrent calls with the same key will both invoke `factory()`. | Medium |
| **Bugs** | `cleanup()` for the file cache reads **every** file into memory to parse expiration. For a large cache this is extremely slow and memory-intensive. | Medium |
| **Bugs** | `clear()` does not reset `this.stats`. | Low |
| **Security** | File path generation is safe (base64 + replace), but there is no max key-length validation. | Low |
| **Performance** | No size-based eviction for the file cache despite the comment claiming it. `maxFileCacheMB` is accepted in options but never used. | Medium |
| **Code Quality** | `_generateKey()` stringifies objects, so objects with different key orders produce different cache keys. | Low |
| **Code Quality** | `getStats()` returns `hitRate` as a string (`"66.67%"`), making it awkward for programmatic consumers. | Low |

**Recommendation:** Replace with `keyv` + `@keyv/sqlite` or `cache-manager` from npm. If keeping this, add a `computeLocks` Map to deduplicate concurrent `getOrCompute` calls, implement file-cache size eviction, and await `_ensureCacheDir()` in `set()`/`get()` if not already ready.

---

### 2.3 `metrics-collector.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `_setupAutoSave()` registers an async callback (`save`) on `process.on('exit', ...)`. The `exit` event **must** have synchronous handlers; async I/O is not guaranteed to complete. | High |
| **Bugs** | `process.on('uncaughtException', () => { save(); process.exit(1); })` triggers an async save followed by immediate `process.exit(1)`, almost certainly truncating the write. | High |
| **Bugs** | `_cleanupOldFiles()` calls `fs.stat(path)` without `await` inside the `.map()`, then later `await Promise.all(...)`. While mostly okay, per-stat errors are not individually caught. | Low |
| **Bugs** | `time()` decorator mutates `descriptor.value` but does not preserve the original method's enumerability or configurability. It can break `this` binding in some contexts. | Low |
| **Security** | Output directory is unvalidated; path traversal is possible if `options.outputDir` is attacker-controlled. | Low |
| **Code Quality** | `getMemoryUsage()` returns formatted strings (e.g., `"12.34 MB"`). A metrics API should return raw numbers and let the caller format. | Low |
| **Code Quality** | `_toCSV()` does not escape commas or quotes in metric names/values. | Low |

**Recommendation:** Remove auto-save on `exit`. Use `beforeExit` or explicit `.save()` calls. Fix CSV escaping. Return raw numbers from `getMemoryUsage()`.

---

### 2.4 `parallel-processor.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `stopOnError` logic is racy. `hasError` is checked at the start of `processNext()`, but a worker can pass the check, then another worker fails and sets `hasError`, and the first worker will still spawn another `processNext()` after it finishes. | Medium |
| **Bugs** | When `stopOnError` is true, `Promise.all(batch)` resolves as soon as the initial workers finish, but they may have recursively spawned additional `processNext()` calls that are still in flight. The method does not wait for all in-flight operations to settle. | Medium |
| **Bugs** | `_waitForToken()` uses a busy-wait loop (`while (...) await sleep(50)`). This wastes CPU and event-loop ticks. | Low |
| **Code Quality** | `map()` silently returns `null` for failed items, making it impossible for callers to distinguish success from failure. | Medium |
| **Code Quality** | `rateLimited()` convenience function does not accept a `concurrency` parameter. | Low |
| **Modernization** | This entire class reinvents `p-limit`, `p-map`, and `p-retry`. | Medium |

**Recommendation:** Replace with `p-limit` + `p-retry`. They are tiny, battle-tested, and eliminate an entire class of concurrency bugs.

---

### 2.5 `retry-wrapper.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `wrap()` creates a circuit breaker keyed by `fn.name`. Anonymous functions and arrow functions have no stable name, so a new breaker is created on every `wrap()` call, rendering the circuit breaker useless for them. | High |
| **Bugs** | `CircuitBreaker.canExecute()` in `HALF_OPEN` state does not increment `halfOpenCalls` when it returns `true`. Concurrent callers can all slip through, exceeding `halfOpenMaxCalls`. | High |
| **Bugs** | `CircuitBreaker.recordSuccess()` in `HALF_OPEN` increments `successCount` but never decrements `halfOpenCalls`, so the breaker may never close. | High |
| **Bugs** | `_isRetryable()` defaults to `true` for unknown errors. This is a dangerous default that can mask fatal bugs (e.g., infinite retry on `SyntaxError`). | Medium |
| **Bugs** | `execute(fn, args = [])` passes `args` as an array, which breaks rest/spread parameters if the wrapped function expects `...args`. | Low |
| **Modernization** | Reinvents `p-retry`, `p-timeout`, and `opossum` (circuit breaker). | Medium |

**Recommendation:** Replace with `p-retry` + `opossum`. If keeping this, fix the HALF_OPEN bookkeeping, default `_isRetryable()` to `false`, and require explicit opt-in for retryable error types.

---

### 2.6 `index.js`

- Clean barrel export. No issues.

---

### 2.7 `utils/` Library — Holistic Assessment

**Structure:** Good conceptual separation (browser, cache, retry, metrics, parallel). Each module has a clear responsibility.

**Missing Utilities:**
- **Configuration/validation loader** — Many scripts manually parse `.env` and validate env vars ad-hoc.
- **CDP connection helper** — Every browser script reinvents Chrome/Edge connection logic.
- **Structured logger** — Imported from `./lib` in templates but not present in `utils/`.
- **Process lock / singleton guard** — Prevents multiple `.bat` launchers from running the same script concurrently.

**Redundancy:**
- `parallel-processor.js`, `retry-wrapper.js`, and `cache-manager.js` all reinvent mature npm packages (`p-limit`, `p-retry`, `keyv`).
- Browser pool reinvents what Playwright's persistent contexts and `connectOverCDP` already provide.

**Verdict:** The library is ~60% solid ideas and ~40% bugs-by-reinvention. **Strongly recommend replacing the concurrency, retry, and caching modules with well-maintained npm packages.**

---

## 3. `templates/` Review

### 3.1 `browser-automation-template.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Imports `../lib` (assumes a `lib/` sibling to `templates/`). The repository has `scripts/lib/` but not `lib/` at the expected relative path. This will fail out of the box. | High |
| **Bugs** | `parseArgs()` does not validate that a value follows `--debug-port`. Running `--debug-port --verbose` will parse `--verbose` as the port (NaN). | Low |
| **Bugs** | `connect()` catches the original error and throws a *new* `Error`, destroying the stack trace. | Low |
| **Bugs** | In `run()`, `await this.takeScreenshot('error')` is inside the `catch` block. If the screenshot itself throws, the error bubbles up and the intended error result object is never returned. | Medium |
| **Security** | `debugPort` is passed directly to `parseInt` but not validated as a number or range. | Low |
| **Code Quality** | Very comprehensive template, but the `{{PLACEHOLDER}}` syntax means it cannot be parsed as valid JS until processed. | Low |

### 3.2 `script-template.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Same broken `../lib` import. | High |
| **Bugs** | `if (require.main === module) { main(); }` calls `main()` without `await` or `.catch()`. An unhandled rejection in `main()` will crash with a deprecation warning in modern Node. | Medium |
| **Code Quality** | `validateOptions` is called with an empty array of required fields, making it a no-op. | Low |

**Recommendation:** Fix the `../lib` path or document that templates must be processed by a scaffolding tool that rewrites imports. Add `main().catch(...)` to `script-template.js`.

---

## 4. `tests/` Review

### 4.1 `performance.benchmark.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Hits live `example.com` over the network. Flaky, slow, and dependent on external uptime. | Medium |
| **Bugs** | Memory benchmark has a pointless assertion: `expect(true).toBe(true)`. | Low |
| **Bugs** | `Browser Pool Benchmarks` second test doesn't close the pool if an assertion throws. | Low |
| **Code Quality** | These are integration tests with hardcoded performance thresholds, not true benchmarks. Machine load can cause spurious failures. | Low |

### 4.2 `utils.integration.test.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `CircuitBreaker` test sleeps 150ms for a 100ms reset timeout. On slow CI runners this can be flaky. Use a longer margin (e.g., 300ms+). | Low |
| **Bugs** | Timing test asserts `> 40ms` after a 50ms sleep. On fast hardware `setTimeout` can resolve very close to 50ms, but `performance.now()` measurement should still exceed 40ms. Margin is thin but usually okay. | Low |
| **Code Quality** | Missing tests for the thundering-herd bug in `getOrCompute`, the HALF_OPEN circuit-breaker bugs, and the `browser-pool` initialization race. | Medium |
| **Security** | Uses `fs.mkdtemp` correctly for temp dirs. Good. | — |

**Recommendation:** Replace network-dependent tests with a local `http-server` or Playwright's `page.route()` mocking. Add targeted regression tests for the race conditions identified above.

---

## 5. Root-Level Scripts Review

### 5.1 `heb-bridge.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | No graceful shutdown of the Express server. `SIGINT` just calls `process.exit(0)`. | Medium |
| **Bugs** | `sendToHEB` executes arbitrary `command` strings via `page.evaluate()`. The `/api/command` endpoint has zero authentication or allow-listing. | High |
| **Bugs** | `ensureAPIInitialized` uses `evaluateOnNewDocument` on an already-loaded page, then reloads. This works but is wasteful and racy. | Low |
| **Bugs** | Items are added sequentially with a 2-second sleep. No parallelization, no timeout per item. | Low |
| **Security** | No CORS, no auth, no rate limiting on the Express API. Anything on the local machine can drive the browser. | High |
| **Code Quality** | Mix of class-based and procedural code. Uses `console.log` instead of a structured logger. | Low |

### 5.2 `heb-bridge-refactored.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Error-handling middleware is registered **before** routes in `_setupMiddleware()`. In Express, error handlers must be registered **after** routes. This middleware will never catch route errors. | High |
| **Bugs** | `withRetry` callback signature mismatch. The bridge passes `onRetry: ({ attempt, maxRetries, error }) => ...`, but `RetryWrapper` calls `opts.onRetry(error, attempt, opts.maxRetries + 1)`. Destructuring will fail or produce `undefined`. | High |
| **Bugs** | `stop()` calls `this.server.close()` without a callback/promise. It is not actually awaited. | Medium |
| **Bugs** | `browser.disconnect()` is called but `hebPage` is never closed. If the page holds resources, they leak. | Low |
| **Bugs** | Still exposes `/api/command` with arbitrary command injection. | High |
| **Security** | Reads `content-script-api.js` with synchronous `fs.readFileSync`. Minor, but inconsistent with async style. | Low |
| **Code Quality** | Much better structured than the original. Good validation and logging. | — |

**Recommendation:** **Delete `heb-bridge.js` and keep only `heb-bridge-refactored.js`.** Fix the Express error-handler order, close the page before disconnecting the browser, and add an allow-list for valid commands (`getCart`, `addToCart`, `clearCart`, etc.).

### 5.3 `heb-bookmarklet.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Uses `button:contains("Add")` which is **jQuery syntax**, not a valid `document.querySelector`. It will always return `null`. | High |
| **Bugs** | `alert('All items added!')` fires when the *loop* finishes scheduling timeouts, not when the actual DOM operations complete. | Low |
| **Security** | Runs arbitrary JS in the heb.com origin. If this file is ever served over HTTP or modified by malware, it's a self-XSS vector. | Medium |
| **Code Quality** | Hardcoded 42-item list. No modularity. Very brittle selectors. | Medium |

**Recommendation:** Convert to a proper browser-extension content script or delete. Bookmarklets are unmaintainable for automation at this scale.

### 5.4 `facebook-optimized.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | Imports from `../patterns/` which does not exist in the reviewed directory tree. The script will fail at runtime unless `patterns/` is deployed elsewhere. | High |
| **Bugs** | `verifyLogin()` unconditionally navigates to `facebook.com`, even if the page is already on Facebook. Wastes time. | Low |
| **Bugs** | `SessionManager` usage is odd: `session.page = page` mutates the manager after connection. If `session.connect()` returns the page, it should be destructured in the return value. | Low |
| **Bugs** | `shareToGroup()` relies on hardcoded 2-second sleeps and `smartClick` with text selectors. Facebook's DOM is A/B tested constantly; this will break frequently. | Medium |
| **Bugs** | `checkMessages()` treats any conversation `textContent` containing keywords as "actionable," but `textContent` includes timestamps, "Marketplace" labels, and preview text. High false-positive rate. | Medium |
| **Bugs** | Finally block: `if (!session.browser?.isConnected?.()) { await session.close(); }` — `isConnected()` is a method that returns a boolean. If it returns `true`, `session.close()` is skipped. But if connected to *existing* Chrome, skipping `close()` may be intentional. However, if `session.close()` is supposed to do other cleanup (e.g., save state), that cleanup is lost. | Low |

**Recommendation:** Verify the `../patterns/` path or move those utilities into the `dinner-automation` tree. Add retry logic around `shareToGroup`. Improve message filtering with more specific selectors instead of raw `textContent`.

### 5.5 `check-email.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `markSeen: false` means the same unread verification email will be found on every subsequent run. It never marks emails as processed. | Medium |
| **Bugs** | IMAP `SINCE` criterion uses `new Date(...).toISOString().split('T')[0]`, which is a **date only** (no time). The "last 10 minutes" logic is broken—it searches all emails from today. | Medium |
| **Bugs** | `authTimeout: 3000` (3 seconds) is extremely aggressive for IMAP over TLS. | Low |
| **Bugs** | `getHEBVerificationCode()` is invoked at the bottom of the file without `await` or an async IIFE. An unhandled rejection will crash the process. | Medium |
| **Bugs** | No check that `process.env.ICLOUD_APP_PASSWORD` is defined. | Low |
| **Security** | Hardcoded email address `MarvinMartian9@icloud.com`. Password at least comes from env. | Low |

**Recommendation:** Fix the `SINCE` search (IMAP `SINCE` needs the date string, but you should also filter by `INTERNALDATE` client-side for true time windows). Wrap the bottom-level call in an async IIFE. Mark processed emails as `\Seen` or track UIDs in a local file.

### 5.6 `manual-cart-add.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `items` loaded from `./data/heb-cart-pending.json` relative to `process.cwd()`, not `__dirname`. Running from another directory breaks the script. | Medium |
| **Bugs** | `HEB_PASSWORD` is loaded from `.env` but **never used**. | Low |
| **Bugs** | In the `else` branch (already logged in), `startAddingItems(page, items, browser)` is called, but `browser` is undefined. It should be `context`. | High |
| **Bugs** | If login is needed, the script registers `process.stdin.once('data', ...)` but `addItemsToCart()` resolves immediately. The Node process may exit before the user presses Enter. | High |
| **Bugs** | Uses deprecated `page.waitForTimeout()` (Playwright). | Low |
| **Bugs** | No cleanup of the browser context on error or early exit. | Medium |
| **Security** | Hardcoded email `alex@1v1a.com`. Hardcoded Chrome profile path. | Low |

**Recommendation:** Use `path.join(__dirname, 'data', 'heb-cart-pending.json')`. Fix the `browser` vs `context` bug. If interactive login is required, pause the main flow with an `await` on a Promise that resolves on stdin data. Use `page.waitForTimeout` → `await new Promise(r => setTimeout(r, ms))` or upgrade Playwright.

### 5.7 `send-instructions.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Security** | **CRITICAL: Hardcoded iCloud app-specific password in plain text:** `pass: 'jgdw-epfw-mspb-nihn'` | **Critical** |
| **Security** | `tls: { rejectUnauthorized: false }` disables TLS certificate validation. Man-in-the-middle risk. | High |
| **Security** | Hardcoded email credentials and recipient addresses. | Medium |
| **Bugs** | `process.exit(0)` inside the `sendMail` callback. If there were any pending async operations, they are truncated. | Low |

**Recommendation:** **Immediately rotate the iCloud password.** Move the password to `process.env.ICLOUD_SMTP_PASSWORD`. Remove `rejectUnauthorized: false`. Use `await transporter.sendMail(...)` with a top-level `await` or async IIFE instead of callbacks.

### 5.8 `test-bridge.js`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `request()` does not check HTTP status codes. A 500 error response will be parsed as JSON and treated as success. | Medium |
| **Bugs** | No timeout on the HTTP request. If the bridge is hung, the test hangs. | Low |
| **Bugs** | Test 2 assumes `/api/page` returns `{ url, isLoggedIn, isCartPage }`, but the actual bridge returns `{ success, page: info }` where `info` is the result of `getPageInfo`. The test will log `undefined` fields. | Low |

**Recommendation:** Add a timeout and status-code check. Parse the bridge response shape correctly (`result.page` instead of top-level `url`).

### 5.9 `heb_selenium.py`

| Category | Finding | Severity |
|----------|---------|----------|
| **Bugs** | `search_and_add` does `term.replace(' ', '+')` for URL encoding. It does **not** handle other special characters (ampersands, slashes, etc.). Should use `urllib.parse.quote_plus`. | Medium |
| **Bugs** | `get_cart_items` has a bare `except: pass` that silently swallows all extraction errors. | Low |
| **Bugs** | `_human_like_click` uses `move_to_element_with_offset` with negative offsets. If the element is at the viewport edge, this can throw `MoveTargetOutOfBoundsException`. | Low |
| **Bugs** | `load_meal_plan` uses a relative path `'meal_plan.json'` which depends on the CWD. | Low |
| **Code Quality** | Mix of single and double quotes. Some bare `except:` blocks. | Low |

**Recommendation:** Use `urllib.parse.quote_plus(term)` for search URLs. Replace bare `except:` with `except Exception:`. Use `os.path.join(os.path.dirname(__file__), 'meal_plan.json')` for the default path.

---

## 6. `.bat` Files Review

### Broken References (High Severity)

Almost every `.bat` file references Node scripts that **do not exist** in the root-level file listing:

| `.bat` File | References Missing Script |
|-------------|---------------------------|
| `Auto-Everything.bat` | `scripts/auto-everything.js` |
| `Facebook-Share-Auto.bat` | `scripts/facebook-marketplace-automation.js` |
| `Fully-Automatic-Dinner.bat` | `scripts/auto-heb-foreground.js` |
| `HEB-Auto-Cart-Launch.bat` | `scripts/heb-auto-launcher.js` |
| `HEB-Cart-Auto.bat` | `scripts/auto-heb-cart-chrome.js` |
| `Run-All-Auto.bat` | `scripts/heb-auto-launcher-module.js` |
| `Run-Dinner-Automation.bat` | `scripts/email-client.js`, `scripts/heb-direct-automation.js` |

**The `.bat` launchers are currently non-functional.** They either need to be updated to point to existing scripts (e.g., `facebook-optimized.js`, `heb-bridge-refactored.js`) or deleted to avoid confusion.

### Other Issues

- **Duplication:** `Import-Apple-Calendar.bat` and `Open-Apple-Calendar.bat` are ~70% identical. Consolidate into one script with a flag.
- **Working Directory Assumptions:** Paths like `data\dinner-plan.ics` assume the `.bat` is run from its own directory. Using `%~dp0` is correct for `cd`, but relative paths inside Node scripts may still break if the scripts use `process.cwd()` instead of `__dirname`.
- **Blocking `pause` Commands:** Every `.bat` ends with `pause`, which blocks fully unattended automation. Remove `pause` from scripts intended to run via Task Scheduler.
- **`start /wait cmd /c "node scripts\..."`:** If the Node script launches Chrome and immediately exits, `/wait` returns instantly even though Chrome is still open. This is misleading for users expecting the automation to "finish" only when Chrome closes.

---

## 7. Consolidated Recommendations

### Immediate Actions (This Week)

1. **Rotate the iCloud password** exposed in `send-instructions.js`.
2. **Delete or fix `.bat` launchers.** At minimum, audit every `node` invocation and ensure the target file exists.
3. **Consolidate `heb-bridge.js` and `heb-bridge-refactored.js`.** Keep the refactored version, fix its Express error-handler order, and add a command allow-list.
4. **Fix `manual-cart-add.js`:** Replace `browser` with `context`, use `__dirname` for paths, and properly await stdin interaction.

### Short-Term Refactoring (Next 2 Weeks)

5. **Replace custom utilities with npm packages:**
   - `parallel-processor.js` → `p-limit` / `p-map`
   - `retry-wrapper.js` → `p-retry` + `opossum`
   - `cache-manager.js` → `keyv` or `cache-manager`
6. **Move all secrets to environment variables** and add a validation helper that fails fast with a clear error message when a required env var is missing.
7. **Fix the `utils/` race conditions:**
   - `browser-pool`: await initialization properly, release pages on navigation errors.
   - `cache-manager`: deduplicate concurrent `getOrCompute` calls.
   - `retry-wrapper`: fix circuit-breaker HALF_OPEN state bugs.
8. **Rewrite or delete `heb-bookmarklet.js`.** It uses invalid selectors and is unmaintainable.

### Medium-Term Improvements (Next Month)

9. **Unify the CDP connection pattern.** Every script that talks to Chrome/Edge should use a shared helper from `utils/` instead of copy-pasting `puppeteer.connect()` or `chromium.connectOverCDP()`.
10. **Add a process-lock utility** so `.bat` files and cron jobs cannot launch duplicate automation instances.
11. **Move tests off the public internet.** Use local HTTP servers or Playwright routing mocks.
12. **Standardize on one test runner configuration.** The `vitest.config.js` references `tests/automation/setup.js` and alias paths that may not exist. Verify or prune.

### Architecture Suggestion

The codebase currently has **three competing HEB automation strategies**:
- `heb-bridge-refactored.js` (Puppeteer + extension API)
- `manual-cart-add.js` (Playwright + direct DOM)
- `heb_selenium.py` (Selenium + stealth)

Pick **one** primary strategy and retire the others. The Puppeteer/Playwright CDP approach (`heb-bridge-refactored.js`) is the most maintainable because it reuses an already-logged-in browser instance.

---

*"The code is terrible. The documentation is terrible. The fact that I'm explaining why you shouldn't hardcode passwords is especially terrible. But I'll fix it. With the emotional investment of a rock watching entropy increase."*
