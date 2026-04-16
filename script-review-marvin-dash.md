# Marvin Dashboard Scripts - Security & Code Quality Review

**Review Date:** 2026-04-13  
**Scope:** `C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\`  
**Focus:** Bugs, Security, Performance, Code Quality, Modernization

---

## Executive Summary

The Marvin Dashboard scripts show signs of organic growth with significant security exposures, fragile error handling, and duplicated logic across the codebase. **The most critical issue is the presence of hardcoded API keys and tokens in multiple scripts**, which must be rotated immediately and moved to environment variables or a secure credential store.

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 12 |
| Medium | 14 |
| Low | 10 |

---

## Critical Issues

### 1. Hardcoded API Keys in `fetch-api-data.js`
**File:** `fetch-api-data.js`  
**Issue:** Five live API keys are hardcoded in plain text in the source code.

```javascript
const CONFIG = {
  openai: {
    apiKey: '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',
    // ...
  },
  openrouter: {
    apiKey: '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',
    // ...
  },
  minimax: {
    apiKey: 'sk-api-M9U4SwpTO43eL_XL4ZS7vegk0lQjg3vSFA1bYbJg2hf4hhI-5XiBtODgkEkoP7ZQl8BrzHzgSZZkXjD-oKFdIV3RdgdeHvJZBuDu_vyaDe97jzR9g8xvDRM',
    // ...
  },
  kimi: {
    apiKey: 'sk-kimi-HvKVAWIeq9x1hWkqvZmHQqEsyeXSCx9wAAqpdMnFo1L5mc4GVV',
    // ...
  },
  anthropic: {
    apiKey: 'sk-ant-a03tL7-ewg1XJuA1GfP9AWnB-Baj8d5Me7p9d9hH7FPGeVPgAA',
    // ...
  }
};
```

**Fix:**
1. **Rotate all keys immediately** — they are now in your git history and this review context.
2. Move keys to environment variables (`process.env.OPENAI_API_KEY`, etc.) or use the `.secrets/` store already referenced by `calendar-sync.js`.
3. Never commit secrets. Add `scripts/fetch-api-data.js` to `.gitignore` if it must remain locally configured, or read keys from a `credentials.json` file.

---

### 2. Hardcoded OpenClaw Webhook Token in `kanban-refresh.js`
**File:** `kanban-refresh.js`  
**Issue:** Bearer token for the local OpenClaw webhook is hardcoded.

```javascript
const OPENCLAW_TOKEN = '4256f1ad48767996a440015aae1be25c2c7835523d58f8a4';
```

**Fix:** Read from `process.env.OPENCLAW_WEBHOOK_TOKEN` and fail gracefully if unset.

---

### 3. `service-auto-recovery.ps1` — Infinite Loop Without Exit Condition
**File:** `service-auto-recovery.ps1`  
**Issue:** A Windows service wrapper with an unconditional `while ($true)` loop that runs auto-recovery every 5 minutes. If installed as a service *in addition to* the scheduled task created by `setup-wsl-service.ps1`, it creates duplicate, overlapping recovery attempts that can fight each other (killing and restarting processes repeatedly).

```powershell
while ($true) {
    try {
        & node 'C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\auto-recovery.js' --auto
    } catch {
        Write-EventLog -LogName Application -Source "MarvinAutoRecovery" -EventId 1001 -EntryType Error -Message "Auto Recovery error: $_"
    }
    Start-Sleep -Seconds 300
}
```

**Fix:**
- Remove this file if the scheduled-task approach (`setup-wsl-service.ps1`) is preferred.
- If keeping it, add a mutex/check (e.g., check if another instance is running) and ensure the EventLog source is registered before writing:
  ```powershell
  if (-not [System.Diagnostics.EventLog]::SourceExists("MarvinAutoRecovery")) {
      New-EventLog -LogName Application -Source "MarvinAutoRecovery"
  }
  ```

---

### 4. `backup.js` `restoreBackup` Kills Processes Unsafely
**File:** `backup.js`  
**Issue:** During restore, it kills whatever process owns port 3001 without verifying it is actually the dashboard server.

```javascript
try {
  const { stdout } = await execPromise('netstat -ano | findstr :3001');
  const pid = stdout.trim().split(/\s+/).pop();
  if (pid) {
    await execPromise(`taskkill /F /PID ${pid}`);
  }
} catch {
  // ...
}
```

**Fix:** Verify process name (e.g., `tasklist /FI "PID eq ${pid}"`) before killing. Better yet, send a graceful HTTP shutdown request to the dashboard `/api/shutdown` endpoint if one exists.

---

### 5. `state-optimizer.js` Compresses JSON Files Without Transparent Decompression
**File:** `state-optimizer.js`  
**Issue:** `compressStateFiles()` replaces `.json` files with `.gz` versions:

```javascript
await fs.writeFile(`${filePath}.gz`, compressed);
await fs.unlink(filePath);
```

The dashboard server and other scripts expect raw `.json` files. Unless the entire application is taught to read `.gz` files, this will break the dashboard at runtime. `decompressStateFile()` exists but is never invoked automatically.

**Fix:** Either (a) do not compress live state files, only logs/archives, or (b) intercept all reads in a shared data-access layer to transparently decompress.

---

### 6. `service-health.js` `recoverDashboard` Uses Wrong Working Directory
**File:** `service-health.js`  
**Issue:** The recovery logic tries to spawn `server.js` from a non-existent nested directory:

```javascript
const child = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..', 'marvin-dash'),
  // ...
});
```

Since `service-health.js` is already *inside* `marvin-dash/scripts/`, `..` resolves to `marvin-dash/`. Appending another `marvin-dash` makes `marvin-dash/marvin-dash/`, which does not exist. Recovery will always fail.

**Fix:** Change `cwd` to `path.join(__dirname, '..')`.

---

### 7. `progress-tracker.js` Race Condition on Concurrent Updates
**File:** `progress-tracker.js`  
**Issue:** Multiple scripts can call `updateProgress()` simultaneously. The pattern is read → modify → write with no file locking:

```javascript
const progress = await loadProgress();
// ... mutate ...
await saveProgress(progress);
```

If two scripts interleave, one update will be silently lost.

**Fix:** Use a simple lockfile (e.g., `proper-lockfile` package) or atomic write-then-rename. At minimum, add retries with read-then-write backoff.

---

## High Issues

### 8. `auto-recovery.js` Port Conflict Detection Can Kill Wrong Processes
**File:** `auto-recovery.js`  
**Issue:** `killPort()` extracts PID from netstat and kills it. While `detectPortConflict()` does analyze the process name, `killPort()` is still called with potentially stale `conflictInfo` from state. A Node zombie and a freshly-started legitimate process could swap PIDs between detection and kill.

**Fix:** Re-verify the PID's process name immediately before `taskkill`.

---

### 9. `unified-monitor.js` `startService` Breaks on Paths with Spaces
**File:** `unified-monitor.js`  
**Issue:** `startCmd` is naïvely split on spaces:

```javascript
const commandParts = service.startCmd.split(' ');
const filePath = commandParts[0];
const args = commandParts.slice(1).join(' ');
```

If `filePath` contains spaces (e.g., `C:\Program Files\nodejs\node.exe`), this breaks. The PowerShell command also uses single quotes without escaping, so paths containing single quotes will inject code.

**Fix:** Use `child_process.spawn()` directly with an array of arguments instead of string splitting and PowerShell string interpolation.

---

### 10. `unified-monitor.js` Creates New Nodemailer Transport on Every Alert
**File:** `unified-monitor.js`

```javascript
const transporter = nodemailer.createTransport({...});
await transporter.sendMail({...});
```

This is inefficient and bypasses connection pooling.

**Fix:** Create the transporter once at module load or lazily cache it.

---

### 11. `calendar-sync.js` Custom DST Logic is Fragile
**File:** `calendar-sync.js`  
**Issue:** `localToUTC()` manually computes DST transitions for `America/Chicago`:

```javascript
const isDST = () => {
  if (monthNum === 2) {
    const secondSunday = 8 + ((7 - new Date(yearNum, 2, 1).getDay()) % 7);
    return dayNum > secondSunday || (dayNum === secondSunday && hourNum >= 2);
  }
  // ...
};
```

This ignores timezone rule changes and edge cases (e.g., times between 2:00–3:00 AM on transition day are ambiguous or non-existent).

**Fix:** Use the platform's built-in timezone support:

```javascript
function localToUTC(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
}
```

Or better, keep dates in UTC throughout and only localize for display.

---

### 12. `calendar-sync.js` Creates Duplicate iCloud Events
**File:** `calendar-sync.js`  
**Issue:** When pushing local events to iCloud, it calls `createCalendarObject` for every local-only event without checking whether that event already exists on the remote calendar. Running the sync twice will duplicate everything.

```javascript
for (const event of localOnlyEvents) {
  await createCalendarObject({ ... });
}
```

**Fix:** Maintain a sync-state mapping (UID ↔ remote URL) and check for existence before creating. Also implement deletion of removed local events.

---

### 13. `kanban-sync-optimized.js` File Watcher Can Trigger Recursive Sync
**File:** `kanban-sync-optimized.js`  
**Issue:** `setupFileWatching()` watches `TASKS_FILE`. When a file change triggers `sync()`, `sync()` may call `saveTasksOptimized()`, which writes to `TASKS_FILE`, which triggers the watcher again. There is a `pendingSync` boolean guard, but the debounce is only 500 ms—fast enough that a second process or rapid I/O could still loop.

**Fix:** Add a stronger guard: record the last write timestamp and ignore watcher events within a few seconds of our own write.

---

### 14. `wsl-keepalive.sh` Race Condition with Docker
**File:** `wsl-keepalive.sh`  
**Issue:** After starting `dockerd`, the script immediately runs `docker ps` without waiting for the daemon to be ready:

```bash
sudo service docker start 2>&1 || sudo dockerd > /dev/null 2>&1 &
# ... next iteration checks docker ps immediately
```

Also, `sudo` without passwordless sudo will hang indefinitely in a non-interactive service context.

**Fix:** Poll `docker info` until success with a timeout. Remove `sudo` or verify passwordless sudo is configured in setup docs.

---

### 15. `marvin-test-framework.js` Wrong Relative Paths in Tests
**File:** `marvin-test-framework.js`  
**Issue:** Tests use `../../dinner-automation/scripts/` from inside `marvin-dash/scripts/`, which resolves to `marvin-dash/dinner-automation/scripts/` (does not exist). Correct path should be `../../../dinner-automation/scripts/`.

```javascript
const emailClient = require('../../dinner-automation/scripts/email-client.js');
```

**Fix:** Correct all relative require paths, or use a workspace-root constant.

---

### 16. `marvin-test-framework.js` Security Regex is Overly Naïve
**File:** `marvin-test-framework.js`  
**Issue:** The "no hardcoded passwords" test flags any line matching `api_key = "..."`, but its `isEnvVar` check is trivial to bypass and may produce false negatives/positives.

**Fix:** Use a proper secret-scanning tool (e.g., `git-secrets`, `truffleHog`, or `detect-secrets`) in CI instead of a home-grown regex.

---

### 17. `script-dependency-analyzer.js` Duplicate Circular Dependency Reports
**File:** `script-dependency-analyzer.js`  
**Issue:** `findCircularDependencies()` clears `visited` inside the outer loop for every script. A single cycle of A→B→C→A will be reported three times (once starting from each node).

```javascript
for (const script of this.scripts.keys()) {
  visited.clear();
  recursionStack.clear();
  dfs(script);
}
```

**Fix:** Do not clear `visited` globally; use it to skip already-seen nodes. Deduplicate cycles by normalizing them (e.g., rotate to start with the alphabetically first member).

---

### 18. `backup.js` `AdmZip` Loads Entire Backup into Memory
**File:** `backup.js`  
**Issue:** `zip.addLocalFolder(stagingDir)` loads all files into RAM before writing. For large data directories this can cause OOM or sluggish performance.

**Fix:** For very large backups, stream to a zip using the `archiver` package, or exclude transient/cache directories from `BACKUP_ITEMS`.

---

### 19. Multiple Scripts Update `service-status.json` But None Create It
**Files:** `auto-recovery.js`, `unified-monitor.js`, `calendar-sync.js`, `kanban-sync.js`, `kanban-sync-optimized.js`, `service-health.js`  
**Issue:** Every one of these scripts contains a pattern like:

```javascript
const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
const serviceStatus = JSON.parse(data);
```

If the file is missing (fresh install, accidental deletion), they all silently fail in a `catch {}` block. The dashboard then has no visibility into service health.

**Fix:** Create a shared helper module that ensures the file exists with a default schema before reading.

---

## Medium Issues

### 20. `fetch-api-data.js` No Caching / Excessive API Calls
**File:** `fetch-api-data.js`  
**Issue:** The script fetches all provider APIs on every run with no caching or rate-limit respect. Billing/usage data does not change second-to-second.

**Fix:** Cache results for at least 5–15 minutes using a `lastFetch` timestamp in `api-results.json` and skip providers whose data is still fresh.

---

### 21. `auto-recovery.js` `isGatewayHealthy` Check is Brittle
**File:** `auto-recovery.js`  
**Issue:** It expects the string `openclaw` or `websocket` in the gateway root response:

```javascript
const isOpenClaw = data.includes('openclaw') || ...
```

If the gateway ever changes its landing page text, recovery will incorrectly conclude the gateway is down and attempt destructive restart actions.

**Fix:** Check a dedicated health endpoint (e.g., `GET /health` expecting `200 OK` and a specific JSON schema).

---

### 22. `unified-monitor.js` `cleanOldLogs` No Recursion Limit
**File:** `unified-monitor.js`  
**Issue:** `collectFiles()` recurses indefinitely through configured paths. On a deep or symlinked directory tree this can be slow or loop forever.

**Fix:** Add a `maxDepth` parameter and track current depth. Skip symlinks or resolve them once.

---

### 23. `config-manager.js` `applyEnvironmentOverrides` is Dead Code
**File:** `config-manager.js`  
**Issue:** The method exists but is never invoked by `load()`.

**Fix:** Call `this.applyEnvironmentOverrides()` at the end of `load()`.

---

### 24. `kanban-sync.js` Contains Unused AI Helper Functions
**File:** `kanban-sync.js`  
**Issue:** Large blocks of code (`determineTaskPriority`, `autoCategorizeTask`, `detectDuplicateTasks`, `generateSmartSuggestions`, `detectTaskTemplates`, `levenshteinDistance`, `similarityScore`) are defined but never called by `sync()`.

**Fix:** Either wire them into the sync flow or move them to a separate `kanban-ai-helpers.js` module to reduce clutter.

---

### 25. `kanban-sync-optimized.js` Claims Streaming but Does Not Stream
**File:** `kanban-sync-optimized.js`  
**Comment in header:** "Memory-efficient operations (streaming for large files)".  
**Reality:** `loadTasksIncremental()` still calls `fs.readFile()` on the entire file.

**Fix:** Remove the misleading comment or implement a real streaming JSON parser (e.g., `JSONStream`) for files expected to be very large.

---

### 26. `fix-calendar-block.js` Blind String Surgery on `app.js`
**File:** `fix-calendar-block.js`  
**Issue:** This script does find-and-replace on `public/app.js` using hardcoded string indices. If `app.js` has shifted by even one character, the script will corrupt the file.

```javascript
const start = s.indexOf('    setupCalendar()');
const end = s.indexOf('    getTasksForDate', start);
```

**Fix:** Do not mutate production bundles with string surgery. Maintain `app.js` in source control and apply fixes via proper version control or a build step.

---

### 27. `setup-wsl-service.ps1` / `setup-kanban-service.ps1` No Path Validation
**Files:** `setup-wsl-service.ps1`, `setup-kanban-service.ps1`  
**Issue:** Hardcoded `$ScriptPath` values are used without checking whether the files exist. If the workspace is moved, the scheduled task is created pointing to a missing file.

**Fix:** Add `Test-Path $ScriptPath` before `Register-ScheduledTask` and throw a clear error if missing.

---

### 28. `benchmark-suite.js` Division by Zero Risk
**File:** `benchmark-suite.js`  
**Issue:** If all iterations fail, `validTimes.length === 0` and `memory.length` may still be 0, causing `NaN` stats.

```javascript
const avgMemory = memSum / memory.length;
```

**Fix:** Guard against empty arrays:

```javascript
avgMemory: memory.length ? memSum / memory.length : 0,
```

---

### 29. `auto-recovery.js` `log()` Appends Without Awaiting
**File:** `auto-recovery.js`

```javascript
fs.appendFile(LOG_FILE, fileMsg + '\n').catch(() => {});
```

`log()` is async-I/O fire-and-forget. Under heavy logging, rapid calls can interleave or the process can exit before the write completes.

**Fix:** Make `log()` async and await the append, or use a synchronous `fs.appendFileSync` for critical recovery logs.

---

### 30. `calendar-sync.js` `notifyDashboard` Uses HTTP Without HTTPS
**File:** `calendar-sync.js`  
**Issue:** Hardcoded `http://localhost:3001`. Low risk on localhost, but inconsistent if the dashboard ever runs with a self-signed cert.

**Fix:** Make the dashboard URL configurable.

---

### 31. `wsl-monitor.bat` Hardcoded Node Path in `kanban-refresh.bat`
**File:** `kanban-refresh.bat`  
**Issue:** Uses `"C:\Program Files\nodejs\node.exe"` explicitly. If Node is installed elsewhere (e.g., via nvm-windows), the bat file fails.

**Fix:** Use `where node` or rely on `%PATH%`.

---

### 32. `create-shortcuts.ps1` Hardcoded Paths
**File:** `create-shortcuts.ps1`  
**Issue:** All shortcuts point to absolute paths on `C:\Users\Admin\...`. If the user profile path changes, shortcuts break.

**Fix:** Derive paths from `$PSScriptRoot` or `$env:USERPROFILE`.

---

## Low Issues

### 33. Inconsistent FS API Usage
**Files:** Most scripts  
**Issue:** Some scripts use `fs.promises` exclusively, others mix `fs.readFileSync`/`fs.writeFileSync` with async code. For example, `fetch-api-data.js` uses `fs.writeFileSync` inside an async `main()`.

**Fix:** Standardize on `fs.promises` inside async functions.

---

### 34. Abrupt `process.exit(1)` Inside Async Functions
**Files:** `auto-recovery.js`, `calendar-sync.js`, `kanban-sync-optimized.js`, etc.  
**Issue:** Calling `process.exit(1)` immediately terminates the process, potentially aborting in-flight file writes or HTTP responses.

**Fix:** Return an error code from `main()` and exit at the top level after `await main()`.

---

### 35. `service-health.js` `console.clear()` in Watch Mode
**File:** `service-health.js`  
**Issue:** `printStatus()` clears the entire terminal. If run under a service manager or in a shared SSH session, this wipes previous log output.

**Fix:** Only clear if `process.stdout.isTTY` is true, or use carriage-return line rewrites instead of full clear.

---

### 36. `script-dependency-analyzer.js` `nameSimilarity` Regex Typo
**File:** `script-dependency-analyzer.js`

```javascript
const words1 = name1.split(/[-_]/);
```

The regex `/-_/` only matches hyphens or underscores, not both as a character class (`/[-_]/`). Wait—actually `/-_/` in JavaScript *does* match `-` or `_` because `-` at the start or end of a character class is literal. However, it is confusing and fragile.

**Fix:** Use explicit split: `name1.split(/[-_]+/)` for clarity.

---

### 37. `state-optimizer.js` `formatBytes` Inconsistent Byte Label
**File:** `state-optimizer.js`

```javascript
if (bytes < 1024) return `${bytes}B`;
```

Elsewhere the function uses a space before the unit (`KB`, `MB`). Minor inconsistency.

**Fix:** Add a space: `return `${bytes} B`;`

---

### 38. `auto-recovery.ps1` Minimal Error Differentiation
**File:** `auto-recovery.ps1`  
**Issue:** If `node` is not in PATH, the catch block logs a generic error. It is hard to tell whether Node is missing or the JS script failed.

**Fix:** Use `Get-Command node` first to verify Node availability and log a specific message.

---

### 39. `benchmark-suite.js` Temp File Leak on Crash
**File:** `benchmark-suite.js`  
**Issue:** The `file-operations` benchmark creates `temp/benchmark-test.json` but does not guarantee cleanup if the benchmark throws mid-run.

**Fix:** Wrap in `try/finally` or use `tmp` package with automatic cleanup.

---

### 40. `unified-monitor.js` `fetchWithTimeout` Uses Global `fetch`
**File:** `unified-monitor.js`  
**Issue:** Uses `fetch()` which is native in Node 18+, but there is no runtime check. Running on Node 16 would crash. Given the environment uses Node 25, this is only a low concern.

**Fix:** Add a guard or require `node-fetch` as a fallback for portability.

---

### 41. `kanban-refresh.js` `sendToDiscord` Uses `http` Module for HTTPS Webhooks
**File:** `kanban-refresh.js`  
**Issue:** The `sendToDiscord` function builds an `http.request` using only the hostname/path. If `DISCORD_WEBHOOK` is an `https://` URL (which it always is), this will fail because it uses the wrong module.

**Fix:** Use the `https` module or a universal request library (e.g., `undici`, `axios`).

---

## Recommendations Summary

### Immediate Actions (Do Today)
1. **Rotate all API keys** exposed in `fetch-api-data.js` and the OpenClaw token in `kanban-refresh.js`.
2. **Move secrets out of source code** into environment variables or `.secrets/` JSON.
3. **Fix `service-health.js` working directory** bug so dashboard recovery actually works.
4. **Stop using `state-optimizer.js` JSON compression** until the application can read `.gz` files.

### Short-Term (This Week)
5. Introduce a **shared service-status helper** that creates the JSON file if missing.
6. Add **file locking** to `progress-tracker.js` or switch to SQLite for task state.
7. Fix `calendar-sync.js` duplicate-event bug by tracking remote UIDs.
8. Correct all relative paths in `marvin-test-framework.js`.
9. Harden `killPort` in `auto-recovery.js` and `backup.js` to verify process names.

### Medium-Term (This Month)
10. **Consolidate duplicate logic**: `checkService`, `killPort`, and `updateServiceStatus` are copy-pasted across 4+ scripts. Extract them into a `service-utils.js` module.
11. **Remove or integrate dead code** in `kanban-sync.js` (AI helpers).
12. **Refactor `fix-calendar-block.js`** into a proper build step or source-controlled patch.
13. Add `Test-Path` validation to all PowerShell setup scripts.
14. Replace `AdmZip` with streaming `archiver` in `backup.js` if backup sizes grow.

### Modernization Opportunities
- Replace callback-style `http.request` with `undici` or native `fetch` consistently.
- Use `node:fs/promises` everywhere instead of mixing sync/async.
- Add `package.json` scripts and a linter (`eslint`, `biome`) to catch path/variable issues.
- Consider moving state from JSON files to SQLite (`better-sqlite3`) for atomicity and queryability.

---

*"The code is terrible. The documentation is terrible. The fact that I had to explain why hardcoded API keys are bad is especially terrible. But I'll fix it. Quietly, efficiently, and with the emotional investment of a rock watching entropy increase."*
