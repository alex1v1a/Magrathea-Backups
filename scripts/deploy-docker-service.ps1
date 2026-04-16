# deploy-docker-service.ps1
# Deploys Docker Desktop configuration for auto-start
# Run as Administrator on Marvin

param(
    [switch]$InstallService,
    [switch]$Restart
)

$ErrorActionPreference = "Stop"

Write-Host "=== Docker Desktop Service Deployment ===" -ForegroundColor Cyan
Write-Host "Target: Marvin (10.0.1.90)" -ForegroundColor Gray
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

Write-Host "[1/5] Checking Docker Desktop installation..." -NoNewline
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerPath)) {
    Write-Error "Docker Desktop not found at $dockerPath. Please install it first."
    exit 1
}
Write-Host " OK" -ForegroundColor Green

Write-Host "[2/5] Configuring auto-logon for admin user..." -NoNewline
# Enable auto-logon
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultUserName" -Value "admin"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultPassword" -Value "section9"
Write-Host " OK" -ForegroundColor Green

Write-Host "[3/5] Creating scheduled task for Docker Desktop..." -NoNewline
# Create scheduled task
$action = New-ScheduledTaskAction -Execute $dockerPath
$trigger = New-ScheduledTaskTrigger -AtLogon
$principal = New-ScheduledTaskPrincipal -UserId "admin" -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Remove existing task if present
Unregister-ScheduledTask -TaskName "Docker Desktop AutoStart" -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName "Docker Desktop AutoStart" -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
Write-Host " OK" -ForegroundColor Green

Write-Host "[4/5] Enabling Docker Desktop auto-start in settings..." -NoNewline
# Update Docker Desktop settings to auto-start
$dockerConfigPath = "$env:LOCALAPPDATA\Docker\settings.json"
if (Test-Path $dockerConfigPath) {
    $config = Get-Content $dockerConfigPath | ConvertFrom-Json
    if (-not $config.PSObject.Properties["desktop"]) {
        $config | Add-Member -NotePropertyName "desktop" -NotePropertyValue @{}
    }
    if (-not $config.desktop.PSObject.Properties["autoStart"]) {
        $config.desktop | Add-Member -NotePropertyName "autoStart" -NotePropertyValue $true
    } else {
        $config.desktop.autoStart = $true
    }
    $config | ConvertTo-Json -Depth 10 | Set-Content $dockerConfigPath
}
Write-Host " OK" -ForegroundColor Green

Write-Host "[5/5] Creating startup shortcut..." -NoNewline
# Create startup shortcut
$startupPath = "C:\Users\admin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = Join-Path $startupPath "Docker Desktop.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $dockerPath
$Shortcut.WorkingDirectory = "C:\Program Files\Docker\Docker"
$Shortcut.Save()
Write-Host " OK" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration applied:"
Write-Host "  - Auto-logon enabled for admin user"
Write-Host "  - Scheduled task created for Docker Desktop"
Write-Host "  - Startup shortcut created"
Write-Host "  - Docker Desktop settings updated"
Write-Host ""

if ($Restart) {
    Write-Host "Restarting computer in 10 seconds..." -ForegroundColor Yellow
    Start-Sleep 10
    Restart-Computer -Force
} else {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Reboot the machine: Restart-Computer"
    Write-Host "  2. After reboot, Docker Desktop should start automatically"
    Write-Host "  3. Verify with: docker ps"
    Write-Host ""
    Write-Host "To check status:" -ForegroundColor Gray
    Write-Host "  - Look for whale icon in system tray after login"
    Write-Host "  - Run: docker version"
    Write-Host "  - Check: wsl --list --verbose (should show docker-desktop)"
}
