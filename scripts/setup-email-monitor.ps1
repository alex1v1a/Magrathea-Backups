# Email Monitor Task Scheduler Setup
# Run this script as Administrator to create the scheduled task

$TaskName = "Marvin Email Monitor"
$TaskDescription = "Check email accounts every 15 minutes for important messages"
$ScriptPath = "C:\Users\Admin\.openclaw\workspace\scripts\email-monitor.js"
$NodePath = "node"
$WorkingDir = "C:\Users\Admin\.openclaw\workspace\scripts"

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script must be run as Administrator. Right-click and select 'Run as Administrator'." -ForegroundColor Red
    exit 1
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task '$TaskName' already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the action (use batch file wrapper for credential handling)
$BatchPath = "C:\Users\Admin\.openclaw\workspace\scripts\run-email-monitor.bat"
$Action = New-ScheduledTaskAction -Execute $BatchPath -WorkingDirectory $WorkingDir

# Create the trigger (every 15 minutes)
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)

# Create the settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Create the principal (run whether user is logged on or not)
$Principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType S4U -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description $TaskDescription -Force
    Write-Host "✅ Task '$TaskName' created successfully!" -ForegroundColor Green
    Write-Host "   Schedule: Every 15 minutes" -ForegroundColor Cyan
    Write-Host "   Script: $ScriptPath" -ForegroundColor Cyan
    
    # Start the task immediately for testing
    Write-Host "`nStarting task for initial test..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $TaskName
    
    Start-Sleep -Seconds 2
    
    # Check task status
    $taskInfo = Get-ScheduledTask -TaskName $TaskName
    Write-Host "`nTask Status: $($taskInfo.State)" -ForegroundColor Cyan
    
    if ($taskInfo.State -eq "Running") {
        Write-Host "Task is running. Check logs in a few moments..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create task: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nTo view or modify the task:" -ForegroundColor Yellow
Write-Host "  - Open Task Scheduler (taskschd.msc)" -ForegroundColor Gray
Write-Host "  - Navigate to Task Scheduler Library" -ForegroundColor Gray
Write-Host "  - Find '$TaskName'" -ForegroundColor Gray
Write-Host "`nTo check logs:" -ForegroundColor Yellow
Write-Host "  - Email monitor state: C:\Users\Admin\.openclaw\workspace\marvin-dash\data\email-monitor-state.json" -ForegroundColor Gray
Write-Host "  - Notification log: C:\Users\Admin\.openclaw\workspace\marvin-dash\data\email-notifications.json" -ForegroundColor Gray
