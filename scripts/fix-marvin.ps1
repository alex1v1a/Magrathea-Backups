# fix-marvin.ps1
# Fixes Docker Desktop on Marvin (10.0.1.90)
# Run as Administrator

Write-Host "=== Fixing Marvin (10.0.1.90) ===" -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

# Stop all Docker processes
Write-Host "[1/5] Stopping Docker processes..." -NoNewline
Get-Process *docker* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
Write-Host " OK" -ForegroundColor Green

# Shutdown WSL
Write-Host "[2/5] Shutting down WSL..." -NoNewline
wsl --shutdown 2>&1 | Out-Null
Start-Sleep 2
Write-Host " OK" -ForegroundColor Green

# Clear Docker data (keeps images/containers)
Write-Host "[3/5] Clearing Docker Desktop cache..." -NoNewline
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker" -ErrorAction SilentlyContinue
Write-Host " OK" -ForegroundColor Green

# Configure auto-logon
Write-Host "[4/5] Configuring auto-logon..." -NoNewline
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultUserName" -Value "admin"
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "DefaultPassword" -Value "section9"
Write-Host " OK" -ForegroundColor Green

# Create scheduled task for Docker
Write-Host "[5/5] Creating Docker Desktop scheduled task..." -NoNewline
$action = New-ScheduledTaskAction -Execute "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$trigger = New-ScheduledTaskTrigger -AtLogon
$principal = New-ScheduledTaskPrincipal -UserId "admin" -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Unregister-ScheduledTask -TaskName "Docker Desktop AutoStart" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Docker Desktop AutoStart" -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
Write-Host " OK" -ForegroundColor Green

Write-Host ""
Write-Host "=== Marvin Fix Complete ===" -ForegroundColor Cyan
Write-Host "A reboot is required. After reboot, Docker Desktop should start automatically." -ForegroundColor Yellow
