# fix-nas-drives-scheduled.ps1
# Creates a scheduled task to map NAS drives at logon
# Run as Administrator on each machine

param(
    [string]$NasIP = "10.0.1.10",
    [string]$Username = "Alexander",
    [string]$Password = '$Tandal0nec0mplex9'
)

Write-Host "=== Creating NAS Drive Mapping Scheduled Task ===" -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

# Create the script that will run at logon
$ScriptContent = @"
`$password = ConvertTo-SecureString -String '$Password' -AsPlainText -Force
`$cred = New-Object System.Management.Automation.PSCredential('$Username', `$password)

# Remove any existing stale mappings
Get-SmbMapping | Where-Object { `$_.RemotePath -like '\\$NasIP\*' } | Remove-SmbMapping -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Map drives
New-PSDrive -Name Y -PSProvider FileSystem -Root '\\$NasIP\video' -Credential `$cred -Persist -Scope Global -ErrorAction SilentlyContinue
New-PSDrive -Name Z -PSProvider FileSystem -Root '\\$NasIP\music' -Credential `$cred -Persist -Scope Global -ErrorAction SilentlyContinue
"@

$ScriptPath = "C:\ProgramData\NASDriveMapping.ps1"
$ScriptContent | Set-Content -Path $ScriptPath -Force
Write-Host "[1/3] Mapping script created at $ScriptPath" -ForegroundColor Green

# Create scheduled task
Write-Host "[2/3] Creating scheduled task..." -NoNewline
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File $ScriptPath"
$Trigger = New-ScheduledTaskTrigger -AtLogon
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Remove existing task if present
Unregister-ScheduledTask -TaskName "NAS Drive Mapping" -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName "NAS Drive Mapping" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings | Out-Null
Write-Host " OK" -ForegroundColor Green

# Run the script now to map drives immediately
Write-Host "[3/3] Mapping drives now..." -NoNewline
& PowerShell.exe -ExecutionPolicy Bypass -File $ScriptPath
Write-Host " OK" -ForegroundColor Green

# Verify
Write-Host ""
Write-Host "Current mappings:" -ForegroundColor Gray
Get-SmbMapping | Where-Object { $_.RemotePath -like "\\$NasIP\*" } | Select-Object LocalPath, RemotePath, Status | Format-Table

Write-Host ""
Write-Host "=== NAS Drive Fix Complete ===" -ForegroundColor Cyan
Write-Host "Drives will be automatically remapped at each logon." -ForegroundColor Green
