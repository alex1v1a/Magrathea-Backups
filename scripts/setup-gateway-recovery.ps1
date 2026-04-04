# OpenClaw Gateway Auto-Recovery Setup
# This script sets up automatic monitoring and recovery for the OpenClaw gateway
# Run this once to configure the scheduled task

param(
    [switch]$Uninstall,
    [int]$CheckIntervalMinutes = 5
)

$TaskName = "OpenClaw Gateway Auto-Recovery"
$ScriptPath = Join-Path $PSScriptRoot "gateway-recovery.ps1"
$LogPath = "$env:USERPROFILE\.openclaw\logs\gateway-recovery.log"

function Install-AutoRecovery {
    Write-Host "Installing OpenClaw Gateway Auto-Recovery..." -ForegroundColor Green
    
    # Ensure log directory exists
    $LogDir = Split-Path $LogPath -Parent
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
        Write-Host "Created log directory: $LogDir" -ForegroundColor Gray
    }
    
    # Verify the recovery script exists
    if (!(Test-Path $ScriptPath)) {
        Write-Error "Recovery script not found at: $ScriptPath"
        exit 1
    }
    
    # Remove existing task if present
    schtasks /Query /TN "$TaskName" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Removing existing scheduled task..." -ForegroundColor Yellow
        schtasks /Delete /TN "$TaskName" /F 2>&1 | Out-Null
    }
    
    # Create the scheduled task
    $Action = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
    
    Write-Host "Creating scheduled task '$TaskName'..." -ForegroundColor Cyan
    Write-Host "  - Runs every: $CheckIntervalMinutes minutes" -ForegroundColor Gray
    Write-Host "  - Script: $ScriptPath" -ForegroundColor Gray
    Write-Host "  - Log: $LogPath" -ForegroundColor Gray
    
    $Result = schtasks /Create /TN "$TaskName" /TR "$Action" /SC MINUTE /MO $CheckIntervalMinutes /RL HIGHEST /F 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Auto-recovery installed successfully!" -ForegroundColor Green
        Write-Host "`nThe gateway will be checked every $CheckIntervalMinutes minutes." -ForegroundColor White
        Write-Host "Logs are saved to: $LogPath" -ForegroundColor Gray
        Write-Host "`nTo check status: schtasks /Query /TN `"$TaskName`" /V" -ForegroundColor Cyan
        Write-Host "To remove: .\setup-gateway-recovery.ps1 -Uninstall" -ForegroundColor Cyan
        
        # Run the recovery script once immediately
        Write-Host "`nRunning initial health check..." -ForegroundColor Yellow
        & $ScriptPath
        
    } else {
        Write-Error "Failed to create scheduled task: $Result"
        exit 1
    }
}

function Uninstall-AutoRecovery {
    Write-Host "Uninstalling OpenClaw Gateway Auto-Recovery..." -ForegroundColor Yellow
    
    schtasks /Query /TN "$TaskName" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        schtasks /Delete /TN "$TaskName" /F 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Scheduled task removed successfully" -ForegroundColor Green
        } else {
            Write-Error "Failed to remove scheduled task"
        }
    } else {
        Write-Host "No existing task found to remove" -ForegroundColor Gray
    }
}

# Main execution
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  OpenClaw Gateway Auto-Recovery Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

if ($Uninstall) {
    Uninstall-AutoRecovery
} else {
    Install-AutoRecovery
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
