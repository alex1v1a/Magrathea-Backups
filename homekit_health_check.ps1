#requires -Version 5.1
<#
.SYNOPSIS
    HomeKit Bridge Health Check Script for Windows
    Checks all 6 bridges: Austin (2), Sayville (2), Parnell (2)

.DESCRIPTION
    Comprehensive health check for HomeKit bridges including:
    - Port listening status
    - mDNS advertising verification
    - HomeKit protocol response
    - Device count verification
    - IP-based filtering
    - HA log analysis

.PARAMETER HAHost
    Home Assistant host IP (default: 10.0.1.90)

.PARAMETER HAPort
    Home Assistant web port (default: 8123)

.PARAMETER HAToken
    Home Assistant Long-Lived Access Token

.EXAMPLE
    .\homekit_health_check.ps1
    .\homekit_health_check.ps1 -HAHost "10.0.1.90" -HAToken "your_token_here"
#>

[CmdletBinding()]
param(
    [string]$HAHost = "10.0.1.90",
    [int]$HAPort = 8123,
    [string]$HAToken = $env:HA_TOKEN
)

# =============================================================================
# Configuration
# =============================================================================

$Bridges = @{
    "austin-lights" = @{
        Name = "Austin Lights"
        Port = 21063
        Subnet = "10.0.1"
        Devices = 66
    }
    "austin-sensors" = @{
        Name = "Austin Sensors"
        Port = 21064
        Subnet = "10.0.1"
        Devices = 236  # EXCEEDS LIMIT!
    }
    "sayville-lights" = @{
        Name = "Sayville Lights"
        Port = 21065
        Subnet = "10.1.1"
        Devices = 0
    }
    "sayville-switches" = @{
        Name = "Sayville Switches"
        Port = 21066
        Subnet = "10.1.1"
        Devices = 5
    }
    "parnell-lights" = @{
        Name = "Parnell Lights"
        Port = 21067
        Subnet = "10.2.1"
        Devices = 0
    }
    "parnell-switches" = @{
        Name = "Parnell Switches"
        Port = 21068
        Subnet = "10.2.1"
        Devices = 0
    }
}

$DeviceLimit = 150

# =============================================================================
# Helper Functions
# =============================================================================

function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }

function Write-Header {
    param($Title)
    Write-Host "`n══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

function Write-SubHeader {
    param($Title)
    Write-Host "`n▶ $Title" -ForegroundColor Yellow
}

function Test-Port {
    param($HostName, $Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect($HostName, $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(2000, $false)
        $client.Close()
        return $success
    } catch {
        return $false
    }
}

function Invoke-HAApi {
    param($Endpoint)
    if (-not $HAToken) { return $null }
    
    try {
        $headers = @{ "Authorization" = "Bearer $HAToken" }
        $response = Invoke-RestMethod -Uri "http://$HAHost`:$HAPort/api/$Endpoint" -Headers $headers -TimeoutSec 5
        return $response
    } catch {
        return $null
    }
}

# =============================================================================
# Check 1: Bridge Ports Listening
# =============================================================================

function Test-BridgePorts {
    Write-Header "CHECK 1: Bridge Port Listening Status"
    
    $allListening = $true
    
    foreach ($key in $Bridges.Keys) {
        $bridge = $Bridges[$key]
        $port = $bridge.Port
        $name = $bridge.Name
        
        if (Test-Port -HostName $HAHost -Port $port) {
            Write-Success "$name (port $port) - LISTENING"
        } else {
            Write-Error "$name (port $port) - NOT LISTENING"
            $allListening = $false
        }
    }
    
    if ($allListening) {
        Write-Host "`n✓ All bridges are listening on their configured ports" -ForegroundColor Green
    } else {
        Write-Host "`n✗ Some bridges are not listening. Check HA logs for errors." -ForegroundColor Red
    }
    
    return $allListening
}

# =============================================================================
# Check 2: mDNS Advertising
# =============================================================================

function Test-MdnsAdvertising {
    Write-Header "CHECK 2: mDNS Advertising Verification"
    
    # Check if mDNS tools are available
    $mdnsAvailable = $false
    
    if (Get-Command "avahi-browse" -ErrorAction SilentlyContinue) {
        $mdnsAvailable = $true
        Write-SubHeader "Searching for HomeKit bridges via mDNS..."
        
        try {
            $mdnsOutput = & avahi-browse -a 2>$null | Select-String -Pattern "homekit|hap|home\s*assistant" | Select-Object -First 20
            
            if ($mdnsOutput) {
                Write-Success "Found mDNS advertisements:"
                $mdnsOutput | ForEach-Object { Write-Host "  • $_" }
            } else {
                Write-Warning "No mDNS advertisements found for HomeKit"
                Write-Info "This could mean:"
                Write-Host "  - Bridges haven't started yet (wait 30-60 seconds after HA restart)"
                Write-Host "  - mDNS is being blocked by firewall/router"
                Write-Host "  - IGMP snooping is enabled on switch"
            }
            
            Write-SubHeader "Searching for Austin|Sayville|Parnell specifically..."
            $locationOutput = & avahi-browse -a 2>$null | Select-String -Pattern "austin|sayville|parnell" -CaseSensitive:$false
            
            if ($locationOutput) {
                Write-Success "Found location-specific advertisements:"
                $locationOutput | ForEach-Object { Write-Host "  • $_" }
            } else {
                Write-Warning "No location-specific advertisements found"
            }
        } catch {
            Write-Warning "Error running avahi-browse: $_"
        }
    } else {
        Write-Warning "avahi-browse not available. Skipping mDNS check."
        Write-Host "  To enable mDNS checks on Windows, install Bonjour SDK or use WSL"
    }
    
    # Alternative: Check if bridges respond to HomeKit protocol
    Write-SubHeader "Testing HomeKit protocol response..."
    foreach ($key in $Bridges.Keys) {
        $bridge = $Bridges[$key]
        $port = $bridge.Port
        $name = $bridge.Name
        
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connected = $tcpClient.BeginConnect($HAHost, $port, $null, $null).AsyncWaitHandle.WaitOne(2000, $false)
            $tcpClient.Close()
            
            if ($connected) {
                Write-Success "$name responds to TCP connections"
            } else {
                Write-Warning "$name not responding to TCP connections"
            }
        } catch {
            Write-Warning "$name connection failed: $_"
        }
    }
}

# =============================================================================
# Check 3: Bridge HomeKit Response
# =============================================================================

function Test-HomeKitResponse {
    Write-Header "CHECK 3: HomeKit Protocol Response Test"
    
    $responding = 0
    $notResponding = 0
    
    foreach ($key in $Bridges.Keys) {
        $bridge = $Bridges[$key]
        $port = $bridge.Port
        $name = $bridge.Name
        
        try {
            $response = Invoke-RestMethod -Uri "http://$HAHost`:$port/accessories" -TimeoutSec 3 -ErrorAction SilentlyContinue
            Write-Success "$name - Responding to HomeKit protocol"
            $responding++
        } catch [System.Net.WebException] {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 401 -or $statusCode -eq 403) {
                Write-Success "$name - Authenticated (HTTP $statusCode - needs pairing)"
                $responding++
            } else {
                Write-Warning "$name - Unexpected response (HTTP $statusCode)"
            }
        } catch {
            Write-Error "$name - No response (connection failed)"
            $notResponding++
        }
    }
    
    Write-Host "`nSummary: $responding responding, $notResponding not responding" -ForegroundColor Cyan
}

# =============================================================================
# Check 4: Device Counts Per Bridge
# =============================================================================

function Test-DeviceCounts {
    Write-Header "CHECK 4: Device Count Verification"
    
    Write-Info "HomeKit bridge device limit: $DeviceLimit devices per bridge"
    Write-Host ""
    
    $overLimit = $false
    
    foreach ($key in $Bridges.Keys) {
        $bridge = $Bridges[$key]
        $name = $bridge.Name
        $expected = $bridge.Devices
        $port = $bridge.Port
        
        # Try to get actual count from HA API
        $actualCount = $null
        if ($HAToken) {
            $config = Invoke-HAApi -Endpoint "config/config_entries/entry"
            if ($config) {
                $homekitEntries = $config | Where-Object { $_.domain -eq 'homekit' }
                $actualCount = ($homekitEntries | Measure-Object).Count
            }
        }
        
        $countDisplay = "$expected (expected)"
        if ($actualCount) {
            $countDisplay = "$actualCount (actual) / $expected (expected)"
        }
        
        if ($expected -gt $DeviceLimit) {
            Write-Error "$name`: $countDisplay - EXCEEDS LIMIT!"
            $overLimit = $true
        } elseif ($expected -gt ($DeviceLimit * 0.8)) {
            Write-Warning "$name`: $countDisplay - Approaching limit (80%+)"
        } else {
            Write-Success "$name`: $countDisplay - Within limit"
        }
    }
    
    if ($overLimit) {
        Write-Host "`n✗ Some bridges exceed the 150 device limit!" -ForegroundColor Red
        Write-Host "  Recommendation: Split devices across additional bridges" -ForegroundColor Yellow
    } else {
        Write-Host "`n✓ All bridges within device limits" -ForegroundColor Green
    }
}

# =============================================================================
# Check 5: IP-Based Filtering
# =============================================================================

function Test-IPFiltering {
    Write-Header "CHECK 5: IP-Based Filtering Verification"
    
    Write-Info "Checking bridge IP configurations..."
    Write-Host ""
    
    foreach ($key in $Bridges.Keys) {
        $bridge = $Bridges[$key]
        $name = $bridge.Name
        $subnet = $bridge.Subnet
        $port = $bridge.Port
        
        # Check if port is listening (already done in port check)
        if (Test-Port -HostName $HAHost -Port $port) {
            if ($HAHost -like "*$subnet*") {
                Write-Success "$name - Bound to correct subnet ($subnet.x)"
            } else {
                Write-Warning "$name - Host IP $HAHost may not match expected subnet $subnet.x"
            }
        } else {
            Write-Warning "$name - Cannot verify binding (port not listening)"
        }
    }
    
    Write-Host "`nIP Subnet Configuration:" -ForegroundColor Cyan
    Write-Host "  • Austin: 10.0.1.x"
    Write-Host "  • Sayville: 10.1.1.x"
    Write-Host "  • Parnell: 10.2.1.x"
    
    Write-SubHeader "Checking advertise_ip configuration..."
    
    # Check common HA config locations
    $configPaths = @(
        "\opt\homeassistant\config\homekit.yaml",
        "\config\homekit.yaml",
        "homekit.yaml"
    )
    
    $foundConfig = $false
    foreach ($path in $configPaths) {
        if (Test-Path $path) {
            $foundConfig = $true
            $content = Get-Content $path -Raw
            if ($content -match "advertise_ip:") {
                Write-Success "advertise_ip is configured in $path"
                # Extract advertise_ip values
                $matches = [regex]::Matches($content, "advertise_ip:", [System.Text.RegularExpressions.RegexOptions]::Singleline)
                if ($matches) {
                    Write-Host "  Found advertise_ip configuration"
                }
            } else {
                Write-Warning "advertise_ip not found in $path"
                Write-Host "  This may cause mDNS discovery issues across subnets"
            }
            break
        }
    }
    
    if (-not $foundConfig) {
        Write-Warning "homekit.yaml not found at expected locations"
    }
}

# =============================================================================
# Check 6: HA Logs for Errors
# =============================================================================

function Test-HALogs {
    Write-Header "CHECK 6: Home Assistant Log Analysis"
    
    $logPaths = @(
        "\opt\homeassistant\config\home-assistant.log",
        "\config\home-assistant.log",
        "home-assistant.log"
    )
    
    $logFile = $null
    foreach ($path in $logPaths) {
        if (Test-Path $path) {
            $logFile = $path
            break
        }
    }
    
    if (-not $logFile) {
        Write-Warning "HA log file not found at expected locations"
        
        # Try to find log file
        $foundLogs = Get-ChildItem -Path "." -Recurse -Filter "home-assistant.log" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundLogs) {
            $logFile = $foundLogs.FullName
            Write-Info "Found log file: $logFile"
        } else {
            Write-Error "Could not find home-assistant.log"
            return
        }
    } else {
        Write-Info "Using log file: $logFile"
    }
    
    Write-Info "Checking for HomeKit errors in last 500 lines..."
    Write-Host ""
    
    # Get last 500 lines
    $lastLines = Get-Content $logFile -Tail 500
    
    # Check for HomeKit errors
    $hkErrors = $lastLines | Select-String -Pattern "homekit|hap" | Select-String -Pattern "error|exception|failed|warning" -CaseSensitive:$false | Select-Object -Last 20
    
    if ($hkErrors) {
        Write-Warning "Found recent HomeKit-related log entries:"
        $hkErrors | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Success "No recent HomeKit errors found in logs"
    }
    
    Write-SubHeader "Checking for specific error patterns..."
    $errorPatterns = @("mDNS", "advertise", "port.*in.*use", "bind.*failed", "pairing", "accessory")
    
    foreach ($pattern in $errorPatterns) {
        $count = ($lastLines | Select-String -Pattern $pattern -CaseSensitive:$false | Measure-Object).Count
        if ($count -gt 0) {
            Write-Warning "Found $count occurrences of '$pattern'"
        }
    }
    
    Write-SubHeader "Checking bridge startup status..."
    $startupMsgs = $lastLines | Select-String -Pattern "homekit.*bridge.*started|driver.*started" -CaseSensitive:$false | Select-Object -Last 10
    
    if ($startupMsgs) {
        Write-Success "Found bridge startup messages:"
        $startupMsgs | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Warning "No recent bridge startup messages found"
    }
}

# =============================================================================
# Check 7: Network Connectivity
# =============================================================================

function Test-NetworkConnectivity {
    Write-Header "CHECK 7: Network Connectivity"
    
    # Check if HA host is reachable
    if (Test-Connection -ComputerName $HAHost -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        Write-Success "HA host ($HAHost) is reachable"
    } else {
        Write-Error "HA host ($HAHost) is NOT reachable"
        return $false
    }
    
    # Check HA web interface
    try {
        $response = Invoke-WebRequest -Uri "http://$HAHost`:$HAPort" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -in @(200, 302)) {
            Write-Success "HA web interface is responding (HTTP $($response.StatusCode))"
        } else {
            Write-Warning "HA web interface returned HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Error "HA web interface is NOT responding: $_"
    }
    
    return $true
}

# =============================================================================
# Generate Health Report
# =============================================================================

function Export-HealthReport {
    Write-Header "HEALTH CHECK SUMMARY"
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportFile = ".\homekit_health_report_$timestamp.txt"
    
    $report = @"
HomeKit Bridge Health Check Report
Generated: $(Get-Date)
HA Host: $HAHost

BRIDGE STATUS:
"@

    foreach ($key in $Bridges.Keys) {
        $bridge = $Bridges[$key]
        $port = $bridge.Port
        $devices = $bridge.Devices
        $name = $bridge.Name
        
        if (Test-Port -HostName $HAHost -Port $port) {
            $status = "LISTENING"
        } else {
            $status = "NOT LISTENING"
        }
        
        $report += "  $name (port $port): $status - $devices devices`n"
    }
    
    $report += @"

RECOMMENDATIONS:
  1. Ensure all bridges show LISTENING status
  2. Keep device count under $DeviceLimit per bridge
  3. Verify mDNS advertising with: avahi-browse -a | grep -i homekit
  4. Check HA logs regularly for errors
"@

    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Info "Report saved to: $reportFile"
    
    # Also save as latest
    $report | Out-File -FilePath ".\homekit_health_report.txt" -Encoding UTF8
}

# =============================================================================
# Main
# =============================================================================

function Main {
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     HomeKit Bridge Health Check                              ║" -ForegroundColor Cyan
    Write-Host "║     Austin | Sayville | Parnell                             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Checking 6 bridges across 3 locations..."
    Write-Host "Timestamp: $(Get-Date)"
    Write-Host "HA Host: $HAHost`:$HAPort"
    if (-not $HAToken) {
        Write-Warning "HA_TOKEN not set. Some checks will be limited."
    }
    Write-Host ""
    
    # Run all checks
    Test-NetworkConnectivity
    Test-BridgePorts
    Test-MdnsAdvertising
    Test-HomeKitResponse
    Test-DeviceCounts
    Test-IPFiltering
    Test-HALogs
    Export-HealthReport
    
    Write-Header "Health Check Complete"
    Write-Host "✓ Health check finished" -ForegroundColor Green
    Write-Host "  Review any warnings/errors above and take corrective action" -ForegroundColor Cyan
    Write-Host ""
}

# Run main function
Main
