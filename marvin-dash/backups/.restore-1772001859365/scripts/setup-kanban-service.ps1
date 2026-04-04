# Kanban Auto-Refresh Service Setup PowerShell Script
# Run as Administrator to create scheduled tasks

param(
    [switch]$Uninstall
)

$TaskName = "Kanban-AutoRefresh"
$ScriptPath = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\kanban-refresh.bat"
$LogPath = "C:\Users\Admin\.openclaw\workspace\marvin-dash\data\kanban-refresh.log"

function Install-Service {
    Write-Host "Installing Kanban Auto-Refresh Service..." -ForegroundColor Green
    
    # Ensure log directory exists
    $LogDir = Split-Path $LogPath -Parent
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    # Create the scheduled task
    $Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ScriptPath`" >> `"$LogPath`" 2>&1"
    
    # Run every 30 minutes
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 9999)
    
    # Run whether user is logged on or not
    $Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType ServiceAccount -RunLevel Highest
    
    # Settings
    $Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    try {
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
        Write-Host "✅ Kanban Auto-Refresh scheduled task created successfully" -ForegroundColor Green
        Write-Host "   Task: $TaskName"
        Write-Host "   Runs: Every 30 minutes"
        Write-Host "   Log: $LogPath"
        
        # Start the task immediately
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "✅ Task started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create scheduled task: $_" -ForegroundColor Red
    }
}

function Uninstall-Service {
    Write-Host "Uninstalling Kanban Auto-Refresh Service..." -ForegroundColor Yellow
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "✅ Scheduled task removed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Task not found or already removed" -ForegroundColor Yellow
    }
}

# Main
if ($Uninstall) {
    Uninstall-Service
} else {
    # Check if running as admin
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (!$IsAdmin) {
        Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
        Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
        exit 1
    }
    
    Install-Service
}
