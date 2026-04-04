# Marvin Windows Services Setup
# Run as Administrator

Write-Host "🔧 Creating Marvin Windows Services" -ForegroundColor Cyan
Write-Host "=" * 60

$services = @(
    @{
        Name = "MarvinAutoRecovery"
        DisplayName = "Marvin Auto Recovery"
        Description = "Monitors and repairs critical Marvin services automatically"
        Script = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\auto-recovery.js"
        Args = "--auto"
    },
    @{
        Name = "MarvinEmailMonitor"
        DisplayName = "Marvin Email Monitor"  
        Description = "Checks email accounts for important messages"
        Script = "C:\Users\Admin\.openclaw\workspace\scripts\email-monitor.js"
        Args = ""
    },
    @{
        Name = "MarvinBackup"
        DisplayName = "Marvin Backup"
        Description = "Automated backup system for Marvin data"
        Script = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\backup.js"
        Args = "--auto"
    },
    @{
        Name = "MarvinWSLMonitor"
        DisplayName = "Marvin WSL Monitor"
        Description = "Monitors WSL Ubuntu status and auto-recovers"
        Script = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\wsl-monitor.js"
        Args = ""
    }
)

foreach ($svc in $services) {
    Write-Host "`nInstalling: $($svc.DisplayName)" -ForegroundColor Yellow
    
    # Check if service exists
    $existing = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  ℹ️  Service already exists, removing..." -ForegroundColor Gray
        Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
        sc.exe delete $svc.Name | Out-Null
        Start-Sleep 1
    }
    
    # Create service using sc.exe
    $binPath = "`"C:\Program Files\nodejs\node.exe`" `"$($svc.Script)`" $($svc.Args)"
    
    try {
        sc.exe create $svc.Name binPath= $binPath start= auto DisplayName= `"$($svc.DisplayName)`" | Out-Null
        
        # Set description
        sc.exe description $svc.Name `"$($svc.Description)`" | Out-Null
        
        # Configure service
        sc.exe failure $svc.Name reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null
        
        Write-Host "  ✅ Service created" -ForegroundColor Green
        
        # Start service
        Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
        Write-Host "  ✅ Service started" -ForegroundColor Green
        
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "Service installation complete" -ForegroundColor Cyan
Write-Host "Services will run in background without CMD windows" -ForegroundColor Green
Write-Host "`nTo check status: Get-Service | Where-Object { `$_.Name -like 'Marvin*' }" -ForegroundColor Gray
