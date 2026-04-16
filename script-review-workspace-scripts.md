# Workspace Scripts Review Report

**Review Date:** 2026-04-13  
**Scope:** `C:\Users\Admin\.openclaw\workspace\magrathea\marvin\scripts\workspace-scripts\`  
**Total Scripts Reviewed:** 26 files

---

## Executive Summary

This workspace has a **critical secret-management crisis**. Multiple scripts contain hardcoded passwords, API keys, and credentials in plain text—some committed directly to source control. Beyond security, there are significant functional bugs including wrong file paths in setup scripts, incompatible data formats between related Python tools, race conditions in the email monitors, and dangerously broad process-killing logic in the gateway recovery scripts. There is also substantial duplication between `email-monitor.js` and `email-monitor-v2.js`, as well as between the NAS drive and Docker deployment scripts.

### Critical Issues (Fix Immediately)
1. **Hardcoded credentials** in `facebook-share-f150.js`, `run-email-monitor.bat`, `deploy-nas-drive-automation.ps1`, `fix-nas-drives-scheduled.ps1`, `deploy-docker-service.ps1`, `deploy-docker-service.sh`, and `fix-marvin.ps1`.
2. **Wrong hardcoded paths** in `setup-email-monitor.ps1` pointing to `scripts/` instead of `workspace-scripts/`.
3. **Incompatible JSON format** between `music_export.py` (writes `artists` list) and `extract_artists.py` (reads `artist` string).
4. **Destructive data loss risk** in `fix-marvin.ps1` which deletes the entire `$env:LOCALAPPDATA\Docker` directory (images, containers, settings).
5. **Unsafe process termination** in `gateway-recovery.ps1` and `gateway-recovery.sh` that can kill unrelated Chrome/node processes.

---

## Per-Script Analysis

### 1. `email-monitor.js` (13KB)

**Bugs / Issues**
- **Race condition in IMAP fetch handling:** The `fetch.once('end')` handler sets a 1-second timeout and calls `imap.end()`, but individual message `end` handlers also call `imap.end()`. If `simpleParser()` is still async-processing the last message, the connection may close prematurely.
- **Unbounded state growth:** `lastNotifiedUids` stores every notified UID forever with a timestamp, but old entries are never purged. Over time this JSON state file will grow indefinitely.
- **Global timeout kills the process abruptly:** `setTimeout(() => { process.exit(1) }, 5 * 60 * 1000)` prevents graceful cleanup and can corrupt the state file mid-write.
- **Certificate validation disabled:** `tlsOptions: { rejectUnauthorized: false }` makes the IMAP connection vulnerable to MITM attacks.
- **Synchronous account checking:** Accounts are checked sequentially. If one account hangs, it delays all others.

**Security**
- `rejectUnauthorized: false` is a security anti-pattern.
- Passwords loaded into memory from config; no validation that config file has restrictive permissions.
- State file (`email-monitor-state.json`) contains metadata but no encryption.

**Performance**
- Fetches the *entire email body* (`bodies: ''`) for every unseen message before determining importance. For accounts with many unread emails, this is very slow.
- Should fetch headers first, then bodies only for emails that pass header-based filtering.

**Code Quality**
- Mixes IMAP logic, configuration, notification orchestration, and CLI parsing in one file.
- `SPAM_PATTERNS` exclusion logic is naive string matching that could false-positive on legitimate subjects.
- Missing cleanup of `notifiedUids` old entries.

**Modernization / Consolidation**
- **Should be consolidated with `email-monitor-v2.js`.** There are two competing implementations in the same directory. Pick one architecture and delete the other.
- Replace `imap` + `mailparser` with a more modern library if one exists, or at least use async generators for message processing.

---

### 2. `email-monitor-v2.js` (11KB)

**Bugs / Issues**
- Same IMAP race condition as v1: `clearTimeout(timeout)` and `imap.end()` can fire from multiple event handlers concurrently.
- **Does not actually send notifications.** It finds important emails, updates state, and logs them to console, but there is no integration with `email-notifier.js`. This makes it functionally incomplete as a replacement for v1.
- **Broken relative import:** `require('../../lib/utils/circuit-breaker')` resolves *outside* the `workspace-scripts/` directory. If the circuit breaker doesn't exist at that exact relative path, the script crashes on load.
- `checkAccount` resolves with partial results on timeout, but doesn't indicate which emails were already processed, leading to potential duplicate notifications on retry.
- Same unbounded `lastNotifiedUids` growth as v1.

**Security**
- No `rejectUnauthorized: false` in the default config shown, but the pattern from v1 could easily be reintroduced via `tlsOptions` in config.

**Performance**
- Parallel account checking is an improvement over v1.
- Still fetches full email bodies instead of headers-first.

**Code Quality**
- Better structure as a class (`EmailMonitorV2`), but the incomplete notification pipeline is a major regression.
- The CLI usage at the bottom hardcodes default account configs using env vars, which is fine, but duplicates config logic from `email-config.js`.

**Modernization / Consolidation**
- **Merge with v1 or delete one.** Maintaining two email monitors is technical debt. If v2 is kept, wire it up to `email-notifier.js` and fix the circuit breaker import path.

---

### 3. `email-notifier.js` (7KB)

**Bugs / Issues**
- **Silent error swallowing:** `sendToOpenClaw()` has `req.on('error', (err) => resolve())`, which hides all network errors. Debugging why the OpenClaw webhook isn't working is impossible.
- **Timeout handler is never armed:** `req.on('timeout', () => { req.destroy(); resolve(); })` is set, but `req.setTimeout(ms)` is never called, so the timeout event will never fire.
- `DISCORD_WEBHOOK` falls back to `KANBAN_DISCORD_WEBHOOK` env var. This cross-dependency is brittle.

**Security**
- Discord webhook URL sourced from env var—acceptable practice, but no URL validation to ensure it's actually a Discord webhook domain.
- `formatEmailNotification()` builds a plain-text message; no risk of injection since data comes from parsed emails.

**Performance**
- Notification log (`email-notifications.json`) is read entirely into memory, mutated, and rewritten. For a small file this is fine, but appending would be more efficient.

**Code Quality**
- `ensureDataDir()` catches errors but does nothing with them, making directory creation failures invisible.
- Raw `http`/`https` module usage is verbose and error-prone.

**Modernization**
- Replace raw `http`/`https` with `fetch` (available in Node 18+) or a small HTTP client like `undici`.
- Fix the timeout logic or remove it if unused.

---

### 4. `email-config.js` (2KB)

**Bugs / Issues**
- `saveConfig()` does not validate input, so a malformed config object can corrupt the file.
- `CONFIG_PATH` is exported, which is unnecessary and leaks the file location.

**Security**
- The JSON config file at `email-config.json` can store passwords in plain text if `saveConfig` is called with credential data. No file permissions are enforced.
- Default config contains real email addresses (`MarvinMartian9@icloud.com`, `9marvinmartian@gmail.com`). While not secrets, this is PII in source code.

**Performance**
- Fine for its purpose.

**Code Quality**
- Clean, focused module. The merge logic between file config, env vars, and defaults is clear.

**Modernization**
- Consider using Windows Credential Manager or DPAPI for password storage instead of a JSON file.

---

### 5. `system-health-check.js` (11KB)

**Bugs / Issues**
- **`require('dotenv').config()` is used but `dotenv` is not in `package.json`.** If it's not installed globally, the `sendHealthEmail()` function will crash when called.
- Dashboard path uses `process.cwd()` instead of a reliable workspace root. If the script is run from a different directory, the dashboard update fails or writes to the wrong place.
- `--log` logic: `if (args.log || !args.json)` means it logs to file on *every* run except `--json`. This includes `--quiet`, which is probably unintended.
- Exit code documentation says `3 = Error running checks`, but if `--email` is passed and `sendHealthEmail()` throws *after* checks succeed, the script exits with code 3 even though checks passed.

**Security**
- Loads `ICLOUD_APP_PASSWORD` from environment. Acceptable.
- HTML email report uses `map().join('')` with check messages. If `check.message` contains user-controlled strings, this is a theoretical XSS vector in email clients, though risk is low in this context.

**Performance**
- `HealthMonitor` implementation is not visible in this review scope, but the script itself is efficient.

**Code Quality**
- Well-structured with clear separation of concerns.
- `writeLogFile()` has an empty `catch {}` for directory creation, which is acceptable but could log on failure.

**Modernization**
- Add `dotenv` to `package.json` if it's intended to be a dependency.
- Change log condition to `if (args.log)` only, or respect `--quiet`.

---

### 6. `gateway-recovery.ps1` (11KB)

**Bugs / Issues**
- **Unreliable `CommandLine` filtering:** `Get-Process` does *not* return the `CommandLine` property by default in standard PowerShell. The filters `$_.CommandLine -like "*openclaw*"` will silently fail to match anything on most systems, making the process-killing logic ineffective. **Must use `Get-CimInstance Win32_Process` to get `CommandLine`.**
- **Port 18800 is undocumented:** `Test-BrowserHealth` checks `http://127.0.0.1:18800/json/version`. TOOLS.md documents Chrome on port 9224 and Edge on port 9222. Port 18800 is not mentioned anywhere and may be stale config.
- **`Get-NetTCPConnection` assumption:** `$PortInUse = Get-NetTCPConnection -LocalPort 18789` may return *multiple* connections, but `$PortInUse.OwningProcess` assumes a single object. This will fail or pick an arbitrary process if multiple connections exist.
- **`Invoke-HiddenCommand` stderr deadlock risk:** StandardError is redirected but never read. If the child process writes enough to stderr, it can deadlock waiting for the buffer to be drained.
- **Broad process killing:** Kills *all* node processes matching "openclaw" in command line. This could kill legitimate long-running OpenClaw tasks or subagents.
- **Chrome killing violates TOOLS.md policy:** The script tries to preserve Facebook Chrome on port 9224, but because `CommandLine` isn't reliably available, it may kill the wrong Chrome instance anyway.

**Security**
- Killing processes based on string matching is dangerous and can affect unrelated services.
- No privilege escalation checks beyond assuming the script is run with appropriate rights.

**Performance**
- Multiple redundant `Get-Process` calls. Could cache the process list once.

**Code Quality**
- Function structure is good. Logging is adequate.
- The `SUCCESS` log level is used but not standard in PowerShell logging frameworks; it's just a string.

**Modernization**
- Replace `Get-Process` with `Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"` for reliable `CommandLine` access.
- Use `Start-Process` consistently instead of mixing with `Start-ScheduledTask` and `schtasks.exe`.

---

### 7. `gateway-recovery.sh` (4.8KB)

**Bugs / Issues**
- **`taskkill /F /IM chrome.exe` kills ALL Chrome processes**, including the Facebook Chrome on port 9224. This directly violates the browser separation documented in TOOLS.md.
- **Incorrect `taskkill` filter syntax:** `taskkill /F /IM node.exe /FI "COMMANDLINE eq *openclaw*"` uses `eq` (exact equality) with wildcards. `eq` does not support wildcards in `taskkill`; this filter likely kills NO processes or fails silently. Should use `tasklist` piped to filtering, or PowerShell with `Get-CimInstance`.
- Same undocumented port 18800 issue as the PowerShell version.
- `repair_browser` sets `browser_success=true` even if `repair_browser` returns 1. The comment says "Don't fail overall if browser repair fails," but this masks real failures.

**Security**
- Broad process termination from WSL into Windows can disrupt user workflows.

**Performance**
- Fine.

**Code Quality**
- Mirrors the PowerShell version's logic, which means it inherits the same architectural issues.

**Modernization**
- Use `powershell.exe` with a targeted `Get-CimInstance` query instead of `taskkill` filters.
- Consider if a WSL-based recovery script is even necessary if the PowerShell version exists.

---

### 8. `setup-gateway-recovery.ps1` (3KB)

**Bugs / Issues**
- **Non-interactive execution will fail:** The script ends with `$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`. If run via SSH, another script, or Task Scheduler, this throws an exception because there is no interactive host.
- **Inconsistent task creation API:** Uses legacy `schtasks.exe` instead of PowerShell's `New-ScheduledTask` cmdlets used in other scripts (`setup-email-monitor.ps1`, `deploy-docker-service.ps1`).
- **No validation of `$CheckIntervalMinutes`:** Negative or zero values are accepted without error.

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- Mixing `schtasks.exe` with PowerShell is inconsistent and harder to maintain.

**Modernization**
- Replace `schtasks.exe` with `New-ScheduledTask` / `Register-ScheduledTask`.
- Remove or make optional the interactive `ReadKey` prompt.
- Add parameter validation.

---

### 9. `setup-gateway-recovery-wsl.sh` (1.9KB)

**Bugs / Issues**
- **Unsafe cron manipulation:** Uses `crontab -l | grep -v ... | crontab -` which is race-prone and can lose cron entries if multiple scripts do this simultaneously.
- **No check that `cron` is actually running.** On many WSL distributions, cron is not started by default.
- Redirects *all* output (`>/dev/null 2>&1`), so if the recovery script fails, there is no log of *why* it failed. The log file path is mentioned but the cron job doesn't write to it on failure.

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- Simple and functional, but the cron manipulation is fragile.

**Modernization**
- Consider using `systemd` timer or a simple `while sleep 300; do ... done` loop in a service instead of cron.

---

### 10. `gateway-recovery.bat` (422B)

**Bugs / Issues**
- None significant. It's a thin wrapper around the PowerShell script.

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- Simple wrapper, acceptable for its purpose.

**Modernization**
- Could be eliminated if scheduled tasks call PowerShell directly.

---

### 11. `setup-email-monitor.ps1` (3KB)

**Bugs / Issues**
- **WRONG PATHS:** Hardcodes `C:\Users\Admin\.openclaw\workspace\scripts\email-monitor.js` and `C:\Users\Admin\.openclaw\workspace\scripts\run-email-monitor.bat`. The actual directory is `workspace-scripts/`, not `scripts/`. This scheduled task will fail immediately because the batch file doesn't exist at that path.
- Same wrong path for `$WorkingDir`.
- `S4U` logon type with a batch file wrapper may have credential delegation issues if the batch file needs interactive privileges (though it doesn't).

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- Major functional bug due to stale directory name.

**Modernization**
- Derive paths dynamically using `$PSScriptRoot` instead of hardcoding absolute paths.

---

### 12. `run-email-monitor.bat` (1.7KB)

**Bugs / Issues**
- **CRITICAL: Hardcoded passwords in plain text.**
  - `set ICLOUD_APP_PASSWORD=jgdw-epfw-mspb-nihn`
  - `set GMAIL_PASSWORD=section9`
  The comment even says "App-specific password from TOOLS.md".
- **Hides window but prints passwords to console:** If the window hiding fails or the script is inspected, the passwords are visible in the batch file source.
- No check that Node.js is installed before calling `node email-monitor.js`.

**Security**
- **SEVERE:** Passwords are committed to source control in plain text. Anyone with repo access can read them. The iCloud app-specific password is a high-value credential.
- Should use Windows environment variables, Windows Credential Manager, or at minimum a separate `.env` file excluded from git.

**Performance**
- Fine.

**Code Quality**
- Extremely poor security practice.

**Modernization**
- Remove all hardcoded credentials immediately.
- Use `cmd /c` hidden launch via PowerShell or VBS if window hiding is needed, rather than the self-recursive batch pattern.

---

### 13. `facebook-share-f150.js` (4KB)

**Bugs / Issues**
- **CRITICAL: Hardcoded Facebook credentials in plain text:**
  - Email: `alex@xspqr.com`
  - Password: `section9`
- **Fragile selectors:** Uses `await page.$('text=Share')`, `await page.$('text=Share to a group')`, and `await page.$('button:has-text("Post"), button:has-text("Share")')`. Facebook changes their DOM constantly; these selectors will break.
- **No error recovery:** If any step fails (login, navigation, share dialog), the script aborts with no retry or screenshot-on-failure.
- **Fixed marketplace URL:** The item URL `https://www.facebook.com/marketplace/item/2269858303434147/` is hardcoded. If the listing changes or is deleted, the script fails.
- `browser.close()` doesn't check if `browser` was successfully launched.

**Security**
- **SEVERE:** Hardcoded social media credentials in source code.
- Uses `launchPersistentContext` with profile path `C:\Users\Admin\.openclaw\browser\openclaw\user-data`, which is the OpenClaw browser profile. Per TOOLS.md, this profile should be separate from Facebook Chrome. The script appears to be using the wrong profile directory.

**Performance**
- Multiple `page.waitForTimeout()` calls instead of waiting for actual UI state changes. This is slower and more brittle than necessary.

**Code Quality**
- Entire logic is in one big `try/catch` block with no modular functions.
- No logging beyond `console.log`.

**Modernization**
- Move credentials to environment variables or a secure vault.
- Use more robust selectors (data-testid, aria-labels) or the Facebook Graph API if available.
- Break into smaller functions: login, navigate, share.

---

### 14. `deploy-nas-drive-automation.ps1` (5KB)

**Bugs / Issues**
- **CRITICAL: Hardcoded password:** `$Password = '$Tandal0nec0mplex9'` in plain text.
- **Generated script stores password in plain text:** The script writes another PowerShell script to `C:\ProgramData\NASDriveMapping.ps1` containing the password in plain text. This is a persistent credential leak on disk.
- **`Test-Connection -Count 1` is unreliable:** A single ICMP packet may be dropped even if the NAS is reachable.
- **Event log source may not exist when generated script runs:** The source is created during deployment, but if the generated script runs on another machine or after the source is removed, `Write-EventLog` will fail.
- **`net use` with `/persistent:yes` in a scheduled task context** often fails because the task may not have a persistent user session.

**Security**
- **SEVERE:** NAS password hardcoded in source and written to `C:\ProgramData\` in plain text.
- `C:\ProgramData\` is readable by all users on the machine. Any local user can read the NAS password.

**Performance**
- Fine.

**Code Quality**
- Meta-scripting (generating another script) is error-prone and hard to debug.
- Drive mappings are duplicated between this script and `fix-nas-drives-scheduled.ps1`.

**Modernization**
- Store credentials in Windows Credential Manager.
- Use `New-SmbMapping` with `-Credential` objects instead of `net use`.
- Eliminate script generation; create a reusable, parameterized module.

---

### 15. `fix-nas-drives-scheduled.ps1` (2KB)

**Bugs / Issues**
- **Same hardcoded password as deploy-nas-drive-automation.ps1:** `$Password = '$Tandal0nec0mplex9'`.
- **Same plain-text generated script issue:** Writes credentials to `C:\ProgramData\NASDriveMapping.ps1`.
- `Remove-SmbMapping -Force` without checking if the mapping is actually stale could disconnect active file handles.
- Duplicate functionality with `deploy-nas-drive-automation.ps1`.

**Security**
- **SEVERE:** Same credential exposure issues.

**Performance**
- Fine.

**Code Quality**
- Nearly identical to `deploy-nas-drive-automation.ps1` but with fewer drive mappings. Maintaining both is unnecessary.

**Modernization**
- **Consolidate with `deploy-nas-drive-automation.ps1`.** There should be one NAS drive mapping script, parameterized by hostname.

---

### 16. `monitor-ha-proxy.ps1` (3KB)

**Bugs / Issues**
- **Parameters are ignored in regex matching:** The script accepts `$ExpectedDestinationIP` but the regex hardcodes `10\.0\.1\.90`:
  ```powershell
  if ($line -match "0\.0\.0\.0\s+8124\s+10\.0\.1\.90\s+8123") { ... }
  ```
  If the IP is ever changed via parameter, the script will report it as incorrect.
- **Purely informational:** The script logs warnings but does not exit with a non-zero code, fix the proxy, or send alerts. It doesn't actually "monitor" in an actionable sense.
- **`netsh` output parsing is fragile:** Column spacing in `netsh interface portproxy show all` can vary between Windows versions.

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- Variables `$proxy8124Correct` and `$proxy8123Correct` are set but never used for any decision logic.
- The script doesn't fulfill its stated purpose of monitoring and alerting.

**Modernization**
- Use `netsh` with explicit show commands or parse more robustly.
- Add a `-Fix` switch that runs `netsh interface portproxy add v4tov4` if the proxy is missing.
- Return exit codes: 0 = healthy, 1 = misconfigured, 2 = unreachable.

---

### 17. `deploy-docker-service.ps1` (4KB)

**Bugs / Issues**
- **Hardcoded credentials in registry:** Sets `AutoAdminLogon`, `DefaultUserName`, and `DefaultPassword` to `admin`/`section9` in the Windows registry. Registry-based auto-logon stores passwords in plain text (albeit obfuscated from casual viewing).
- **Modifies `settings.json` without backup:** If `ConvertFrom-Json` or `ConvertTo-Json` corrupts the file, Docker Desktop settings are lost.
- **Redundant auto-start mechanisms:** Creates a scheduled task, a startup shortcut, AND updates Docker Desktop's own auto-start setting. Three mechanisms for the same goal.

**Security**
- Hardcoded password in registry.
- `section9` appears in multiple files, making it a known, reused password.

**Performance**
- Fine.

**Code Quality**
- The `-Restart` switch force-reboots the machine with only a 10-second warning. Dangerous in production.

**Modernization**
- Parameterize username and password.
- Remove redundant startup mechanisms; the scheduled task is sufficient.
- Backup `settings.json` before modifying it.

---

### 18. `deploy-docker-service.sh` (4KB)

**Bugs / Issues**
- **Same hardcoded credentials** (`admin`/`section9`) as the PowerShell version.
- **WSL managing Windows is an anti-pattern:** Running a bash script in WSL to configure Windows registry entries and scheduled tasks is brittle and hard to maintain.
- **Docker Desktop cannot run as a true Windows service:** The script tries to install an `nssm` service wrapper, but Docker Desktop requires a GUI session and WSL2 integration. Running it as a non-interactive service will likely fail or behave unpredictably.
- **Git Bash path style:** `mkdir -p "/c/ProgramData/DockerDesktop"` relies on MSYS path translation, which may not work in all WSL distributions.

**Security**
- Hardcoded password.

**Performance**
- Fine.

**Code Quality**
- Duplicates the PowerShell version's functionality in a less appropriate language for the target OS.

**Modernization**
- **Delete this script.** The PowerShell version (`deploy-docker-service.ps1`) is the correct tool for managing Windows configuration. Maintaining both is unnecessary and the bash version is architecturally wrong for this use case.

---

### 19. `fix-marvin.ps1` (2KB)

**Bugs / Issues**
- **DESTRUCTIVE OPERATION DISGUISED AS CACHE CLEAR:**
  ```powershell
  Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker"
  ```
  This deletes the **entire Docker Desktop data directory**, including all images, containers, volumes, settings, and build cache. The comment says "Clearing Docker Desktop cache" which is extremely misleading.
- **Same hardcoded credentials** (`admin`/`section9`) in registry.
- **Wipes WSL data implicitly:** Removing `$env:LOCALAPPDATA\Docker` can corrupt the WSL2 backend state for Docker.
- No confirmation prompt before data destruction.

**Security**
- Hardcoded password.
- Data destruction without access control.

**Performance**
- Deleting a large Docker data directory can take a long time and cause disk I/O spikes.

**Code Quality**
- The script name suggests a general "fix" but its primary action is the most destructive possible option.

**Modernization**
- Rename the script to `reset-docker-desktop.ps1` to accurately reflect what it does.
- Add a `-Confirm` switch or explicit warning.
- If the goal is just to fix startup issues, use `wsl --shutdown` and restart Docker Desktop without deleting data.

---

### 20. `music_export.py` (7KB)

**Bugs / Issues**
- `export_spotify(username)` accepts a `username` parameter but never uses it.
- `open_browser=True` in `SpotifyOAuth` will fail in a headless/SSH environment.
- `ytmusicapi.setup()` call is interactive (prompts for headers). Running `music_export.py all` in an automated context will hang forever at the YouTube Music step.
- `get_library_albums` followed by `get_album` for every album is an N+1 query pattern. For large libraries, this is very slow.
- No handling for YouTube Music auth token expiration.

**Security**
- Spotify credentials come from environment variables—good practice.
- No hardcoded secrets.

**Performance**
- N+1 album fetching is slow.
- Could parallelize album detail fetching with `asyncio` or `concurrent.futures`.

**Code Quality**
- Clean structure with separate functions for each service.
- `ensure_ascii=False` in JSON dumps is correct for Unicode artist names.
- Missing type hints on some functions.

**Modernization**
- Remove unused `username` parameter.
- Add a `--non-interactive` flag that skips YouTube Music setup if auth file doesn't exist.
- Consider batching or parallelizing album detail requests.

---

### 21. `extract_artists.py` (2KB)

**Bugs / Issues**
- **INCOMPATIBLE WITH `music_export.py` OUTPUT FORMAT:** `music_export.py` stores artist data as a *list* under the key `'artists'`:
  ```json
  {"title": "...", "artists": ["Artist 1", "Artist 2"]}
  ```
  But `extract_artists.py` reads `song.get('artist', '')` (singular string). For files produced by `music_export.py`, this will return an empty string or `None` for every song, resulting in zero extracted artists.
- The regex split `r'\s*x\s+'` will incorrectly split artist names containing " x " (e.g., "Tyler x Creator").

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- The fundamental data format mismatch makes this script non-functional with its companion tool.

**Modernization**
- Update to read `song.get('artists', [])` and iterate over the list.
- Fix the regex to avoid splitting on " x " in artist names, or use a more conservative separator list.

---

### 22. `git-backup.ps1` (1.8KB)

**Bugs / Issues**
- `git push origin "HEAD:$NodeName"` may fail if the remote branch doesn't exist yet. There is a fallback to `git push -u`, but if the first failure was due to auth/network, the second push will also fail and the error message won't distinguish the cause.
- No `git pull` or fetch/merge logic before push. If another machine pushed to the same branch, this script will fail to push (non-fast-forward) and report an error.
- `git config user.email` and `user.name` are set every run. Harmless but unnecessary.

**Security**
- Assumes git credential helper is configured. No credential leakage in the script itself.

**Performance**
- `git add -A` on a large workspace could be slow.

**Code Quality**
- Simple and mostly functional.

**Modernization**
- Add `git pull --rebase origin $NodeName` before push, or use `git push --force-with-lease` if the branch is machine-specific.

---

### 23. `git-backup.sh` (1.6KB)

**Bugs / Issues**
- Similar to the PowerShell version: no pull/merge before push.
- **Behavior divergence from `git-backup.ps1`:** The shell script falls back to pushing to `main` if the node-name branch fails:
  ```bash
  git push origin HEAD:main 2>/dev/null || git push -u origin HEAD:main 2>/dev/null
  ```
  The PowerShell version does *not* have this fallback. This means Windows and Linux backups could behave differently, with Linux potentially overwriting `main`.
- The nested `if [ $? -eq 0 ]` after an `||` chain is slightly confusing but technically works.

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- `2>/dev/null` suppresses all errors, making debugging difficult.

**Modernization**
- Align behavior with `git-backup.ps1` (don't fall back to `main`).
- Remove `2>/dev/null` or redirect to the log file instead.

---

### 24. `register-backup-task.ps1` (1.1KB)

**Bugs / Issues**
- **BOM character at start of file:** `﻿param(` indicates a UTF-8 BOM, which can cause PowerShell parsing issues in some editors or when the file is concatenated with others.
- **`-LogonType Interactive` prevents unattended execution:** The task will only run when the user is logged in. For an automated backup task, this defeats the purpose if the machine is left at a login screen.
- No validation of `$IntervalHours` (negative values accepted).
- `Unregister-ScheduledTask` is inside a `try/catch` but the catch is empty, suppressing useful errors.

**Security**
- Fine.

**Performance**
- Fine.

**Code Quality**
- Generic utility script. Could be more robust.

**Modernization**
- Remove BOM and save as UTF-8 without BOM.
- Default to `-LogonType S4U` (Service-for-User) for true unattended execution, or make it a parameter.
- Add `[ValidateRange(1, 24)]` to `$IntervalHours`.

---

## Cross-Cutting Concerns

### 1. Secret Management Catastrophe
The following real credentials are hardcoded in source files:

| Credential | File(s) | Risk |
|------------|---------|------|
| iCloud app password: `jgdw-epfw-mspb-nihn` | `run-email-monitor.bat` | Email account takeover |
| Gmail/General password: `section9` | `run-email-monitor.bat`, `facebook-share-f150.js`, `deploy-docker-service.ps1`, `deploy-docker-service.sh`, `fix-marvin.ps1` | Account takeover, password reuse |
| NAS password: `$Tandal0nec0mplex9` | `deploy-nas-drive-automation.ps1`, `fix-nas-drives-scheduled.ps1` | NAS access, file exposure |
| Facebook email: `alex@xspqr.com` | `facebook-share-f150.js` | PII, social engineering |

**Immediate Action Required:**
1. Rotate ALL these passwords immediately.
2. Remove hardcoded values from source code.
3. Use Windows Credential Manager, environment variables, or a `.env` file excluded from git.
4. Add `.env` and `*.bat` (if they contain secrets) to `.gitignore`.

### 2. Duplication and Fragmentation
- **Two email monitors:** `email-monitor.js` and `email-monitor-v2.js` compete for the same responsibility.
- **Two NAS drive scripts:** `deploy-nas-drive-automation.ps1` and `fix-nas-drives-scheduled.ps1` do almost the same thing.
- **Two Docker deployment scripts:** `deploy-docker-service.ps1` and `deploy-docker-service.sh` target the same system (Windows) but one is written in bash for WSL.
- **Two gateway recovery scripts:** `gateway-recovery.ps1` and `gateway-recovery.sh` duplicate logic in different shells.

**Recommendation:** Consolidate to one script per responsibility. Use the language native to the target OS (PowerShell for Windows, bash for Linux/WSL only if no Windows-native alternative exists).

### 3. Process Killing Safety
`gateway-recovery.ps1`, `gateway-recovery.sh`, and `fix-marvin.ps1` all terminate processes aggressively:
- `Get-Process *docker* | Stop-Process -Force` in `fix-marvin.ps1`
- `taskkill /F /IM chrome.exe` in `gateway-recovery.sh`
- `Get-Process node | Where-Object CommandLine -like "*openclaw*" | Stop-Process` in `gateway-recovery.ps1` (which doesn't work due to missing `CommandLine`)

**Recommendation:** Use precise targeting (`Get-CimInstance Win32_Process`), verify process ownership, and prefer graceful shutdown (`Stop-Process` with `-Confirm:$false` after a timeout) over `-Force`.

### 4. Path Consistency
`setup-email-monitor.ps1` references `scripts/` instead of `workspace-scripts/`. Ensure all setup/deployment scripts derive paths from `$PSScriptRoot` rather than hardcoding absolute paths.

---

## Recommended Priorities

### P0 (Fix This Week)
1. **Rotate all hardcoded passwords** and remove them from source control.
2. **Fix `setup-email-monitor.ps1` paths** (change `scripts/` to `workspace-scripts/`).
3. **Fix `extract_artists.py`** to read `song['artists']` list instead of `song['artist']` string.
4. **Fix `run-email-monitor.bat`** to load credentials from environment only.
5. **Fix `gateway-recovery.ps1`** to use `Get-CimInstance Win32_Process` for reliable `CommandLine` filtering.

### P1 (Fix This Month)
1. **Consolidate duplicate scripts:** email-monitor v1+v2, NAS drive scripts, Docker deployment scripts.
2. **Fix IMAP race conditions** in the surviving email monitor.
3. **Add exit codes and auto-fix logic** to `monitor-ha-proxy.ps1`.
4. **Rename/rewrite `fix-marvin.ps1`** to accurately describe its destructive behavior or make it non-destructive.
5. **Fix `gateway-recovery.sh`** to not kill all Chrome processes.

### P2 (Improvement Backlog)
1. Migrate credential storage to Windows Credential Manager.
2. Replace raw `http`/`https` modules in `email-notifier.js` with `fetch`.
3. Add `dotenv` to `package.json` or remove the `require('dotenv')` call in `system-health-check.js`.
4. Remove BOM from `register-backup-task.ps1`.
5. Add parameter validation to all setup scripts.

---

## Consolidation Opportunities

### Merge Email Monitors
Combine `email-monitor.js` and `email-monitor-v2.js` into a single script with:
- v2's class-based structure and parallel account checking
- v1's notification integration with `email-notifier.js`
- Fixed IMAP message processing (no premature `imap.end()`)
- Bounded UID state (purge entries older than 30 days)

### Merge NAS Drive Scripts
Create one `manage-nas-drives.ps1` script that:
- Accepts `-Deploy` and `-Fix` switches
- Reads credentials from Windows Credential Manager
- Generates no secondary scripts; performs mapping inline
- Uses `New-SmbMapping` instead of `net use`

### Delete WSL-Windows Hybrid Scripts
Remove `deploy-docker-service.sh` and rely solely on `deploy-docker-service.ps1` for Windows Docker configuration. Remove `setup-gateway-recovery-wsl.sh` if the Windows scheduled task is sufficient.

---

*Report generated by script review subagent.*
