$LogDir = 'C:\Users\admin\.openclaw\workspace\logs\mission-control'
$ServerScript = 'C:\Users\admin\.openclaw\workspace\mission-control\server.ps1'
$ApiPort = 8080

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogFile = Join-Path $LogDir "api\api_$(Get-Date -Format 'yyyyMMdd').log"
    "[$Timestamp] [$Level] $Message" | Add-Content -Path $LogFile
}

Write-Log "Mission Control API Service Starting..."
Write-Log "Port: $ApiPort"
Write-Log "Log Directory: $LogDir"

$RestartCount = 0
$MaxRestarts = 10
$RestartWindow = 300  # 5 minutes
$RestartTimes = @()

while ($true) {
    try {
        Write-Log "Starting server (restart #$RestartCount)..."
        
        # Track restart times for crash detection
        $Now = Get-Date
        $RestartTimes = @($RestartTimes | Where-Object { $_ -is [DateTime] -and ($Now - $_).TotalSeconds -lt $RestartWindow })
        $RestartTimes += $Now
        
        # Crash loop detection
        if ($RestartTimes.Count -gt $MaxRestarts) {
            Write-Log "CRASH LOOP DETECTED: Too many restarts in $RestartWindow seconds" "ERROR"
            Write-Log "Service entering cooldown for 60 seconds..." "WARN"
            Start-Sleep -Seconds 60
            $RestartTimes = @()
            continue
        }
        
        # Start the server
        & $ServerScript -Port $ApiPort 2>&1 | ForEach-Object {
            $Line = $_.ToString()
            Write-Log $Line
            
            # Also write errors to separate error log
            if ($Line -match "error|exception|fail" -or $_.GetType().Name -eq "ErrorRecord") {
                $ErrorLog = Join-Path $LogDir "error\error_$(Get-Date -Format 'yyyyMMdd').log"
                "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Line" | Add-Content -Path $ErrorLog
            }
        }
        
        Write-Log "Server process exited unexpectedly" "WARN"
        
    } catch {
        $ErrorMsg = $_.Exception.Message
        Write-Log "Server crashed: $ErrorMsg" "ERROR"
        $ErrorLog = Join-Path $LogDir "error\error_$(Get-Date -Format 'yyyyMMdd').log"
        "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] CRASH: $ErrorMsg" | Add-Content -Path $ErrorLog
    }
    
    $RestartCount++
    Write-Log "Restarting in 5 seconds... (restart #$RestartCount)" "WARN"
    Start-Sleep -Seconds 5
}
