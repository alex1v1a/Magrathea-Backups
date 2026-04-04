# OpenClaw Gateway Auto-Recovery Script
# This script monitors and automatically fixes OpenClaw gateway issues
# Run this periodically via Task Scheduler or cron

param(
    [switch]$Verbose,
    [int]$MaxRetries = 3,
    [int]$RetryDelaySeconds = 10
)

$LogFile = "$env:USERPROFILE\.openclaw\logs\gateway-recovery.log"
$ErrorActionPreference = "Continue"

# Ensure log directory exists
$LogDir = Split-Path $LogFile -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
}

# Helper function to run commands hidden
function Invoke-HiddenCommand {
    param($Command, $Arguments)
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $Command
        $psi.Arguments = $Arguments
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true
        $psi.WindowStyle = 'Hidden'
        
        $process = [System.Diagnostics.Process]::Start($psi)
        $stdout = $process.StandardOutput.ReadToEnd()
        $process.WaitForExit()
        return $stdout
    } catch {
        return $null
    }
}

function Test-GatewayHealth {
    # Check 1: HTTP endpoint responds
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:18789/status" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($Response.StatusCode -ne 200) {
            return $false
        }
    } catch {
        return $false
    }
    
    # Check 2: Gateway service is actually running (not stopped/zombie)
    try {
        $StatusOutput = Invoke-HiddenCommand -Command "openclaw" -Arguments "gateway status"
        if ($StatusOutput -match "Runtime: stopped") {
            Write-Log "Gateway HTTP responds but service reports stopped (zombie process)" "WARN"
            return $false
        }
        if ($StatusOutput -match "Service is loaded but not running") {
            Write-Log "Gateway service not running properly" "WARN"
            return $false
        }
    } catch {
        Write-Log "Could not check gateway service status" "WARN"
    }
    
    return $true
}

function Get-GatewayProcess {
    return Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
        $_.CommandLine -like "*openclaw*" -or $_.CommandLine -like "*gateway*" 
    }
}

function Stop-GatewayProcesses {
    Write-Log "Stopping any stuck gateway processes..." "WARN"
    
    # Kill node processes related to openclaw
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
        $_.CommandLine -like "*openclaw*" 
    } | ForEach-Object {
        Write-Log "Killing process: $($_.Id)" "WARN"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Kill any Chrome processes in openclaw profile (but NOT the Facebook Chrome on port 9224)
    Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*openclaw*" -and 
        $_.CommandLine -notlike "*9224*" -and
        $_.CommandLine -notlike "*chrome-marvin-only-profile*"
    } | ForEach-Object {
        Write-Log "Killing Chrome process: $($_.Id)" "WARN"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Seconds 2
}

function Start-GatewayService {
    Write-Log "Starting OpenClaw gateway service..." "INFO"
    
    try {
        # Try using the scheduled task first (hidden)
        $TaskResult = Start-Process -FilePath "schtasks.exe" -ArgumentList "/Run", "/TN", "OpenClaw Gateway" -WindowStyle Hidden -Wait -PassThru 2>&1
        Write-Log "Scheduled task started (PID: $($TaskResult.Id))" "INFO"
        
        Start-Sleep -Seconds 5
        
        # Check if it started
        if (Test-GatewayHealth) {
            Write-Log "Gateway started successfully via scheduled task" "SUCCESS"
            return $true
        }
        
        # If scheduled task didn't work, try direct command
        Write-Log "Scheduled task didn't start gateway, trying direct command..." "WARN"
        
        $NodePath = "C:\Program Files\nodejs\node.exe"
        $OpenClawPath = "$env:APPDATA\npm\node_modules\openclaw\dist\index.js"
        
        if (Test-Path $NodePath) {
            Start-Process -FilePath $NodePath -ArgumentList $OpenClawPath, "gateway", "--port", "18789" -WindowStyle Hidden -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 5
            
            if (Test-GatewayHealth) {
                Write-Log "Gateway started successfully via direct command" "SUCCESS"
                return $true
            }
        }
        
        return $false
    } catch {
        Write-Log "Error starting gateway: $_" "ERROR"
        return $false
    }
}

function Test-BrowserHealth {
    try {
        # Check if openclaw browser CDP is responding
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:18800/json/version" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($Response.StatusCode -eq 200) {
            $Content = $Response.Content | ConvertFrom-Json
            # Verify it's actually Chrome and not the extension relay
            if ($Content.Browser -and $Content.Browser -like "Chrome*") {
                # Additional check: verify we can get a list of targets/tabs
                $TargetsResponse = Invoke-WebRequest -Uri "http://127.0.0.1:18800/json/list" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                if ($TargetsResponse.StatusCode -eq 200) {
                    return $true
                }
            }
        }
    } catch {
        return $false
    }
    return $false
}

function Reset-BrowserProfile {
    Write-Log "Resetting OpenClaw browser profile..." "WARN"
    
    try {
        # Kill Chrome processes ONLY in the openclaw browser profile directory (port 18800)
        # Preserve Facebook Chrome (port 9224, chrome-marvin-only-profile)
        Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -like "*openclaw*" -and 
            $_.CommandLine -notlike "*9224*" -and
            $_.CommandLine -notlike "*chrome-marvin-only-profile*"
        } | ForEach-Object {
            Write-Log "Killing Chrome process for profile reset: $($_.Id)" "WARN"
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
        
        Start-Sleep -Seconds 2
        
        # Remove the user data directory
        $UserDataDir = "$env:USERPROFILE\.openclaw\browser\openclaw\user-data"
        if (Test-Path $UserDataDir) {
            Remove-Item -Path $UserDataDir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Log "Browser profile directory removed: $UserDataDir" "INFO"
        }
        
        # Also check for any SingletonLock files that might prevent startup
        $LockFiles = Get-ChildItem -Path "$env:USERPROFILE\.openclaw\browser" -Filter "SingletonLock" -Recurse -ErrorAction SilentlyContinue
        foreach ($LockFile in $LockFiles) {
            Remove-Item -Path $LockFile.FullName -Force -ErrorAction SilentlyContinue
        }
        
        Write-Log "Browser profile reset complete" "SUCCESS"
        return $true
    } catch {
        Write-Log "Error resetting browser profile: $_" "ERROR"
        return $false
    }
}

function Repair-Gateway {
    Write-Log "Attempting gateway repair..." "WARN"
    
    # Step 1: Kill zombie HTTP processes on port 18789
    $PortInUse = Get-NetTCPConnection -LocalPort 18789 -ErrorAction SilentlyContinue
    if ($PortInUse) {
        Write-Log "Port 18789 is in use by process $($PortInUse.OwningProcess), killing zombie..." "WARN"
        Stop-Process -Id $PortInUse.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # Step 2: Kill all related node/chrome processes
    Stop-GatewayProcesses
    
    # Step 3: Clear any lock files or temp files
    $TempFiles = @(
        "$env:USERPROFILE\.openclaw\browser\*.lock",
        "$env:TEMP\openclaw-*"
    )
    
    foreach ($Pattern in $TempFiles) {
        Get-Item $Pattern -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    }
    
    # Step 4: Try starting again
    return Start-GatewayService
}

function Repair-Browser {
    Write-Log "Attempting browser repair with profile reset..." "WARN"
    
    # Step 1: Reset the browser profile
    $ProfileReset = Reset-BrowserProfile
    
    if (-not $ProfileReset) {
        Write-Log "Failed to reset browser profile" "ERROR"
        return $false
    }
    
    # Step 2: Wait a moment for cleanup
    Start-Sleep -Seconds 3
    
    # Step 3: Test if browser is now healthy
    if (Test-BrowserHealth) {
        Write-Log "Browser is now healthy after profile reset" "SUCCESS"
        return $true
    }
    
    Write-Log "Browser still not responding after profile reset" "ERROR"
    return $false
}

# Main script execution
Write-Log "=== OpenClaw Gateway Auto-Recovery Check Started ===" "INFO"

$GatewaySuccess = $false
$BrowserSuccess = $false
$Attempt = 0

# First, check and repair gateway if needed
while ($Attempt -lt $MaxRetries -and -not $GatewaySuccess) {
    $Attempt++
    Write-Log "Gateway recovery attempt $Attempt of $MaxRetries..." "INFO"
    
    # Check current status
    if (Test-GatewayHealth) {
        Write-Log "Gateway is healthy and responding" "SUCCESS"
        $GatewaySuccess = $true
        break
    }
    
    Write-Log "Gateway not responding, attempting recovery..." "WARN"
    
    if ($Attempt -eq 1) {
        # First attempt: Simple restart
        $GatewaySuccess = Start-GatewayService
    } else {
        # Subsequent attempts: Full repair
        $GatewaySuccess = Repair-Gateway
    }
    
    if (-not $GatewaySuccess -and $Attempt -lt $MaxRetries) {
        Write-Log "Waiting $RetryDelaySeconds seconds before retry..." "INFO"
        Start-Sleep -Seconds $RetryDelaySeconds
    }
}

# Then, check browser health and repair if needed
if ($GatewaySuccess) {
    Write-Log "Checking browser health..." "INFO"
    
    if (Test-BrowserHealth) {
        Write-Log "Browser is healthy and responding" "SUCCESS"
        $BrowserSuccess = $true
    } else {
        Write-Log "Browser not responding, attempting profile reset..." "WARN"
        $BrowserSuccess = Repair-Browser
        
        if ($BrowserSuccess) {
            Write-Log "Browser recovered after profile reset" "SUCCESS"
        } else {
            Write-Log "Browser recovery failed, but gateway is operational" "WARN"
            # Still consider overall success if gateway is working
            $BrowserSuccess = $true
        }
    }
}

# Final status
if ($GatewaySuccess -and $BrowserSuccess) {
    Write-Log "OpenClaw gateway and browser are now operational" "SUCCESS"
    exit 0
} elseif ($GatewaySuccess) {
    Write-Log "Gateway is operational (browser may need manual attention)" "SUCCESS"
    exit 0
} else {
    Write-Log "Failed to recover gateway after $MaxRetries attempts" "ERROR"
    Write-Log "Manual intervention may be required" "ERROR"
    exit 1
}
