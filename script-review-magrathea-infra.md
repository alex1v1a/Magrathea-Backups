# Magrathea Infrastructure Script Review

**Review Date:** 2026-04-13  
**Scope:** Root-level infrastructure scripts, `scripts/`, `skills/team-self-recovery/scripts/`, and selected docs scripts.  
**Analyzed:** 26 scripts across Bash, PowerShell, and Python.

---

## Executive Summary

This codebase is a **sprawling collection of overlapping ad-hoc scripts** with significant duplication, hardcoded secrets, and inconsistent error handling. Many scripts appear to have been written reactively for one-off fixes and never consolidated. **Immediate action should be taken to:**

1. **Consolidate duplicate health-monitoring, SSH-fix, and key-rotation scripts.**
2. **Remove or rotate all hardcoded credentials** (passwords, API key fragments, SSH keys).
3. **Introduce a single source of truth** for team topology (IPs, users, hostnames).
4. **Add input validation, dependency checks, and proper exit-code handling.**

---

## Consolidation Opportunities (Read This First)

The most glaring problem is **massive duplication**. The following script families should be collapsed into 1–2 unified tools:

| Family | Current Scripts | Recommendation |
|--------|-----------------|----------------|
| **API Key Rotation** | `rotate-keys.sh`, `rotate-keys-bitwarden.sh`, `rotate-keys-file.sh` | Merge into one `rotate-keys.sh` with `--backend {bitwarden|file|1password}` flag. |
| **API Key Loading** | `load-api-keys.sh`, `load-api-keys-1password.sh` | Merge into one `load-api-keys.sh` with `--backend` flag. These are line-for-line duplicates except `bw` vs `op`. |
| **Team Health Checks** | `team_health_check.sh`, `team_health_monitor.sh`, `skills/team-self-recovery/scripts/team-health-check.sh` | Consolidate into the `skills/team-self-recovery/scripts/team-health-check.sh` version (it is the most mature). Delete the others. |
| **Gateway Recovery** | `auto_recovery.sh`, `healthcheck.sh` | Consolidate into `auto_recovery.sh` (more robust). `healthcheck.sh` is a stripped-down, less-safe copy. |
| **SSH Fixes (Bistromath)** | `fix-bistromath-ssh.ps1`, `fix-bistromath-ssh.sh`, `marvin/docs/ssh-repair-bistromath.ps1` | Merge the two PS1 files; the `.sh` version is just a wrapper that prints manual steps. |
| **SSH Fixes (General)** | `fix-bistromath-ssh.ps1`, `fix-deep-thought-ssh.ps1` | These are 90% identical. Create a single `fix-windows-ssh.ps1` parameterized by host. |
| **Vault Setup** | `setup-bitwarden.sh`, `setup-1password.sh` | Keep both only if both vaults are actively used; otherwise pick one and delete the other. |
| **Team Status/Recovery** | `team-status.sh`, `skills/team-self-recovery/scripts/team-recovery.sh`, `team_health_monitor.sh` | `team-status.sh` overlaps health checking. `team-recovery.sh` should be the canonical recovery tool. |
| **Password-based SSH** | `scripts/team-ssh.sh`, `scripts/update-team-models.ps1` | Both hardcode the same password and do remote WinRM/SSH. Unify into a single remote-execution wrapper. |

---

## Script-by-Script Analysis

### 1. `rotate-keys.sh` (Root)

**Bugs/Issues**
- **Exposed credentials in source:** Partial API keys are printed in the checklist (Brave: `BSAfg0lcSr1rl5_Ce67oGor3UL4src5`, OpenAI: `sk-proj-G79C1XyeYfNlICYX...`, etc.). Even if these are "old" keys, they are in Git history and now in this script.
- `set -e` is declared but the script never performs any actual rotation; it is purely a manual checklist. The `set -e` is therefore harmless but misleading.

**Security**
- **CRITICAL:** API key fragments are hardcoded in the script body. These should be removed immediately.
- Backs up `openclaw.json` to a predictable path with a timestamp, which is fine, but the backup path is printed and could leak directory structure.

**Code Quality**
- Does not actually rotate anything. It should be renamed to `rotate-keys-guide.sh` or merged into the interactive rotation scripts.

**Modernization**
- Should be merged into `rotate-keys-bitwarden.sh` / `rotate-keys-file.sh` as a `--dry-run` or `--guide` mode.

---

### 2. `rotate-keys-bitwarden.sh` (Root)

**Bugs/Issues**
- **Mismatched Bitwarden item types:** Creates items as `type: 2` (secure notes) but `load-api-keys.sh` tries to retrieve them with `bw get password`, which expects `type: 1` (login). **This will fail at runtime.**
- `jq` is used without checking if it is installed first.
- `bw login --check` can return false even if a valid `BW_SESSION` is already exported; the script will force a re-login.
- The `jq` pipeline for item IDs does not guard against `null` IDs: `bw get item ... | jq -r '.id'` could delete the wrong item or fail silently.
- The temporary file `${CONFIG_FILE}.tmp` is created in `$HOME/.openclaw/`. If the script is interrupted, the `.tmp` file is left behind.

**Security**
- `read -sp` correctly hides input.
- API keys are passed through `echo ... | bw encode`. If a key contains `"` or `\`, the handcrafted JSON will break or inject malformed data. **JSON injection risk.**

**Code Quality**
- Massive copy-paste blocks for each provider. Should be a loop over an array.
- No validation that `bw create item` succeeded.

**Modernization**
- Should be merged with `rotate-keys-file.sh` into a single parameterized script.

---

### 3. `rotate-keys-file.sh` (Root)

**Bugs/Issues**
- Sets `openclaw.json` values to literal strings like `"${BRAVE_API_KEY}"`. This is only correct if OpenClaw's JSON parser supports shell-style variable interpolation. If not, the gateway will try to use the literal string `${BRAVE_API_KEY}` as an API key and fail.
- No check for `jq` availability.
- `.tmp` file leak on interruption (same as above).

**Security**
- Creates `$HOME/.openclaw/.env.secure` with `chmod 600`. Good.
- Tells the user to `source` the file and add it to `~/.zshrc`, which means keys will be exported to every subprocess. This is less secure than a secrets manager.

**Code Quality**
- Duplicates the entire interactive prompt logic from `rotate-keys-bitwarden.sh`.

**Modernization**
- Merge with `rotate-keys-bitwarden.sh`.

---

### 4. `setup_bot.sh` (Root)

**Bugs/Issues**
- **Hardcodes gateway auth password:** `"password": "section9"`. This is a shared secret committed to the repo.
- **Downgrades OpenClaw unconditionally:** If `BOT_NAME` is `DeepThought` and version is `2026.2.21`, it force-downgrades via `npm install -g openclaw@2026.2.19-2`. This is extremely fragile and will break as new versions are released.
- `tailscale up` is called non-interactively; if Tailscale requires OAuth/browser auth, the script hangs silently or fails with a confusing message.
- `crontab -` **overwrites the entire crontab** with only the auto-recovery entry, destroying any existing cron jobs the user had.

**Security**
- Hardcoded password (`section9`) in the generated JSON.
- Clears all sessions (`openclaw sessions clear`) and removes session directories aggressively.
- `allowFrom` list hardcodes Discord user IDs. This is not a security bug per se, but it makes the script non-portable.

**Code Quality**
- Creates `auto_recovery.sh` inline with a heredoc. The generated script does not use `set -e` and appends to `/tmp/openclaw_recovery.log` forever without log rotation.

**Modernization**
- The version downgrade logic should be removed or parameterized.
- Should not clobber the entire crontab.

---

### 5. `setup-bitwarden.sh` (Root)

**Bugs/Issues**
- Downloads a pinned old version of the Bitwarden CLI (`cli-v2024.2.0`). This may have known vulnerabilities or break as GitHub release URLs change.
- On macOS, moves `bw` to `/usr/local/bin/bw` without `sudo`, which will fail if the directory is not user-writable.
- The templates are written to `~/.openclaw/bitwarden-templates/` but the success message says `~/.openwarden-templates/` (typo).

**Security**
- Templates contain placeholder keys (`YOUR_BRAVE_KEY_HERE`). Not a live leak, but encourages copy-paste mistakes.

**Code Quality**
- No verification that `bw` is in `$PATH` after installation.

---

### 6. `setup-1password.sh` (Root)

**Bugs/Issues**
- Downloads pinned 1Password CLI version `v2.30.0`. Same fragility as `setup-bitwarden.sh`.
- `brew install --cask 1password-cli` should probably be `brew install 1password-cli` (the cask is the GUI app; the CLI is typically a formula).

**Security**
- No hardcoded secrets.

**Code Quality**
- Very similar structure to `setup-bitwarden.sh`. If both vaults are retained, they should share a common library function for CLI bootstrapping.

---

### 7. `complete-ssh-mesh.sh` (Root)

**Bugs/Issues**
- **Race condition in connectivity test:**
  ```bash
  (ssh ... ) &
  SSH_PID=$!
  sleep 4
  kill $SSH_PID 2>/dev/null
  wait $SSH_PID 2>/dev/null
  if [ $? -eq 0 ]; then ...
  ```
  If `kill` fires after SSH has already exited successfully, `wait` returns the exit code of the signal (143), causing a false-negative "FAILED" result. If SSH hangs, `kill` might return 0 and `wait` might return 0 depending on timing. This logic is fundamentally broken.
- `StrictHostKeyChecking=no` disables host-key verification, opening the door to MITM attacks.
- `ssh-keygen` is called with `-N ""` (empty passphrase) without warning the user.

**Security**
- Hardcodes Tailscale IPs and usernames for all team members.
- Hardcodes `~/.ssh/trillian_ed25519` as the key name, making the script specific to one host.

**Modernization**
- Should source team topology from a shared config file (e.g., `team.conf`) instead of hardcoding arrays.

---

### 8. `exchange-ssh-keys.sh` (Root)

**Bugs/Issues**
- **Same broken background/kill race condition** as `complete-ssh-mesh.sh`.
- `KEY_ONLY=$(echo "$KEY" | awk '{print $1" "$2}')` assumes all keys are exactly three fields. This breaks for ECDSA keys or keys with comments containing spaces.
- `grep -q "$KEY_ONLY"` could match a substring of a different key (e.g., a shorter key that is a prefix of another).

**Security**
- **Hardcodes four full SSH public keys** in the script. If this repo is public or leaked, these keys are exposed.
- `StrictHostKeyChecking=no` on all SSH tests.

**Code Quality**
- The `TEAM_MEMBERS` array duplicates data already in `complete-ssh-mesh.sh`.

**Modernization**
- Should read public keys from `~/.ssh/*.pub` or a `team-keys/` directory instead of embedding them.

---

### 9. `team-status.sh` (Root)

**Bugs/Issues**
- `timeout 3 ssh ...` — the `timeout` command is not available by default on macOS. This will fail on Trillian.
- `df -h /Users/hanka/.openclaw` hardcodes Trillian's username/path. On other hosts this path will not exist and the output will be empty or confusing.
- `jq -r 'to_entries | .[] | ...'` is used without checking if `jq` is installed.

**Security**
- `StrictHostKeyChecking=no` on SSH mesh test.
- Hardcodes four Tailscale IPs.

**Modernization**
- Overlaps heavily with `skills/team-self-recovery/scripts/team-health-check.sh`. Should be replaced by a symlink or wrapper around the skill version.

---

### 10. `team_health_monitor.sh` (Root)

**Bugs/Issues**
- Uses `jq` without checking it exists.
- Operates on `/Volumes/Magrathea/TEAM_STATUS.json` without checking the volume is mounted. If it is missing, `jq` will fail and the `.tmp` file will be left in `/tmp/`.
- `nc` (netcat) is used for port checks; on macOS the default `nc` has different flags than GNU netcat, but `-z -w 5` is generally compatible.
- `date -Iseconds` is GNU-specific and may not work on macOS (it actually does on modern macOS, but it's not POSIX).
- `DISCORD_WEBHOOK` is a placeholder (`...`), so alerting is non-functional.

**Security**
- Hardcodes bot IPs and usernames.

**Code Quality**
- Overlaps with `team_health_check.sh` and the skill version. The `jq` update is atomic (good), but there is no initialization of `TEAM_STATUS.json` if it doesn't exist.

**Modernization**
- Delete and redirect to `skills/team-self-recovery/scripts/team-health-check.sh`.

---

### 11. `team_health_check.sh` (Root)

**Bugs/Issues**
- Hardcodes paths (`/Users/hanka/.ssh/trillian_ed25519`) and three specific hosts.
- Appends to a log file forever without rotation.
- `ssh -o StrictHostKeyChecking=no` disables host-key verification.

**Security**
- Hardcodes IPs and usernames.
- `StrictHostKeyChecking=no`.

**Modernization**
- This is the simplest and oldest health check. It should be removed in favor of `skills/team-self-recovery/scripts/team-health-check.sh`.

---

### 12. `load-api-keys.sh` (Root)

**Bugs/Issues**
- **Bitwarden item type mismatch:** As noted in `rotate-keys-bitwarden.sh`, items are created as secure notes (`type: 2`), but this script calls `bw get password`, which expects logins. **This will return nothing.**
- `bw login --check` behavior is finicky; if `BW_SESSION` is exported but expired, the script will attempt a fresh login, potentially prompting interactively in a non-interactive context.
- `env | grep -E '...' | cut -d= -f1` will leak the *names* of loaded keys, which is minor but unnecessary.

**Security**
- Keys are loaded into environment variables, making them visible to `/proc/<pid>/environ` on Linux and to any child process.

**Modernization**
- Merge with `load-api-keys-1password.sh` into a single parameterized script.

---

### 13. `load-api-keys-1password.sh` (Root)

**Bugs/Issues**
- `op account list &> /dev/null` checks if the CLI is signed in, but it does not verify the *specific* account needed for these items.
- Same `env | grep ...` leakage as `load-api-keys.sh`.

**Security**
- Same environment-variable exposure issue.

**Modernization**
- Merge with `load-api-keys.sh`.

---

### 14. `fix-bistromath-ssh.ps1` (Root)

**Bugs/Issues**
- Uses a **dummy/placeholder SSH key**: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG team@hitchhikers`. This is not a real key and will not grant access.
- `icacls ... /grant:r "$($env:USERNAME):(R)"` sets read-only, but OpenSSH on Windows often requires more nuanced permissions.
- `New-NetFirewallRule` is run unconditionally; if the rule already exists, it will error (silenced by `ErrorAction SilentlyContinue` in the module import, but not here — actually it *will* throw an error because `New-NetFirewallRule` does not have `-ErrorAction SilentlyContinue`).

**Security**
- The dummy key is harmless but confusing. If someone replaces it with a real key, that key becomes hardcoded.
- Modifies `administrators_authorized_keys` which requires elevation; the script catches the error but continues.

**Modernization**
- Merge with `fix-deep-thought-ssh.ps1` into a parameterized `fix-windows-ssh.ps1`.

---

### 15. `fix-bistromath-ssh.sh` (Root)

**Bugs/Issues**
- This script does not actually *fix* anything. It prints diagnostic text and manual steps. It should be renamed to `diagnose-bistromath-ssh.sh`.
- Generates a new team key (`team_hitchhikers_key`) if one doesn't exist, but the PowerShell fix script uses a completely different (dummy) key.

**Security**
- None specific beyond hardcoded IP.

**Modernization**
- Should either be made to actually perform the fix (e.g., via `ssh-copy-id` if password auth is available) or deleted in favor of the PowerShell script.

---

### 16. `fix-deep-thought-ssh.ps1` (Root)

**Bugs/Issues**
- **Same dummy SSH key** as `fix-bistromath-ssh.ps1`.
- `New-NetFirewallRule` lacks error handling for duplicate rules.
- The SSH connectivity test at the end uses `ssh` from PowerShell, but `ssh` may not be in `$env:PATH` on all Windows configurations.

**Security**
- Same as `fix-bistromath-ssh.ps1`.

**Modernization**
- Merge into a single parameterized Windows SSH fix script.

---

### 17. `fix-gateway-pairing.sh` (Root)

**Bugs/Issues**
- Purely informational. Does not perform any fixes.
- Suggests `gateway.auth.token = "hitchhikers-team-2026"`, which is a weak, hardcoded token.

**Security**
- Recommends disabling auth (`"none"`) as a dev option. If a user follows this on a shared network, the gateway is exposed.

**Modernization**
- Should be replaced by an interactive script that actually edits `openclaw.json` and restarts the gateway, or deleted.

---

### 18. `auto_recovery.sh` (Root)

**Bugs/Issues**
- `ls -t ... | tail -n +11 | xargs -r rm` uses `xargs -r`, which is GNU-specific and not available on macOS. On macOS this will fail with `xargs: illegal option -- r`.
- `sleep 5` after restart is arbitrary; the gateway may take longer to come up.
- No rate limiting: if the gateway is persistently broken, this script will restart it every 5 minutes and create a backup every time, consuming disk space.

**Security**
- Logs to `/tmp/openclaw_recovery.log`, which is world-readable on most systems. Gateway status output (which could contain sensitive paths or PIDs) is appended here.

**Code Quality**
- Better than `healthcheck.sh` (it keeps backups and verifies restart), but still basic.

**Modernization**
- Keep this as the canonical recovery script. Add macOS-compatible cleanup and exponential backoff.

---

### 19. `healthcheck.sh` (Root)

**Bugs/Issues**
- `GATEWAY_STATUS=$(... | grep -c "RPC probe: ok" || echo "0")` — if `openclaw gateway status` fails, `grep -c` returns 0, but the `|| echo "0"` is redundant. More importantly, if `openclaw` is not in `$PATH`, the script will report "Gateway OK" because `grep -c` on stderr might still return 0 depending on shell behavior. Actually `2>&1` is missing, so stderr goes to the terminal, not the log.
- No backup before restart.
- No verification that restart succeeded.

**Security**
- Logs to `/tmp/openclaw_health.log` (world-readable).

**Modernization**
- **Delete this script.** It is a strictly worse version of `auto_recovery.sh`.

---

### 20. `iphone_setup.sh` (Root)

**Bugs/Issues**
- `sudo defaults write ...` is run without checking if the user is on macOS. If run on Linux/WSL, `defaults` won't exist and the script will fail confusingly.
- `open x-apple.systempreferences:...` is macOS-specific and will fail elsewhere.

**Security**
- Disables app sandboxing globally (`EnableSandboxing -bool false`). This is a system-wide security reduction.

**Code Quality**
- This script is unrelated to the rest of the Magrathea infrastructure. Consider moving it to a `docs/` or `manual-guides/` directory.

---

### 21. `ENABLE_CRON.sh` (Root)

**Bugs/Issues**
- **`crontab -` overwrites the entire crontab.** This is destructive. Any existing cron jobs (system updates, backups, etc.) are silently deleted.
- No check if `auto_recovery.sh` already exists in the crontab, so running it twice creates duplicate entries (if the previous crontab had been preserved, which it wasn't).

**Security**
- Hardcodes the path to `auto_recovery.sh` and the user `hanka`.

**Modernization**
- Should use `crontab -l` to preserve existing entries, or better yet, use a systemd timer / launchd plist.

---

### 22. `scripts/backup.ps1`

**Bugs/Issues**
- `$ErrorActionPreference = "Stop"` means any missing file will abort the entire backup, even though other files might be present.
- `git push origin main` is hardcoded. If the branch is not `main`, or if no remote is configured, the script crashes.
- `git config user.email` is set to `"marvin@team.com"` without checking if it was already configured, potentially overwriting user preferences.
- `Remove-Item $dest -Recurse -Force` on directories is dangerous if `$dest` resolves incorrectly.

**Security**
- Backs up `config.json`, `.env`, `MEMORY.md`, etc. Ensure the GitHub repo is private, as these files contain sensitive data.

**Code Quality**
- Should check `git remote -v` before pushing.
- Should allow the branch name to be discovered dynamically (`git branch --show-current`).

---

### 23. `scripts/team-ssh.sh`

**Bugs/Issues**
- **Hardcoded password:** `PASSWORD="section9"`.
- Uses `sshpass`, which is often not installed by default.
- `StrictHostKeyChecking=no` and `UserKnownHostsFile=/dev/null` completely disable SSH host-key verification. **This is a MITM risk.**
- IP addresses are hardcoded (`10.0.1.90`, `10.0.1.99`, `10.0.1.9`). These are local network IPs, different from the Tailscale IPs used elsewhere, creating a dual-address confusion.

**Security**
- **CRITICAL:** Plaintext password in the script.
- **CRITICAL:** Disabled host-key verification.

**Modernization**
- Should use key-based auth. If password auth is truly required, it should be supplied via an environment variable or a password manager, not hardcoded.

---

### 24. `scripts/update-team-models.ps1`

**Bugs/Issues**
- **Hardcoded password:** `$password = "section9"`.
- Uses WinRM (`New-PSSession`) over IP addresses. This requires PSRemoting to be enabled on the target machines, which is not guaranteed.
- The model name `anthropic/claude-opus-4-6` is suspicious. As of early 2026, the correct model naming is likely `claude-opus-4-5` or similar. This looks like a typo.
- `Stop-Process -Force` on Ollama is aggressive and could corrupt model downloads.
- `Start-Process -WindowStyle Hidden` starts Ollama but does not verify it actually started successfully.
- The `$configContent` heredoc is passed to the remote session but never actually used; the remote session reads the local config, modifies it, and writes it back. The parameter is dead code.

**Security**
- **CRITICAL:** Hardcoded password.
- WinRM over HTTP (implied by IP without `-UseSSL`) is unencrypted and transmits the password in plaintext.

**Code Quality**
- `$ErrorActionPreference = "Continue"` masks failures; some machines could fail silently.
- No validation that `$session` was created successfully before `Invoke-Command`.

**Modernization**
- Should use SSH with key auth (PowerShell supports `SSHTransport`) instead of WinRM with a hardcoded password.

---

### 25. `skills/team-self-recovery/scripts/team-health-check.sh`

**Bugs/Issues**
- `ssh -o BatchMode=yes` is good, but if the SSH key requires a passphrase, the script will fail without a helpful message.
- `curl` is used for gateway health checks without checking if `curl` is installed.
- The `send_alert` function uses `curl` without `-m` (max-time), so a hanging webhook request could stall the script.
- `date -Iseconds` is used; while it works on modern macOS and Linux, it is not POSIX.

**Security**
- Hardcodes Tailscale IPs and usernames.
- Discord webhook URL can be passed via `-w`; this is good (not hardcoded), but the URL is logged nowhere.

**Code Quality**
- This is the **best-written script in the entire inventory**. It has argument parsing, color output, usage text, exit codes, and summary statistics.
- The only real issue is the hardcoded topology.

**Modernization**
- Should read `BOTS` from a `team.conf` file. This would make it the canonical health check for all hosts.

---

### 26. `skills/team-self-recovery/scripts/team-recovery.sh`

**Bugs/Issues**
- **Windows-incompatible commands:** Steps 5 and 6 run `lsof` and `pkill`, which do not exist on Windows. Since Marvin, Deep Thought, and Bistromath are Windows machines, these steps will always fail.
- `openclaw status` is used, but the actual CLI command is likely `openclaw gateway status`. If `status` is not a valid subcommand, the script will incorrectly conclude OpenClaw is not running.
- `kill -9 $(lsof -t -i:${GATEWAY_PORT})` is POSIX-specific and will fail on Windows.
- No check if the target OS is Windows vs. macOS/Linux before running OS-specific commands.

**Security**
- Hardcodes IPs and usernames.

**Code Quality**
- Good structure and clear output. Better than the root-level recovery scripts.
- Should detect the remote OS (`uname` or `echo %OS%`) and branch accordingly.

**Modernization**
- Make this the canonical recovery script, but fix the Windows compatibility issues.

---

### 27. `marvin/docs/rename_entities.py`

**Bugs/Issues**
- The `--config` argument is accepted by `argparse` but **never used** in the code. The script does not read or modify any YAML file.
- `yaml` is imported but `pyyaml` may not be installed on the target system.
- `list(LOCATION_DEFAULTS.keys()).index(location)` relies on dictionary insertion order (Python 3.7+ behavior), which is fragile.

**Security**
- No hardcoded secrets.

**Code Quality**
- The `ENTITY_PATTERNS` dictionary is purely a lookup table; it does not perform any actual renaming.
- The script only prints text. It should be renamed to `generate_entity_config.py` or actually perform the renames.

---

### 28. `marvin/docs/ssh-repair-bistromath.ps1`

**Bugs/Issues**
- `Copy-Item $adminKeys $backup -Force` will fail if `$adminKeys` does not exist. There is no `Test-Path` guard.
- `Get-Content $adminKeys` will fail if the file does not exist.
- `Restart-Service sshd` will fail if OpenSSH is not installed.

**Security**
- `icacls ... /remove "Everyone"` and `/remove "Users"` are good hardening steps, but the script should verify the file exists first.

**Modernization**
- Merge with `fix-bistromath-ssh.ps1`. This script is specifically for deduplicating `administrators_authorized_keys`, while `fix-bistromath-ssh.ps1` is for initial setup. They should be one script with a `-Repair` switch.

---

## Security Hotlist (Fix Immediately)

| Severity | Item | Location |
|----------|------|----------|
| 🔴 **CRITICAL** | Hardcoded shared password `section9` | `setup_bot.sh`, `scripts/team-ssh.sh`, `scripts/update-team-models.ps1` |
| 🔴 **CRITICAL** | Partial API key fragments exposed | `rotate-keys.sh` (Brave, OpenAI, Anthropic, Moonshot, MiniMax) |
| 🔴 **CRITICAL** | SSH host-key verification disabled | `scripts/team-ssh.sh`, `complete-ssh-mesh.sh`, `exchange-ssh-keys.sh`, `team-status.sh`, `team_health_check.sh` |
| 🟠 **HIGH** | Hardcoded SSH public keys | `exchange-ssh-keys.sh` |
| 🟠 **HIGH** | Dummy/placeholder SSH key that could be replaced with a real one | `fix-bistromath-ssh.ps1`, `fix-deep-thought-ssh.ps1` |
| 🟠 **HIGH** | WinRM over HTTP with plaintext password | `scripts/update-team-models.ps1` |
| 🟡 **MEDIUM** | World-readable log files (`/tmp/openclaw_*.log`) | `auto_recovery.sh`, `healthcheck.sh` |
| 🟡 **MEDIUM** | Environment variable exposure of secrets | `load-api-keys.sh`, `load-api-keys-1password.sh` |
| 🟡 **MEDIUM** | `crontab -` destroys existing jobs | `ENABLE_CRON.sh`, `setup_bot.sh` |

---

## Recommended Refactoring Plan

### Phase 1: Security Cleanup (Do This Week)
1. **Rotate `section9`** everywhere. Replace with a strong random password stored in Bitwarden/1Password.
2. **Purge API key fragments** from `rotate-keys.sh` and rewrite it as a true interactive rotation tool.
3. **Remove `StrictHostKeyChecking=no`** from all scripts. Instead, use `UserKnownHostsFile` pointing to a team-managed `known_hosts` file.
4. **Delete `scripts/team-ssh.sh`** or rewrite it to use key-based auth via `ssh-agent`.

### Phase 2: Consolidation (Do This Month)
1. Create `lib/team.conf` (JSON or YAML) containing the single source of truth for IPs, users, and OS types.
2. Merge `rotate-keys-bitwarden.sh` + `rotate-keys-file.sh` → `bin/rotate-keys.sh --backend {bitwarden|file|1password}`.
3. Merge `load-api-keys.sh` + `load-api-keys-1password.sh` → `bin/load-api-keys.sh --backend ...`.
4. Merge `fix-bistromath-ssh.ps1` + `fix-deep-thought-ssh.ps1` + `ssh-repair-bistromath.ps1` → `windows/fix-ssh.ps1 -HostName <name>`.
5. Delete `team_health_check.sh`, `team_health_monitor.sh`, `healthcheck.sh`, `fix-gateway-pairing.sh`. Redirect users to the skill versions.

### Phase 3: Hardening
1. Fix `skills/team-self-recovery/scripts/team-recovery.sh` to detect Windows vs. macOS and use appropriate commands (`Get-Process` / `Stop-Process` vs. `lsof` / `pkill`).
2. Fix the Bitwarden secure-note vs. login-item mismatch in `rotate-keys-bitwarden.sh` and `load-api-keys.sh`.
3. Add `set -u` and dependency checks (`command -v jq`, `command -v bw`, etc.) to all Bash scripts.
4. Replace `xargs -r` in `auto_recovery.sh` with a portable loop.
5. Make `ENABLE_CRON.sh` append to crontab instead of replacing it.

---

## Final Verdict

The Magrathea infrastructure scripts function as a **proof-of-concept that has outgrown its quick-hack origins**. There are working pieces—especially the `skills/team-self-recovery/` versions—but the root directory is cluttered with stale duplicates, hardcoded secrets, and platform-specific scripts that assume a homogeneous Unix environment despite half the fleet running Windows.

**The number-one priority is deleting or consolidating the duplicate scripts.** Every duplicate is a maintenance burden and a place for secrets to hide. After that, the hardcoded credentials and disabled SSH security checks must be addressed before this infrastructure can be considered safe for long-term use.

> *"Mostly harmless. Occasionally helpful. Perpetually one hardcoded password away from a very bad Tuesday."*
