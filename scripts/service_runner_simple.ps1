# Vectarr Mission Control - Simple Service Runner
# Runs the Mission Control server as a Windows service

$LogDir = "C:\Users\admin\.openclaw\workspace\logs\mission-control"
$ServerScript = "C:\Users\admin\.openclaw\workspace\mission-control\server.ps1"
$ApiPort = 8080

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogFile = Join-Path $LogDir "api\api_$(Get-Date -Format 'yyyyMMdd').log"
    "[$Timestamp] [$Level] $Message" | Add-Content -Path $LogFile
}

Write-Log "Mission Control API Service Starting..."
Write-Log "Port: $ApiPort"

$RestartCount = 0
$BaseDelay = 5

while ($true) {
    try {
        Write-Log "Starting server (restart #$RestartCount)..."
        
        # Run server and capture output
        & $ServerScript -Port $ApiPort 2>&1 | ForEach-Object {
            Write-Log $_.ToString()
        }
        
        Write-Log "Server process exited" "WARN"
        
    } catch {
        Write-Log "Server crashed: $($_.Exception.Message)" "ERROR"
    }
    
    $RestartCount++
    # Exponential backoff: doubles each restart, capped at 300s (5 min)
    $Delay = [math]::Min($BaseDelay * [math]::Pow(2, $RestartCount - 1), 300)
    Write-Log "Restarting in ${Delay}s... (restart #$RestartCount)" "WARN"
    Start-Sleep -Seconds $Delay
}
