param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,

    [string]$TaskName = "OpenClawConfigBackup",

    [int]$IntervalHours = 3,

    [switch]$RunAtLogon
)

if (-not (Test-Path $ScriptPath)) {
    Write-Error "Script not found: $ScriptPath"
    exit 1
}

$resolvedPath = (Resolve-Path $ScriptPath).Path
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$resolvedPath`""

$triggers = @()
$startTime = (Get-Date).Date.AddMinutes(2)
$triggers += New-ScheduledTaskTrigger -Once -At $startTime -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) -RepetitionDuration (New-TimeSpan -Days 3650)

if ($RunAtLogon) {
    $triggers += New-ScheduledTaskTrigger -AtLogOn
}

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel Highest -LogonType Interactive

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

$task = New-ScheduledTask -Action $action -Trigger @($triggers) -Principal $principal
Register-ScheduledTask -TaskName $TaskName -InputObject $task | Out-Null

