# OpenClaw Gateway Auto-Recovery

This directory contains scripts to automatically detect and resolve OpenClaw gateway issues without manual intervention.

## Problem Solved

The OpenClaw gateway service occasionally crashes or fails to start, causing:
- Browser automation to fail
- Facebook Marketplace monitoring to stop
- F-150 listing sharing to fail

These scripts automatically detect when the gateway is down and restart it.

## Quick Setup (Windows - Recommended)

Run the setup script to configure automatic monitoring:

```powershell
# Run as Administrator (right-click PowerShell → Run as Administrator)
cd C:\Users\Admin\.openclaw\workspace\scripts
.\setup-gateway-recovery.ps1
```

This will:
- Create a Windows Scheduled Task that runs every 5 minutes
- Check if the OpenClaw gateway is healthy
- Automatically restart it if it's down
- Log all actions for review

## Quick Setup (WSL/Linux)

If you prefer using WSL:

```bash
cd ~/.openclaw/workspace/scripts
chmod +x setup-gateway-recovery-wsl.sh
./setup-gateway-recovery-wsl.sh
```

## Manual Usage

You can also run the recovery scripts manually at any time:

### Windows
```powershell
.\gateway-recovery.ps1 -Verbose
```

### WSL
```bash
./gateway-recovery.sh
```

## Files

| File | Description |
|------|-------------|
| `gateway-recovery.ps1` | PowerShell recovery script (Windows) |
| `gateway-recovery.bat` | Batch file wrapper for easy execution |
| `gateway-recovery.sh` | Bash recovery script (WSL/Linux) |
| `setup-gateway-recovery.ps1` | Windows setup script (creates Scheduled Task) |
| `setup-gateway-recovery-wsl.sh` | WSL setup script (adds to cron) |

## Logs

Recovery attempts are logged to:
- **Windows:** `%USERPROFILE%\.openclaw\logs\gateway-recovery.log`
- **WSL:** `~/.openclaw/logs/gateway-recovery-wsl.log`

## Automatic Browser Profile Reset

If the openclaw browser profile becomes corrupted (CDP not responding on port 18800), the recovery script will automatically:

1. Kill all Chrome processes
2. Delete the browser profile directory at `~/.openclaw/browser/openclaw/user-data`
3. Clear any lock files preventing startup
4. Allow Chrome to recreate a fresh profile on next start

This handles the "browser exits immediately" issue without manual intervention.

## How It Works

1. **Gateway Health Check:** Pings the gateway at `http://127.0.0.1:18789/status`
2. **Gateway Detection:** If no response within 5 seconds, marks as unhealthy
3. **Gateway Recovery:** Attempts to restart using multiple methods:
   - Scheduled Task trigger
   - Direct Node.js execution
   - Process cleanup (kills stuck processes)
   - Port release (frees port 18789 if in use)
4. **Browser Health Check:** Tests CDP endpoint at `http://127.0.0.1:18800`
5. **Browser Profile Reset:** If browser CDP fails, automatically:
   - Kills all Chrome processes
   - Deletes the openclaw user data directory
   - Clears any lock files preventing startup
6. **Retry:** Attempts up to 3 times with 10-second delays
7. **Logging:** Records all actions for troubleshooting

## Troubleshooting

### Check if monitoring is active (Windows)
```powershell
schtasks /Query /TN "OpenClaw Gateway Auto-Recovery" /V
```

### Check if monitoring is active (WSL)
```bash
crontab -l | grep "OpenClaw"
```

### View recent logs (Windows)
```powershell
Get-Content ~\.openclaw\logs\gateway-recovery.log -Tail 20
```

### View recent logs (WSL)
```bash
tail -20 ~/.openclaw/logs/gateway-recovery-wsl.log
```

### Manual test
```powershell
# Windows
openclaw gateway status

# WSL
curl http://127.0.0.1:18789/status
```

## Uninstall

### Windows
```powershell
.\setup-gateway-recovery.ps1 -Uninstall
```

### WSL
```bash
./setup-gateway-recovery-wsl.sh --uninstall
```

## Notes

- The recovery script is safe to run multiple times
- It will not interfere with normal OpenClaw operation
- If manual intervention is needed (rare), it will log an error
- Logs are rotated automatically (old entries are overwritten)
