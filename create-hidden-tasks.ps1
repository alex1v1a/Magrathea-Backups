# Alternative Service Creation using PowerShell
# This creates services without requiring NSSM

Write-Host "🔧 Marvin Services - PowerShell Implementation" -ForegroundColor Cyan
Write-Host "=" * 60

# Create the service runner script
$serviceRunner = @'
# Marvin Service Runner
# Runs as a Windows service via PowerShell

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceName,
    
    [Parameter(Mandatory=$true)]
    [string]$ScriptPath,
    
    [string]$Arguments = "",
    
    [int]$IntervalSeconds = 300
)

$ErrorActionPreference = 'Continue'

# Create log source if needed
try {
    New-EventLog -LogName Application -Source $ServiceName -ErrorAction SilentlyContinue
} catch {}

Write-EventLog -LogName Application -Source $ServiceName -EventId 1000 -EntryType Information -Message "$ServiceName started"

while ($true) {
    try {
        Write-EventLog -LogName Application -Source $ServiceName -EventId 1001 -EntryType Information -Message "Running $ScriptPath"
        
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = "$ScriptPath $Arguments"
        $psi.WorkingDirectory = "C:\Users\Admin\.openclaw\workspace"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true
        
        $process = [System.Diagnostics.Process]::Start($psi)
        $process.WaitForExit()
        
        Write-EventLog -LogName Application -Source $ServiceName -EventId 1002 -EntryType Information -Message "$ServiceName completed with exit code: $($process.ExitCode)"
        
    } catch {
        Write-EventLog -LogName Application -Source $ServiceName -EventId 1003 -EntryType Error -Message "Error: $_"
    }
    
    Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Waiting $IntervalSeconds seconds..."
    Start-Sleep -Seconds $IntervalSeconds
}
'@

$runnerPath = "C:\Users\Admin\.openclaw\workspace\service-runner.ps1"
$serviceRunner | Out-File -FilePath $runnerPath -Encoding UTF8

Write-Host "`nCreated service runner: $runnerPath" -ForegroundColor Green

# Service definitions
$services = @(
    @{ Name = "MarvinAutoRecovery"; DisplayName = "Marvin Auto Recovery"; Script = "marvin-dash\scripts\auto-recovery.js"; Args = "--auto"; Interval = 300 },
    @{ Name = "MarvinEmailMonitor"; DisplayName = "Marvin Email Monitor"; Script = "scripts\email-monitor.js"; Args = ""; Interval = 900 },
    @{ Name = "MarvinBackup"; DisplayName = "Marvin Backup"; Script = "marvin-dash\scripts\backup.js"; Args = "--auto"; Interval = 900 }
)

foreach ($svc in $services) {
    Write-Host "`nConfiguring: $($svc.DisplayName)" -ForegroundColor Yellow
    
    # Remove existing service
    $existing = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  Removing existing service..."
        Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
        sc.exe delete $svc.Name | Out-Null
        Start-Sleep 2
    }
    
    # Remove existing scheduled task
    $task = Get-ScheduledTask -TaskName $svc.Name -ErrorAction SilentlyContinue
    if ($task) {
        Unregister-ScheduledTask -TaskName $svc.Name -Confirm:$false
        Write-Host "  Removed scheduled task"
    }
    
    # Create new scheduled task that runs hidden
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runnerPath`" -ServiceName `"$($svc.Name)`" -ScriptPath `"C:\Users\Admin\.openclaw\workspace\$($svc.Script)`" -Arguments `"$($svc.Args)`" -IntervalSeconds $($svc.Interval)"
    
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $trigger.Repetition = $(New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes ($svc.Interval / 60))).Repetition
    
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    $settings.Hidden = $true
    
    $principal = New-ScheduledTaskPrincipal -UserId "Admin" -LogonType ServiceAccount -RunLevel Highest
    
    try {
        Register-ScheduledTask -TaskName $svc.Name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
        Start-ScheduledTask -TaskName $svc.Name
        Write-Host "  ✅ Created hidden scheduled task" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "Setup complete!" -ForegroundColor Cyan
Write-Host "Tasks now run HIDDEN (no CMD windows)" -ForegroundColor Green
Write-Host "`nTo verify: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'Marvin*' }" -ForegroundColor Gray
