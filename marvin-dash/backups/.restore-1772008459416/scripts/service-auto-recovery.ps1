# Service Wrapper for Auto Recovery
# This script runs as a Windows service

$ErrorActionPreference = 'Continue'

# Change to workspace directory
Set-Location 'C:\Users\Admin\.openclaw\workspace'

# Run auto-recovery in continuous mode
while ($true) {
    try {
        & node 'C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\auto-recovery.js' --auto
    } catch {
        Write-EventLog -LogName Application -Source "MarvinAutoRecovery" -EventId 1001 -EntryType Error -Message "Auto Recovery error: $_"
    }
    
    # Wait 5 minutes between checks
    Start-Sleep -Seconds 300
}
