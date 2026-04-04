# WSL Keep-Alive Script
# Ensures WSL Ubuntu stays running and auto-restarts if needed
# Run this as a Windows Scheduled Task every 5 minutes

param(
    [switch]$Install,
    [switch]$Check,
    [switch]$Service
)

$WSL_DISTRO = "Ubuntu"
$LOG_FILE = "$env:USERPROFILE\.openclaw\workspace\wsl-keepalive.log"
$PID_FILE = "$env:USERPROFILE\.openclaw\workspace\wsl-keepalive.pid"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logEntry
    if ($Level -eq "ERROR") { Write-Host $logEntry -ForegroundColor Red }
    elseif ($Level -eq "WARN") { Write-Host $logEntry -ForegroundColor Yellow }
    elseif ($Level -eq "SUCCESS") { Write-Host $logEntry -ForegroundColor Green }
    else { Write-Host $logEntry }
}

function Test-WSLRunning {
    try {
        $output = wsl --list --running --quiet 2>$null
        return $output -contains $WSL_DISTRO
    } catch {
        return $false
    }
}

function Test-WSLResponsive {
    try {
        $result = wsl -d $WSL_DISTRO -- exec echo "ping" 2>$null
        return $result -eq "ping"
    } catch {
        return $false
    }
}

function Start-WSL {
    Write-Log "Starting WSL distribution: $WSL_DISTRO" "WARN"
    try {
        # Start WSL in background
        Start-Process -FilePath "wsl" -ArgumentList "-d", $WSL_DISTRO, "--", "exec", "sleep", "infinity" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        if (Test-WSLRunning) {
            Write-Log "WSL $WSL_DISTRO started successfully" "SUCCESS"
            return $true
        } else {
            Write-Log "Failed to start WSL $WSL_DISTRO" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error starting WSL: $_" "ERROR"
        return $false
    }
}

function Restart-WSL {
    Write-Log "Restarting WSL distribution: $WSL_DISTRO" "WARN"
    try {
        wsl --terminate $WSL_DISTRO 2>$null
        Start-Sleep -Seconds 2
        return Start-WSL
    } catch {
        Write-Log "Error restarting WSL: $_" "ERROR"
        return $false
    }
}

function Start-KeepAliveService {
    Write-Log "=== WSL Keep-Alive Service Starting ===" "SUCCESS"
    
    # Create PID file
    $PID | Out-File -FilePath $PID_FILE -Force
    
    # Set process priority to below normal to avoid impacting system
    $process = Get-Process -Id $PID
    $process.PriorityClass = 'BelowNormal'
    
    # Keep WSL alive loop
    $checkInterval = 60  # Check every 60 seconds
    $healthCheckCounter = 0
    
    while ($true) {
        $isRunning = Test-WSLRunning
        
        if (-not $isRunning) {
            Write-Log "WSL $WSL_DISTRO is not running. Starting..." "WARN"
            Start-WSL
        } else {
            # Every 5 minutes, do a deeper health check
            $healthCheckCounter++
            if ($healthCheckCounter -ge 5) {
                $healthCheckCounter = 0
                if (-not (Test-WSLResponsive)) {
                    Write-Log "WSL $WSL_DISTRO is unresponsive. Restarting..." "WARN"
                    Restart-WSL
                } else {
                    Write-Log "WSL health check: OK" "INFO"
                }
            }
        }
        
        Start-Sleep -Seconds $checkInterval
    }
}

function Install-KeepAliveTask {
    Write-Log "Installing WSL Keep-Alive Scheduled Task..." "INFO"
    
    $taskName = "WSL-KeepAlive"
    $scriptPath = $PSCommandPath
    
    # Create the action
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Service"
    
    # Create the trigger (run at startup and every 5 minutes)
    $startupTrigger = New-ScheduledTaskTrigger -AtStartup
    $intervalTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
    
    # Create the principal (run as current user with highest privileges)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
    
    # Create the settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    try {
        # Remove existing task if exists
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        
        # Register the task
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $startupTrigger, $intervalTrigger -Principal $principal -Settings $settings -Force | Out-Null
        
        Write-Log "Scheduled task '$taskName' installed successfully" "SUCCESS"
        Write-Log "The task will run at startup and every 5 minutes" "INFO"
        
        # Start the task immediately
        Start-ScheduledTask -TaskName $taskName
        Write-Log "Task started" "SUCCESS"
        
    } catch {
        Write-Log "Failed to install scheduled task: $_" "ERROR"
    }
}

function Test-KeepAliveStatus {
    Write-Log "=== WSL Keep-Alive Status Check ===" "INFO"
    
    $isRunning = Test-WSLRunning
    $isResponsive = if ($isRunning) { Test-WSLResponsive } else { $false }
    
    Write-Log "WSL Distribution: $WSL_DISTRO" "INFO"
    Write-Log "Running: $isRunning" $(if ($isRunning) { "SUCCESS" } else { "WARN" })
    Write-Log "Responsive: $isResponsive" $(if ($isResponsive) { "SUCCESS" } else { "WARN" })
    
    # Check if scheduled task exists
    $task = Get-ScheduledTask -TaskName "WSL-KeepAlive" -ErrorAction SilentlyContinue
    if ($task) {
        Write-Log "Keep-Alive Task: Installed ($($task.State))" "SUCCESS"
    } else {
        Write-Log "Keep-Alive Task: Not installed" "WARN"
    }
    
    # Show recent log entries
    if (Test-Path $LOG_FILE) {
        Write-Log "`nRecent log entries:" "INFO"
        Get-Content -Path $LOG_FILE -Tail 10 | ForEach-Object { Write-Host "  $_" }
    }
    
    return $isRunning -and $isResponsive
}

# Main script logic
if ($Install) {
    Install-KeepAliveTask
} elseif ($Check) {
    Test-KeepAliveStatus
} elseif ($Service) {
    Start-KeepAliveService
} else {
    # Default: run a single check and start if needed
    Write-Log "Running WSL Keep-Alive check..." "INFO"
    
    if (-not (Test-WSLRunning)) {
        Start-WSL
    } elseif (-not (Test-WSLResponsive)) {
        Restart-WSL
    } else {
        Write-Log "WSL is running and responsive" "SUCCESS"
    }
    
    Write-Log "`nTip: Use -Install to create a scheduled task, -Check for status, -Service for continuous monitoring" "INFO"
}
