# Auto-Recovery Fix v2.1 - Feb 25, 2026

## Problem Identified
The auto-recovery script was failing because:
1. **Wrong port checked**: Script used hardcoded port 18789, but OpenClaw is configured on port 18888
2. **Port detection failing**: PowerShell/CMD commands work fine when port IS in use, but return exit code 1 when empty (which is normal)

## Root Cause
The zombie node.exe process IS on port 18888:
```
TCP 127.0.0.1:18888 LISTENING PID 290440 (node.exe)
```

But the script was checking 18789, 18790-18792, 18800 — missing the actual port!

## Fixes Applied

### 1. Dynamic Port Loading (auto-recovery.js)
Added `loadOpenClawConfig()` function that:
- Reads `~/.openclaw/openclaw.json`
- Extracts actual `gateway.port` value
- Updates SERVICES definition dynamically

### 2. Port Detection (already fixed earlier)
- Primary: `Get-NetTCPConnection -LocalPort PORT` (PowerShell-native)
- Fallback: `cmd.exe /c "netstat -ano | findstr :PORT"` (CMD wrapper)

## Testing
Both detection methods work correctly:
- PowerShell: Returns JSON with process info when port is in use
- CMD fallback: Returns text output when PowerShell fails
- Both return exit code 1 when port is free (expected behavior)

## Next Recovery Run
Should now:
1. Load actual port 18888 from config
2. Detect node.exe on that port
3. Attempt recovery with correct port

Monitor `recovery.log` for next run (every 5 minutes).
