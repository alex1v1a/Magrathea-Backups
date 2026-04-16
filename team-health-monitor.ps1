# Team Health Monitor - Windows Version (for Bistromath)
# Save as C:\openclaw\team-health-monitor.ps1

$LogFile = "C:\openclaw\team-health-monitor.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $LogFile -Value "$Timestamp Starting team health check (Windows)"

# Check if OpenClaw gateway is running
$OpenClawProcesses = Get-Process | Where-Object { $_.ProcessName -like "*openclaw*" -or $_.ProcessName -like "*node*" }

if ($OpenClawProcesses.Count -eq 0) {
    Add-Content -Path $LogFile -Value "$Timestamp No OpenClaw processes found, attempting restart..."
    
    # Kill any zombie node processes
    Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start gateway
    Start-Process -FilePath "npx" -ArgumentList "openclaw", "gateway", "--port", "18789" -WorkingDirectory "C:\openclaw" -WindowStyle Hidden
    
    Add-Content -Path $LogFile -Value "$Timestamp Restart initiated"
} else {
    # Check for zombie processes (high CPU usage)
    $ZombieProcesses = $OpenClawProcesses | Where-Object { $_.CPU -gt 1000 }
    
    if ($ZombieProcesses) {
        Add-Content -Path $LogFile -Value "$Timestamp Zombie process detected (high CPU), restarting..."
        
        # Kill all OpenClaw/node processes
        Get-Process | Where-Object { $_.ProcessName -like "*openclaw*" -or $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 3
        
        # Start fresh
        Start-Process -FilePath "npx" -ArgumentList "openclaw", "gateway", "--port", "18789" -WorkingDirectory "C:\openclaw" -WindowStyle Hidden
        
        Add-Content -Path $LogFile -Value "$Timestamp Zombie cleared and restarted"
    } else {
        Add-Content -Path $LogFile -Value "$Timestamp OpenClaw running normally ($($OpenClawProcesses.Count) processes)"
    }
}

Add-Content -Path $LogFile -Value "$Timestamp Health check complete"
Add-Content -Path $LogFile -Value "---"
