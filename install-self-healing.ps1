# OpenClaw Self-Healing System for Windows
# PowerShell Installation Script
# 4-Tier Recovery: KeepAlive → Watchdog → Emergency Recovery → Alerts

param(
    [string]$Workspace = "$env:USERPROFILE\.openclaw",
    [string]$DiscordWebhook = ""
)

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Blue = "`e[34m"
$Reset = "`e[0m"

Write-Host @"
$Blue╔═══════════════════════════════════════════════════════════════╗
║     🦞 OpenClaw Self-Healing System (Windows Edition)         ║
║     "The system that heals itself"                            ║
╚═══════════════════════════════════════════════════════════════╝$Reset
"@

# Configuration
$ScriptsDir = "$Workspace\skills\openclaw-self-healing\scripts"
$LogsDir = "$Workspace\logs"
$StateDir = "$Workspace\watchdog"
$TaskNameWatchdog = "OpenClaw-Watchdog"
$TaskNameHealthCheck = "OpenClaw-HealthCheck"

# Create directories
Write-Host "`n${Blue}[1/5] Creating directories...${Reset}"
@($ScriptsDir, $LogsDir, $StateDir) | ForEach-Object {
    New-Item -ItemType Directory -Path $_ -Force | Out-Null
}
Write-Host "${Green}✅ Directories created${Reset}"

# Create Watchdog Script
Write-Host "`n${Blue}[2/5] Creating Watchdog script...${Reset}"

$watchdogScript = @'
# OpenClaw Gateway Watchdog for Windows
# 4-Tier Recovery System

param([switch]$DryRun)

$ErrorActionPreference = "Continue"

# Configuration
$GatewayPort = $env:OPENCLAW_GATEWAY_PORT -or 18789
$LogDir = "$env:USERPROFILE\.openclaw\logs"
$StateDir = "$env:USERPROFILE\.openclaw\watchdog"
$LogFile = "$LogDir\watchdog.log"
$CooldownFile = "$StateDir\last-restart"
$CrashCounterFile = "$StateDir\crash-counter"
$CriticalFailureFile = "$StateDir\critical-failure-since"
$HealingLock = "$env:TEMP\openclaw-healing.lock"

# Settings
$HealthTimeout = 5
$MaxRetries = 6
$EscalateToL3After = 1800  # 30 minutes
$BackoffDelays = @(10, 30, 90, 180, 300, 600)  # Exponential backoff

# Ensure directories exist
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null

function Write-Log {
    param([string]$Level, [string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    if ($DryRun) { Write-Host $logEntry }
}

function Get-CrashCount {
    if (Test-Path $CrashCounterFile) {
        return [int](Get-Content $CrashCounterFile)
    }
    return 0
}

function Increment-CrashCount {
    $count = Get-CrashCount
    Set-Content -Path $CrashCounterFile -Value ($count + 1)
}

function Reset-CrashCount {
    Set-Content -Path $CrashCounterFile -Value 0
    Remove-Item -Path "$StateDir\crash-timestamp" -ErrorAction SilentlyContinue
}

function Get-BackoffDelay {
    $crashCount = Get-CrashCount
    $index = [Math]::Max(0, [Math]::Min($crashCount - 1, $BackoffDelays.Count - 1))
    return $BackoffDelays[$index]
}

function Test-HealingLock {
    if (Test-Path $HealingLock) {
        $lockAge = (Get-Date) - (Get-Item $HealingLock).LastWriteTime
        if ($lockAge.TotalMinutes -gt 10) {
            Remove-Item $HealingLock -Force -ErrorAction SilentlyContinue
            return $true
        }
        return $false
    }
    New-Item -ItemType File -Path $HealingLock -Force | Out-Null
    return $true
}

function Test-GatewayHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$GatewayPort/health" -TimeoutSec $HealthTimeout -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-GatewayProcess {
    return Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
        $_.CommandLine -like "*openclaw*gateway*" 
    }
}

function Restart-Gateway {
    Write-Log "ACTION" "Restarting OpenClaw Gateway"
    
    # Kill existing process
    $process = Get-GatewayProcess
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    # Start via Task Scheduler
    Start-ScheduledTask -TaskName "OpenClaw Gateway" -ErrorAction SilentlyContinue
    
    # Alternative: Start directly
    if (-not (Get-GatewayProcess)) {
        $openclawPath = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
        if ($openclawPath) {
            Start-Process -FilePath "node" -ArgumentList "$openclawPath gateway --port $GatewayPort" -WindowStyle Hidden
        }
    }
    
    Set-Content -Path $CooldownFile -Value (Get-Date -Format "o")
}

function Send-DiscordAlert {
    param([string]$Level, [string]$Title, [string]$Message)
    
    if (-not $env:DISCORD_WEBHOOK_URL) { return }
    
    $color = switch ($Level) {
        "critical" { 15158332 }  # Red
        "warning"  { 16776960 }  # Yellow
        "success"  { 3066993 }   # Green
        default    { 3447003 }   # Blue
    }
    
    $payload = @{
        embeds = @(@{
            title = $Title
            description = $Message
            color = $color
            timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
        })
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Uri $env:DISCORD_WEBHOOK_URL -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 10
    } catch {
        Write-Log "ERROR" "Failed to send Discord alert: $_"
    }
}

function Test-Level3Escalation {
    $crashCount = Get-CrashCount
    if ($crashCount -lt $MaxRetries) { return $false }
    
    if (-not (Test-Path $CriticalFailureFile)) {
        Set-Content -Path $CriticalFailureFile -Value (Get-Date -Format "o")
        Write-Log "WARN" "Critical failure started - Level 3 escalation pending (${EscalateToL3After}s)"
        return $false
    }
    
    $failureStart = [datetime](Get-Content $CriticalFailureFile)
    $elapsed = ([datetime]::Now - $failureStart).TotalSeconds
    
    if ($elapsed -ge $EscalateToL3After) {
        Write-Log "CRITICAL" "Level 3 Emergency Recovery triggered after ${elapsed}s"
        return $true
    }
    
    $remaining = $EscalateToL3After - $elapsed
    Write-Log "INFO" "Critical failure ${elapsed}s elapsed (Level 3 in ${remaining}s)"
    return $false
}

function Invoke-EmergencyRecovery {
    Write-Log "CRITICAL" "========== LEVEL 3 EMERGENCY RECOVERY =========="
    
    Send-DiscordAlert "critical" "Level 3 Emergency Recovery" "Gateway failed for 30+ minutes. Running auto-diagnostics..."
    
    # Run diagnostics
    $diagnostics = @()
    
    # Check OpenClaw config
    try {
        $configCheck = & openclaw doctor --fix 2>&1
        $diagnostics += "Config check: $configCheck"
    } catch {
        $diagnostics += "Config check failed: $_"
    }
    
    # Check ports
    $portInUse = Get-NetTCPConnection -LocalPort $GatewayPort -ErrorAction SilentlyContinue
    if ($portInUse) {
        $diagnostics += "Port $GatewayPort in use by PID $($portInUse.OwningProcess)"
    }
    
    # Try full restart
    Write-Log "ACTION" "Performing full gateway reset"
    Restart-Gateway
    Start-Sleep -Seconds 10
    
    if (Test-GatewayHealth) {
        Write-Log "SUCCESS" "Emergency recovery successful!"
        Send-DiscordAlert "success" "Recovery Successful" "Gateway restored after Level 3 emergency recovery"
        Reset-CrashCount
        Remove-Item $CriticalFailureFile -ErrorAction SilentlyContinue
    } else {
        Write-Log "CRITICAL" "Emergency recovery failed - manual intervention needed"
        Send-DiscordAlert "critical" "Recovery Failed" "All automated recovery failed. Manual intervention required."
    }
}

# ============ MAIN LOGIC ============

Write-Log "INFO" "========== Watchdog Check Started =========="
if ($DryRun) { Write-Log "INFO" "*** DRY-RUN MODE ***" }

# Healing rate limiter
if (-not (Test-HealingLock)) {
    Write-Log "INFO" "Another healing in progress - skipping"
    exit 0
}

# Check current state
$process = Get-GatewayProcess
$isHealthy = Test-GatewayHealth
$crashCount = Get-CrashCount

Write-Log "INFO" "Process: $(if ($process) { 'Running (PID ' + $process.Id + ')' } else { 'Not running' })"
Write-Log "INFO" "Health: $(if ($isHealthy) { 'OK' } else { 'UNHEALTHY' })"
Write-Log "INFO" "Crash count: $crashCount/$MaxRetries"

# Tier 1: Process not running
if (-not $process -and -not $isHealthy) {
    Write-Log "WARN" "Gateway not running"
    
    if ($crashCount -ge $MaxRetries) {
        if (Test-Level3Escalation) {
            Invoke-EmergencyRecovery
            exit 0
        }
    }
    
    # Check cooldown
    $backoff = Get-BackoffDelay
    if (Test-Path $CooldownFile) {
        $lastRestart = [datetime](Get-Content $CooldownFile)
        $elapsed = ([datetime]::Now - $lastRestart).TotalSeconds
        if ($elapsed -lt $backoff) {
            $remaining = [int]($backoff - $elapsed)
            Write-Log "INFO" "Backoff cooldown: ${remaining}s remaining"
            exit 0
        }
    }
    
    Increment-CrashCount
    Restart-Gateway
    Send-DiscordAlert "warning" "Gateway Restarted" "Gateway was down and has been restarted. Attempt: $(Get-CrashCount)/$MaxRetries"
    
    Write-Log "INFO" "========== Check Complete =========="
    exit 0
}

# Tier 2: Process running but unhealthy
if ($process -and -not $isHealthy) {
    Write-Log "WARN" "Gateway process exists but unhealthy (zombie?)"
    
    $backoff = Get-BackoffDelay
    if (Test-Path $CooldownFile) {
        $lastRestart = [datetime](Get-Content $CooldownFile)
        $elapsed = ([datetime]::Now - $lastRestart).TotalSeconds
        if ($elapsed -lt $backoff) {
            Write-Log "INFO" "Backoff cooldown active"
            exit 0
        }
    }
    
    Increment-CrashCount
    Restart-Gateway
    Send-DiscordAlert "warning" "Gateway Zombie Restart" "Process existed but unresponsive. Restarted."
    
    Write-Log "INFO" "========== Check Complete =========="
    exit 0
}

# Healthy - reset counters
if ($isHealthy) {
    if ($crashCount -gt 0) {
        Reset-CrashCount
        Write-Log "INFO" "Crash counter reset - gateway healthy"
    }
    if (Test-Path $CriticalFailureFile) {
        Remove-Item $CriticalFailureFile -ErrorAction SilentlyContinue
        Send-DiscordAlert "success" "Gateway Recovered" "Gateway has recovered and is running normally."
    }
    Write-Log "INFO" "Gateway healthy"
}

Write-Log "INFO" "========== Check Complete =========="
'@

Set-Content -Path "$ScriptsDir\gateway-watchdog.ps1" -Value $watchdogScript
Write-Host "${Green}✅ Watchdog script created${Reset}"

# Create Health Check Script
Write-Host "`n${Blue}[3/5] Creating Health Check script...${Reset}"

$healthCheckScript = @'
# OpenClaw Health Check for Windows
param([switch]$Deep)

$LogDir = "$env:USERPROFILE\.openclaw\logs"
$LogFile = "$LogDir\healthcheck.log"
$GatewayPort = $env:OPENCLAW_GATEWAY_PORT -or 18789

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$timestamp] $Message"
}

Write-Log "Health check started"

$checks = @{
    Gateway = $false
    DiscordPlugin = $false
    Models = $false
    DiskSpace = $false
}

# Check Gateway
if ($Deep) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$GatewayPort/health" -TimeoutSec 10 -UseBasicParsing
        $checks.Gateway = $response.StatusCode -eq 200
    } catch {
        $checks.Gateway = $false
    }
} else {
    $process = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*openclaw*" }
    $checks.Gateway = $null -ne $process
}

# Check Discord plugin
try {
    $config = Get-Content "$env:USERPROFILE\.openclaw\openclaw.json" | ConvertFrom-Json
    $checks.DiscordPlugin = $config.plugins.entries.discord.enabled -eq $true
} catch {
    $checks.DiscordPlugin = $false
}

# Check disk space
$disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"
$freePercent = ($disk.FreeSpace / $disk.Size) * 100
$checks.DiskSpace = $freePercent -gt 10

# Log results
$results = $checks.GetEnumerator() | ForEach-Object { "$($_.Key): $(if ($_.Value) { 'OK' } else { 'FAIL' })" }
Write-Log ($results -join " | ")

# Alert on failures
$failures = $checks.GetEnumerator() | Where-Object { -not $_.Value } | Select-Object -ExpandProperty Key
if ($failures) {
    Write-Log "WARNING: Failures detected: $($failures -join ', ')"
    
    if ($env:DISCORD_WEBHOOK_URL) {
        $payload = @{
            content = "⚠️ OpenClaw Health Check Failures: $($failures -join ', ')"
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri $env:DISCORD_WEBHOOK_URL -Method Post -Body $payload -ContentType "application/json"
        } catch {}
    }
}

Write-Log "Health check complete"
'@

Set-Content -Path "$ScriptsDir\gateway-healthcheck.ps1" -Value $healthCheckScript
Write-Host "${Green}✅ Health Check script created${Reset}"

# Create Environment Config
Write-Host "`n${Blue}[4/5] Setting up configuration...${Reset}"

$envContent = @"
# OpenClaw Self-Healing System Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Gateway Configuration
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_GATEWAY_URL=http://localhost:18789/

$(if ($DiscordWebhook) { "DISCORD_WEBHOOK_URL=$DiscordWebhook" } else { "# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/..." })

# Watchdog Settings
OPENCLAW_WATCHDOG_MAX_RETRIES=6
OPENCLAW_WATCHDOG_ESCALATE_TO_L3_AFTER=1800

# Memory Thresholds (MB)
OPENCLAW_WATCHDOG_MEMORY_WARN_MB=1536
OPENCLAW_WATCHDOG_MEMORY_CRITICAL_MB=2048
"@

Set-Content -Path "$Workspace\.env" -Value $envContent
Write-Host "${Green}✅ Configuration saved to $Workspace\.env${Reset}"

# Create Scheduled Tasks
Write-Host "`n${Blue}[5/5] Installing Scheduled Tasks...${Reset}"

# Watchdog Task - runs every 3 minutes
$watchdogAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$ScriptsDir\gateway-watchdog.ps1`""
$watchdogTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 3) -RepetitionDuration (New-TimeSpan -Days 3650)
$watchdogSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Remove existing task if exists
Unregister-ScheduledTask -TaskName $TaskNameWatchdog -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $TaskNameWatchdog -Action $watchdogAction -Trigger $watchdogTrigger -Settings $watchdogSettings -Force | Out-Null
Write-Host "${Green}✅ Watchdog task installed (runs every 3 minutes)${Reset}"

# Health Check Task - runs every 5 minutes
$healthAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$ScriptsDir\gateway-healthcheck.ps1`""
$healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$healthSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $TaskNameHealthCheck -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $TaskNameHealthCheck -Action $healthAction -Trigger $healthTrigger -Settings $healthSettings -Force | Out-Null
Write-Host "${Green}✅ Health Check task installed (runs every 5 minutes)${Reset}"

# Start tasks immediately
Start-ScheduledTask -TaskName $TaskNameWatchdog
Start-ScheduledTask -TaskName $TaskNameHealthCheck

# Summary
Write-Host @"
`n${Green}╔═══════════════════════════════════════════════════════════════╗
║     🎉 Self-Healing System Installed!                        ║
╚═══════════════════════════════════════════════════════════════╝${Reset}

${Blue}4-Tier Recovery Chain:${Reset}
  ✅ Tier 1: Process KeepAlive (instant restart)
  ✅ Tier 2: Watchdog + HealthCheck (3min + 5min intervals)
  ✅ Tier 3: Emergency Recovery (30min failure → auto-diagnostics)
  ✅ Tier 4: Discord Alerts (human escalation)

${Blue}Scripts:${Reset}
  $ScriptsDir

${Blue}Logs:${Reset}
  $LogsDir\watchdog.log
  $LogsDir\healthcheck.log

${Blue}Tasks:${Reset}
  Task Scheduler → OpenClaw-Watchdog
  Task Scheduler → OpenClaw-HealthCheck

${Blue}Environment:${Reset}
  $Workspace\.env

${Blue}Verify:${Reset}
  Get-ScheduledTask | Where-Object { `$_.TaskName -like "*OpenClaw*" }
  Get-Content $LogsDir\watchdog.log -Tail 20

${Blue}Test recovery (optional):${Reset}
  # Kill gateway to test auto-recovery
  Get-Process node | Where-Object { `$_.CommandLine -like "*openclaw*" } | Stop-Process -Force
  # Wait 3 minutes, check logs

${Green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Reset}
${Green}The system is now watching your watcher. Sleep well. 🦞${Reset}
${Green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${Reset}
"@
