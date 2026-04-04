#requires -RunAsAdministrator

<#
.SYNOPSIS
    Monitor for CMD windows that crash Chrome
.DESCRIPTION
    Watches for cmd.exe processes and logs their command lines to identify
    what's spawning windows that crash Chrome
#>

param(
    [int]$DurationMinutes = 30,
    [string]$LogPath = "C:\Users\Admin\.openclaw\workspace\chrome-crash-monitor.log"
)

$startTime = Get-Date
$endTime = $startTime.AddMinutes($DurationMinutes)

"=== Chrome Crash Monitor Started: $(Get-Date) ===" | Out-File -FilePath $LogPath -Append
"Monitoring for $DurationMinutes minutes..." | Out-File -FilePath $LogPath -Append
"`n" | Out-File -FilePath $LogPath -Append

# Track already-seen processes
$seenProcesses = @{}

# Function to get process details
function Get-ProcessDetails($proc) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        $parent = Get-Process -Id $proc.Parent.Id -ErrorAction SilentlyContinue
        $parentName = if ($parent) { $parent.ProcessName } else { "Unknown" }
        $parentCmd = if ($parent) { 
            (Get-CimInstance Win32_Process -Filter "ProcessId=$($parent.Id)" -ErrorAction SilentlyContinue).CommandLine 
        } else { "Unknown" }
        
        return @{
            CmdLine = $cmdLine
            ParentName = $parentName
            ParentCmd = $parentCmd
            StartTime = $proc.StartTime
            WindowTitle = $proc.MainWindowTitle
        }
    } catch {
        return $null
    }
}

# Function to log process info
function Log-Process($proc, $details) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = @"
[$timestamp] CMD WINDOW DETECTED
  PID: $($proc.Id)
  Window Title: $($details.WindowTitle)
  Command Line: $($details.CmdLine)
  Parent Process: $($details.ParentName) (PID: $($proc.Parent.Id))
  Parent Command: $($details.ParentCmd)
  Started: $($details.StartTime)
  -------------------
"@
    
    $logEntry | Out-File -FilePath $LogPath -Append
    Write-Host $logEntry -ForegroundColor Yellow
}

# Function to check if Chrome is running
function Get-ChromeStatus {
    $chromeProcs = Get-Process chrome -ErrorAction SilentlyContinue
    if ($chromeProcs) {
        return @{
            Running = $true
            Count = $chromeProcs.Count
            PIDs = ($chromeProcs | Select-Object -ExpandProperty Id) -join ", "
        }
    }
    return @{ Running = $false; Count = 0; PIDs = "None" }
}

Write-Host "Starting Chrome Crash Monitor..." -ForegroundColor Green
Write-Host "Monitoring for CMD windows that may crash Chrome"
Write-Host "Log file: $LogPath"
Write-Host "Duration: $DurationMinutes minutes"
Write-Host "Press Ctrl+C to stop early`n"

# Log initial Chrome status
$initialChrome = Get-ChromeStatus
"[$($startTime.ToString('HH:mm:ss'))] Initial Chrome status: Running=$($initialChrome.Running), PIDs=$($initialChrome.PIDs)" | Out-File -FilePath $LogPath -Append

while ((Get-Date) -lt $endTime) {
    # Check for new cmd.exe processes
    $cmdProcesses = Get-Process cmd -ErrorAction SilentlyContinue
    
    foreach ($proc in $cmdProcesses) {
        # Skip if we've already seen this process
        if ($seenProcesses.ContainsKey($proc.Id)) {
            continue
        }
        
        # Mark as seen
        $seenProcesses[$proc.Id] = $true
        
        # Get details
        $details = Get-ProcessDetails $proc
        if ($details) {
            Log-Process $proc $details
            
            # Check Chrome status after detecting CMD
            Start-Sleep -Milliseconds 500
            $chromeStatus = Get-ChromeStatus
            if (-not $chromeStatus.Running) {
                $msg = "[$($timestamp)] ⚠️  ALERT: Chrome crashed after CMD window appeared!"
                $msg | Out-File -FilePath $LogPath -Append
                Write-Host $msg -ForegroundColor Red
            }
        }
    }
    
    # Also check for suspicious node.exe processes launching chrome
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
        $_.Parent -and ($_.Parent.ProcessName -eq "node" -or $_.Parent.ProcessName -eq "powershell")
    }
    
    foreach ($nodeProc in $nodeProcesses) {
        if (-not $seenProcesses.ContainsKey("node_$($nodeProc.Id)")) {
            $seenProcesses["node_$($nodeProc.Id)"] = $true
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($nodeProc.Id)" -ErrorAction SilentlyContinue).CommandLine
            
            if ($cmdLine -match "chrome|heb|facebook|marketplace") {
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $logEntry = @"
[$timestamp] NODE PROCESS DETECTED (Chrome-related)
  PID: $($nodeProc.Id)
  Command: $cmdLine
  Parent: $($nodeProc.Parent.ProcessName)
  -------------------
"@
                $logEntry | Out-File -FilePath $LogPath -Append
                Write-Host $logEntry -ForegroundColor Cyan
            }
        }
    }
    
    # Clean up dead process IDs from seen list periodically
    if ($seenProcesses.Count -gt 1000) {
        $alivePIDs = (Get-Process).Id
        $keysToRemove = $seenProcesses.Keys | Where-Object { 
            $key = $_
            if ($key -match "^node_") {
                $pid = $key -replace "^node_", ""
                $pid -notin $alivePIDs
            } else {
                $_ -notin $alivePIDs
            }
        }
        foreach ($key in $keysToRemove) {
            $seenProcesses.Remove($key)
        }
    }
    
    Start-Sleep -Milliseconds 100  # Check every 100ms
}

$endTimeStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"`n=== Monitor Ended: $endTimeStr ===" | Out-File -FilePath $LogPath -Append
"Total CMD windows detected: $($seenProcesses.Count)" | Out-File -FilePath $LogPath -Append

Write-Host "`nMonitoring complete. Log saved to: $LogPath" -ForegroundColor Green
