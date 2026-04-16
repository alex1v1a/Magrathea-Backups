# Home Assistant Proxy Monitor Script
# This script monitors the Windows portproxy configuration for Home Assistant
# and alerts if the configuration changes or the backend becomes unreachable

param(
    [string]$ListenPort = "8124",
    [string]$ExpectedDestinationIP = "10.0.1.90",
    [string]$ExpectedDestinationPort = "8123",
    [string]$TestUrl = "http://localhost:8124/api/",
    [int]$TimeoutSeconds = 10
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Output $logEntry
}

function Get-ProxyConfig {
    $output = netsh interface portproxy show all
    return $output
}

function Test-ProxyHealth {
    param([string]$Url, [int]$Timeout)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout -ErrorAction Stop
        return @{ Success = $true; StatusCode = $response.StatusCode }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Main monitoring logic
Write-Log "Starting Home Assistant proxy monitor..."

# Check current proxy configuration
$config = Get-ProxyConfig
$lines = $config -split "`n"

$found8124 = $false
$found8123 = $false
$proxy8124Correct = $false
$proxy8123Correct = $false

foreach ($line in $lines) {
    if ($line -match "0\.0\.0\.0\s+8124\s+10\.0\.1\.90\s+8123") {
        $found8124 = $true
        $proxy8124Correct = $true
    }
    elseif ($line -match "0\.0\.0\.0\s+8123\s+10\.0\.1\.90\s+8123") {
        $found8123 = $true
        $proxy8123Correct = $true
    }
}

if ($found8124 -and $proxy8124Correct) {
    Write-Log "Port 8124 proxy is correctly configured (0.0.0.0:8124 -> 10.0.1.90:8123)"
} elseif ($found8124) {
    Write-Log "WARNING: Port 8124 proxy exists but has incorrect configuration!" "WARN"
} else {
    Write-Log "WARNING: Port 8124 proxy is missing!" "WARN"
}

if ($found8123 -and $proxy8123Correct) {
    Write-Log "Port 8123 proxy is configured (0.0.0.0:8123 -> 10.0.1.90:8123)"
} elseif ($found8123) {
    Write-Log "WARNING: Port 8123 proxy exists but has incorrect configuration!" "WARN"
} else {
    Write-Log "INFO: Port 8123 proxy is not configured"
}

# Test connectivity through proxy
Write-Log "Testing proxy connectivity to $TestUrl..."
$health = Test-ProxyHealth -Url $TestUrl -Timeout $TimeoutSeconds

if ($health.Success) {
    Write-Log "Proxy is healthy - Status Code: $($health.StatusCode)"
} else {
    Write-Log "Proxy connectivity issue detected: $($health.Error)" "ERROR"
    
    # Check if destination is reachable directly
    Write-Log "Testing direct connection to $ExpectedDestinationIP on port $ExpectedDestinationPort..."
    $directTest = Test-NetConnection -ComputerName $ExpectedDestinationIP -Port $ExpectedDestinationPort -WarningAction SilentlyContinue
    
    if (-not $directTest.TcpTestSucceeded) {
        Write-Log "CRITICAL: Home Assistant backend at $ExpectedDestinationIP`:$ExpectedDestinationPort is not reachable!" "ERROR"
        Write-Log "The destination service may be down or not running." "ERROR"
    } else {
        Write-Log "Backend is reachable directly but proxy test failed - possible configuration issue" "WARN"
    }
}

Write-Log "Monitor check complete."
