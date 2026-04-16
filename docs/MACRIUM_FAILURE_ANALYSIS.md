# Macrium Reflect Backup Failure Analysis - 2026-04-13

## Issues Identified

### 1. CBT (Changed Block Tracking) Errors
**Source:** `C:\ProgramData\Macrium\Reflect\CBT.log`
```
ERROR cbt.cpp:91 - CCBTBase::VerifyHeader - IsEqualGUID
ERROR cbt.cpp:481 - CCBTIndexFromVImage::LoadIndex - FAILED - VerifyHeader
ERROR BackupWizRun.cpp:7352 - CBackupWizRun::InitializeAndMapCBT - CBTImageFile.LoadIndex - Code 2
```

**Impact:** Incremental backups failing due to corrupted CBT index

### 2. Scheduled Task Failures
| Task | Last Run | Result Code | Status |
|------|----------|-------------|--------|
| Macrium-Backup-{2D3187FC-...} | 4/13/2026 9:00 AM | 267009 | ❌ FAILED |
| Macrium-Backup-{621BBF56-...} | 4/13/2026 9:00 AM | 6 | ❌ FAILED |
| Macrium-Backup-{63E50CAB-...} | 4/13/2026 9:00 AM | 267009 | ❌ FAILED |
| Macrium-Backup-{BFF65964-...} | 4/6/2026 9:00 AM | 267014 | ❌ FAILED |

**Error Code Meanings:**
- 267009 (0x00041301): The task is currently running (or failed to complete)
- 6 (0x00000006): Invalid handle / Access denied
- 267014 (0x00041306): Task terminated by user or system

### 3. Subagent Context
No active subagent failures detected. Main backup tasks are failing at the Macrium level, not the subagent orchestration level.

## Root Cause
CBT (Changed Block Tracking) index corruption or driver incompatibility. This prevents incremental backups from running correctly.

## Fix Plan (Without Changing Schedule)

### Option 1: Reset CBT Index (Recommended First)
1. Open Macrium Reflect
2. Navigate to Backup Definitions
3. Edit each failing backup
4. Disable CBT temporarily, run full backup, then re-enable CBT

### Option 2: Run Full Backup (Bypass CBT)
1. Force full backup without incremental
2. This bypasses the corrupted CBT index
3. Future incrementals should work after clean full backup

### Option 3: Repair CBT Driver
1. Reinstall Macrium Reflect CBT driver
2. Requires administrative privileges
3. May need system restart

## Verification Steps
1. Check backup completes successfully
2. Verify error codes change to 0 (success)
3. Confirm CBT.log shows no more header verification errors
4. Ensure schedules remain unchanged

---
Analysis: 2026-04-13 19:55 CDT
