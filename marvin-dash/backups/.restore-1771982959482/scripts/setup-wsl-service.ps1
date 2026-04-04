# WSL 24/7 Service Setup PowerShell Script
# Run as Administrator to create scheduled tasks

param(
    [switch]$Uninstall
)

$TaskName = "WSL-24x7-Monitor"
$ScriptPath = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\wsl-monitor.bat"
$LogPath = "C:\Users\Admin\.openclaw\workspace\marvin-dash\data\wsl-monitor.log"

function Install-Service {
    Write-Host "Installing WSL 24/7 Monitor Service..." -ForegroundColor Green
    
    # Ensure log directory exists
    $LogDir = Split-Path $LogPath -Parent
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    # Create the scheduled task
    $Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ScriptPath`" >> `"$LogPath`" 2>&1"
    
    # Run every 5 minutes
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 9999)
    
    # Run whether user is logged on or not, with highest privileges
    $Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType ServiceAccount -RunLevel Highest
    
    # Settings: start if not running, restart on failure
    $Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    try {
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
        Write-Host "✅ WSL 24/7 Monitor scheduled task created successfully" -ForegroundColor Green
        Write-Host "   Task: $TaskName"
        Write-Host "   Runs: Every 5 minutes"
        Write-Host "   Log: $LogPath"
        
        # Start the task immediately
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "✅ Task started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create scheduled task: $_" -ForegroundColor Red
    }
}

function Uninstall-Service {
    Write-Host "Uninstalling WSL 24/7 Monitor Service..." -ForegroundColor Yellow
    
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
