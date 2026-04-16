# deploy-nas-drive-automation.ps1
# Deploys automated NAS drive mapping that works with auto-logon
# Run as Administrator

param(
    [string]$NasIP = "10.0.1.10",
    [string]$Username = "Alexander",
    [string]$Password = '$Tandal0nec0mplex9'
)

Write-Host "=== Deploying NAS Drive Automation ===" -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

# Determine which drives to map based on hostname
$hostname = $env:COMPUTERNAME
Write-Host "Configuring for host: $hostname" -ForegroundColor Gray

switch ($hostname) {
    "Marvin" {
        $DriveMappings = @(
            @{ Letter = "Y"; Path = "\\$NasIP\video" },
            @{ Letter = "Z"; Path = "\\$NasIP\music" }
        )
    }
    "DeepThought" {
        $DriveMappings = @(
            @{ Letter = "A"; Path = "\\$NasIP\archive" },
            @{ Letter = "H"; Path = "\\$NasIP\Web" },
            @{ Letter = "M"; Path = "\\$NasIP\Magrathea" },
            @{ Letter = "V"; Path = "\\$NasIP\downloads" },
            @{ Letter = "W"; Path = "\\$NasIP\photo" },
            @{ Letter = "X"; Path = "\\$NasIP\1v1a" },
            @{ Letter = "Y"; Path = "\\$NasIP\video" },
            @{ Letter = "Z"; Path = "\\$NasIP\music" }
        )
    }
    "Bistromath" {
        $DriveMappings = @(
            @{ Letter = "M"; Path = "\\$NasIP\Magrathea" },
            @{ Letter = "U"; Path = "\\$NasIP\downloads" },
            @{ Letter = "Y"; Path = "\\$NasIP\video" },
            @{ Letter = "Z"; Path = "\\$NasIP\music" }
        )
    }
    default {
        $DriveMappings = @(
            @{ Letter = "Y"; Path = "\\$NasIP\video" },
            @{ Letter = "Z"; Path = "\\$NasIP\music" }
        )
    }
}

# Create the drive mapping script
$ScriptContent = @"
# NAS Drive Mapping Script
# Auto-generated for $hostname

`$password = '$Password'
`$user = '$Username'

# Wait for network to be ready
`$networkReady = `$false
for (`$i = 0; `$i -lt 30; `$i++) {
    if (Test-Connection -ComputerName $NasIP -Count 1 -Quiet) {
        `$networkReady = `$true
        break
    }
    Start-Sleep 2
}

if (-not `$networkReady) {
    Write-EventLog -LogName Application -Source "NAS Drive Mapping" -EventId 1001 -EntryType Error -Message "Could not reach NAS at $NasIP after 60 seconds"
    exit 1
}

# Remove stale mappings
`$mappings = @($( ($DriveMappings | ForEach-Object { "'$($_.Letter):'" }) -join ',' ))
foreach (`$map in `$mappings) {
    net use `$map /delete /y 2>`$null
}

# Map drives using net use with credentials
"@

foreach ($mapping in $DriveMappings) {
    $ScriptContent += "net use $($mapping.Letter): $($mapping.Path) /user:$Username $Password /persistent:yes`n"
}

$ScriptContent += @"

# Verify mappings
`$success = `$true
foreach (`$map in `$mappings) {
    if (-not (Test-Path `$map)) {
        `$success = `$false
    }
}

if (`$success) {
    Write-EventLog -LogName Application -Source "NAS Drive Mapping" -EventId 1000 -EntryType Information -Message "NAS drives mapped successfully on $hostname"
} else {
    Write-EventLog -LogName Application -Source "NAS Drive Mapping" -EventId 1002 -EntryType Warning -Message "Some NAS drives failed to map on $hostname"
}
"@

$ScriptPath = "C:\ProgramData\NASDriveMapping.ps1"
$ScriptContent | Set-Content -Path $ScriptPath -Force
Write-Host "[1/3] Drive mapping script created at $ScriptPath" -ForegroundColor Green

# Create Event Log source if it doesn't exist
if (-not [System.Diagnostics.EventLog]::SourceExists("NAS Drive Mapping")) {
    New-EventLog -LogName Application -Source "NAS Drive Mapping"
}

# Create scheduled task
Write-Host "[2/3] Creating scheduled task..." -NoNewline

# Use the current user's SID for the task
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$userSid = $currentUser.User.Value

$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File $ScriptPath"
$Trigger = New-ScheduledTaskTrigger -AtLogon
$Principal = New-ScheduledTaskPrincipal -SID $userSid -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Remove existing task
Unregister-ScheduledTask -TaskName "NAS Drive Mapping" -Confirm:$false -ErrorAction SilentlyContinue

# Register the task
Register-ScheduledTask -TaskName "NAS Drive Mapping" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings | Out-Null
Write-Host " OK" -ForegroundColor Green

# Run the script now
Write-Host "[3/3] Mapping drives now..." -NoNewline
& PowerShell.exe -ExecutionPolicy Bypass -File $ScriptPath
Write-Host " OK" -ForegroundColor Green

# Display current status
Write-Host ""
Write-Host "Current drive status:" -ForegroundColor Gray
net use | Select-String "\\\\$NasIP"

Write-Host ""
Write-Host "=== NAS Drive Automation Deployed ===" -ForegroundColor Cyan
Write-Host "Drives will be automatically remapped at each user logon." -ForegroundColor Green
