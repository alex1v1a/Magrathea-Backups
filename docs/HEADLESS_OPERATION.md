# Headless Operation Configuration Summary
# Created: 2026-04-10

## Changes Made

### 1. OpenClaw Config (openclaw.json)
- browser.headless: true
  → Browser automation runs without visible windows

### 2. Silent Execution Wrappers Created
- silent_executor.ps1 - PowerShell wrapper with hidden window
- silent_ps.bat - Batch wrapper for PowerShell scripts  
- silent_launcher.vbs - VBScript wrapper (completely invisible)

### 3. Usage for Silent Script Execution

**Option A: PowerShell (minimal flash)**
```
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "script.ps1"
```

**Option B: VBScript (completely invisible)**
```
wscript.exe "C:\Users\admin\.openclaw\workspace\scripts\silent_launcher.vbs" "script.ps1"
```

**Option C: Start command (detached)**
```
start /min powershell.exe -WindowStyle Hidden -File "script.ps1"
```

## Recommended: Update Cron Jobs

Edit each cron job that executes PowerShell to use -WindowStyle Hidden:

1. Email Monitor - Every 2 Hours
2. Web Discovery - Daily Afternoon  
3. Daily Machine Shop Outreach

Change from:
```
powershell.exe -ExecutionPolicy Bypass -File "script.ps1"
```

To:
```
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "script.ps1"
```

## Gateway/Node Execution

For OpenClaw gateway and nodes to run without console windows:

1. Use NSSM (Non-Sucking Service Manager) to run as Windows Service
2. Or use Task Scheduler with hidden window option
3. Or run via VBScript wrapper

## Verification

After restart, verify headless mode:
- No browser windows should appear during web searches
- No PowerShell/CMD windows should flash during scheduled tasks
- All operations should run in background silently

## Rollback

To restore visible windows:
1. Change browser.headless back to false in openclaw.json
2. Remove -WindowStyle Hidden from cron job commands
3. Restart OpenClaw gateway
