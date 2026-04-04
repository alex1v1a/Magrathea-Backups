# Auto-Recovery Script Fix - Feb 25, 2026

## Issue Fixed
Updated `marvin-dash/scripts/auto-recovery.js` to use PowerShell-native commands instead of CMD-specific syntax.

### Changes Made
- **Port Detection**: Changed from `netstat -ano | findstr :PORT` to `Get-NetTCPConnection -LocalPort PORT`
- **Process Name Lookup**: Changed from `tasklist /FI` to `Get-Process -Id`
- **Fallback Support**: Added CMD fallback via `cmd.exe /c` if PowerShell fails
- **Better Error Handling**: Graceful degradation between PowerShell and CMD methods

### Why This Fixes It
The original script used CMD pipe syntax (`| findstr`) which fails when Node.js spawns commands in a PowerShell environment. The new approach:
1. Tries PowerShell-native commands first (reliable in PS)
2. Falls back to CMD wrapper if needed (`cmd.exe /c "netstat | findstr"`)
3. Properly parses JSON output from PowerShell

### Testing
Next auto-recovery run (every 5 minutes) will test the new port detection. Check `marvin-dash/data/recovery.log` for results.

## 12:23 PM Status Summary
- ✅ Dashboard: Healthy (port 3001)
- ✅ WSL Ubuntu: Healthy  
- ✅ Calendar: Synced (17 events)
- ✅ HEB Cart: 49 items ready
- ⏳ Dinner Plan: Waiting for your email reply
- 🔧 Auto-Recovery: Script updated, testing next run
