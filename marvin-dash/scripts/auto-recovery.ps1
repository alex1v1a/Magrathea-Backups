# Marvin Auto Recovery - PowerShell Wrapper
# Calls the Node.js auto-recovery script

$ErrorActionPreference = "Continue"

$scriptPath = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\auto-recovery.js"
$logDir = "$env:USERPROFILE\.openclaw\logs"
$logFile = "$logDir\auto-recovery-ps1.log"

# Ensure log directory exists
New-Item -ItemType Directory -Path $logDir -Force -ErrorAction SilentlyContinue | Out-Null

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $Message" -ErrorAction SilentlyContinue
}

Write-Log "Auto-recovery started"

try {
    # Check if Node.js is available
    $nodeVersion = node --version 2>&1
    Write-Log "Node.js version: $nodeVersion"
    
    # Run the auto-recovery script
    $output = node $scriptPath --auto 2>&1
    Write-Log "Output: $output"
    
    Write-Log "Auto-recovery completed successfully"
    exit 0
} catch {
    Write-Log "ERROR: $_"
    exit 1
}
