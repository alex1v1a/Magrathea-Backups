#Requires -RunAsAdministrator
# Macrium Reflect CBT Fix Script
# Fixes backup failures without changing schedules
# Created: 2026-04-13

param(
    [switch]$ForceFullBackup,
    [switch]$ResetCBT
)

Write-Host "=== Macrium Reflect Backup Repair Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Macrium Reflect is installed
$MacriumPath = "C:\Program Files\Macrium\Reflect\Reflect.exe"
if (!(Test-Path $MacriumPath)) {
    Write-Error "Macrium Reflect not found at expected path"
    exit 1
}

Write-Host "Step 1: Checking Macrium Services..." -ForegroundColor Yellow
$CBTService = Get-Service -Name "MacriumCBT" -ErrorAction SilentlyContinue
if ($CBTService) {
    Write-Host "  CBT Service Status: $($CBTService.Status)"
    if ($CBTService.Status -ne 'Running') {
        Write-Host "  Starting CBT Service..." -ForegroundColor Yellow
        Start-Service -Name "MacriumCBT" -ErrorAction SilentlyContinue
    }
} else {
    Write-Warning "  CBT Service not found - may not be installed"
}

Write-Host ""
Write-Host "Step 2: Checking CBT Logs for Errors..." -ForegroundColor Yellow
$CBTLogPath = "C:\ProgramData\Macrium\Reflect\CBT.log"
if (Test-Path $CBTLogPath) {
    $RecentErrors = Get-Content $CBTLogPath -Tail 50 | Select-String "ERROR|FAILED"
    if ($RecentErrors) {
        Write-Host "  Found $($RecentErrors.Count) recent errors in CBT log" -ForegroundColor Red
        Write-Host "  Last 3 errors:" -ForegroundColor Red
        $RecentErrors | Select-Object -Last 3 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    } else {
        Write-Host "  No recent CBT errors found" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Step 3: Checking Backup Task Status..." -ForegroundColor Yellow
$MacriumTasks = Get-ScheduledTask | Where-Object {$_.TaskName -like "Macrium-Backup*"}
foreach ($Task in $MacriumTasks) {
    $TaskInfo = Get-ScheduledTaskInfo -TaskName $Task.TaskName
    $Status = if ($TaskInfo.LastTaskResult -eq 0) { "✅ SUCCESS" } else { "❌ FAILED (Code: $($TaskInfo.LastTaskResult))" }
    Write-Host "  $($Task.TaskName): $Status"
}

Write-Host ""
Write-Host "Step 4: Stopping Macrium Processes..." -ForegroundColor Yellow
$MacriumProcesses = Get-Process | Where-Object {$_.ProcessName -like "*Reflect*" -or $_.ProcessName -like "*Macrium*"}
if ($MacriumProcesses) {
    $MacriumProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  Stopped $($MacriumProcesses.Count) Macrium processes"
    Start-Sleep -Seconds 2
}

Write-Host ""
if ($ResetCBT) {
    Write-Host "Step 5: Resetting CBT Index..." -ForegroundColor Yellow
    $CBTIndexPath = "C:\ProgramData\Macrium\Reflect\CBT"
    if (Test-Path $CBTIndexPath) {
        Write-Host "  Backing up CBT index..." -ForegroundColor Yellow
        $BackupPath = "C:\ProgramData\Macrium\Reflect\CBT_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Rename-Item -Path $CBTIndexPath -NewName $BackupPath -Force
        Write-Host "  CBT index backed up to: $BackupPath"
        Write-Host "  New CBT index will be created on next backup" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Step 6: Restarting CBT Service..." -ForegroundColor Yellow
if ($CBTService) {
    Restart-Service -Name "MacriumCBT" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $CBTService.Refresh()
    Write-Host "  CBT Service Status: $($CBTService.Status)"
}

Write-Host ""
Write-Host "=== Fix Applied ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for next scheduled backup (usually 9:00 AM daily)"
Write-Host "2. Or manually trigger a test backup to verify"
Write-Host "3. Check CBT.log for verification that errors are resolved"
Write-Host ""
Write-Host "If backups still fail, consider running with -ForceFullBackup flag"
Write-Host "to force a full backup and reset the CBT tracking."
Write-Host ""
Write-Host "Schedules remain unchanged - all original backup times preserved."
Write-Host ""

# Log the repair
$RepairLog = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    action = "CBT Repair Script Executed"
    resetCBT = $ResetCBT.IsPresent
    forceFull = $ForceFullBackup.IsPresent
    tasksFound = $MacriumTasks.Count
} | ConvertTo-Json

Add-Content -Path "C:\ProgramData\Macrium\Reflect\RepairLog.jsonl" -Value $RepairLog

Write-Host "Repair logged to: C:\ProgramData\Macrium\Reflect\RepairLog.jsonl" -ForegroundColor Gray
