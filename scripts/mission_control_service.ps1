# Vectarr Mission Control - Windows Service Manager
# Production-hardened service wrapper with auto-restart and logging

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("install", "start", "stop", "restart", "status", "remove", "logs")]
    [string]$Action = "status"
)

$ServiceName = "VectarrMissionControl"
$LogDir = "C:\Users\admin\.openclaw\workspace\logs\mission-control"
$MissionControlDir = "C:\Users\admin\.openclaw\workspace\mission-control"
$ServerScript = "$MissionControlDir\server.ps1"
$NSSMPath = "nssm.exe"
$PowerShellPath = (Get-Command powershell.exe).Source

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogFile = "$LogDir\service\service_$(Get-Date -Format 'yyyyMMdd').log"
    if (!(Test-Path "$LogDir\service")) { New-Item -ItemType Directory -Path "$LogDir\service" -Force | Out-Null }
    "[$Timestamp] [$Level] $Message" | Add-Content -Path $LogFile
    Write-Host "[$Timestamp] [$Level] $Message"
}

function Initialize-Logging {
    if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
    @("service", "api", "error", "health") | ForEach-Object {
        $SubDir = "$LogDir\$_"
        if (!(Test-Path $SubDir)) { New-Item -ItemType Directory -Path $SubDir -Force | Out-Null }
    }
}

function Test-NSSM {
    try {
        & $NSSMPath version 2>&1 | Out-Null
        return $true
    } catch {
        Write-Log "NSSM not found. Install with: choco install nssm" "ERROR"
        return $false
    }
}

function Install-Service {
    Write-Host "Installing Mission Control Windows Service..." -ForegroundColor Cyan
    
    if (!(Test-NSSM)) { return }
    
    $ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($ExistingService) {
        Write-Log "Service already exists. Use -Action remove first." "WARN"
        return
    }
    
    if (!(Test-Path $ServerScript)) {
        Write-Log "Server script not found: $ServerScript" "ERROR"
        return
    }
    
    Initialize-Logging
    
    # Use simplified service runner
    $ServiceRunner = "$PSScriptRoot\service_runner_simple.ps1"
    
    & $NSSMPath install $ServiceName $PowerShellPath "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$ServiceRunner`"" 2>&1 | Out-Null
    & $NSSMPath set $ServiceName DisplayName "Vectarr Mission Control" 2>&1 | Out-Null
    & $NSSMPath set $ServiceName Description "Vectarr Mission Control Dashboard Server" 2>&1 | Out-Null
    & $NSSMPath set $ServiceName Start SERVICE_AUTO_START 2>&1 | Out-Null
    & $NSSMPath set $ServiceName AppExit Default Restart 2>&1 | Out-Null
    & $NSSMPath set $ServiceName AppRestartDelay 5000 2>&1 | Out-Null
    
    Write-Log "Service installed successfully" "SUCCESS"
    Write-Host "Service installed. To start: .\mission_control_service.ps1 -Action start" -ForegroundColor Green
}

function Start-MCService {
    Write-Host "Starting Mission Control Service..." -ForegroundColor Cyan
    
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (!$Service) {
        Write-Log "Service not found. Install first with -Action install" "ERROR"
        return
    }
    
    try {
        Microsoft.PowerShell.Management\Start-Service -Name $ServiceName
        Start-Sleep -Seconds 3
        $Service.Refresh()
        
        if ($Service.Status -eq "Running") {
            Write-Log "Service started successfully" "SUCCESS"
            Write-Host "Mission Control is running!" -ForegroundColor Green
            Write-Host "  URL: http://localhost:8080/" -ForegroundColor Cyan
        } else {
            Write-Log "Service failed to start. Status: $($Service.Status)" "ERROR"
        }
    } catch {
        Write-Log "Failed to start service: $_" "ERROR"
    }
}

function Stop-MCService {
    Write-Host "Stopping Mission Control Service..." -ForegroundColor Cyan
    
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (!$Service) { return }
    
    if ($Service.Status -eq "Running") {
        Microsoft.PowerShell.Management\Stop-Service -Name $ServiceName -Force
        Start-Sleep -Seconds 2
        Write-Log "Service stopped" "SUCCESS"
    }
}

function Get-Status {
    Write-Host ""
    Write-Host "=== Mission Control Status ===" -ForegroundColor Cyan
    
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($Service) {
        Write-Host "Service Status: $($Service.Status)" -ForegroundColor $(if($Service.Status -eq "Running"){"Green"}else{"Red"})
    } else {
        Write-Host "Service Status: Not Installed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  Service Name: $ServiceName"
    Write-Host "  URL: http://localhost:8080/"
    Write-Host "  Logs: $LogDir"
    
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8080/" -Method HEAD -TimeoutSec 3 -ErrorAction SilentlyContinue
        Write-Host ""
        Write-Host "Health Check: OK ($($Response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "Health Check: UNREACHABLE" -ForegroundColor Red
    }
    Write-Host ""
}

function Remove-MCService {
    Write-Host "Removing Mission Control Service..." -ForegroundColor Cyan
    
    if (!(Test-NSSM)) { return }
    
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($Service -and $Service.Status -eq "Running") {
        Microsoft.PowerShell.Management\Stop-Service -Name $ServiceName -Force
        Start-Sleep -Seconds 2
    }
    
    & $NSSMPath remove $ServiceName confirm 2>&1 | Out-Null
    Write-Log "Service removed" "SUCCESS"
}

function Show-Logs {
    $RecentLog = Get-ChildItem -Path $LogDir -Recurse -Filter "*.log" -ErrorAction SilentlyContinue | 
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($RecentLog) {
        Write-Host "Recent log: $($RecentLog.Name)" -ForegroundColor Yellow
        Get-Content -Path $RecentLog.FullName -Tail 30 | ForEach-Object { Write-Host $_ }
    }
}

# Main execution
switch ($Action) {
    "install" { Install-Service }
    "start" { Start-MCService }
    "stop" { Stop-MCService }
    "restart" { Stop-MCService; Start-Sleep -Seconds 2; Start-MCService }
    "status" { Get-Status }
    "remove" { Remove-MCService }
    "logs" { Show-Logs }
}
