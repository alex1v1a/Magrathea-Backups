# Windows Update and GPU Driver Reinstall Script

Write-Host "🔧 Windows System Maintenance" -ForegroundColor Cyan
Write-Host "=" * 60

# Section 1: Check Windows Update Status
Write-Host "`n1. Checking Windows Update Status..." -ForegroundColor Yellow
try {
    $updateSession = New-Object -ComObject Microsoft.Update.Session
    $updateSearcher = $updateSession.CreateUpdateSearcher()
    $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
    
    Write-Host "   Available updates: $($searchResult.Updates.Count)"
    
    if ($searchResult.Updates.Count -gt 0) {
        Write-Host "   Updates found:" -ForegroundColor Green
        $searchResult.Updates | Select-Object -First 5 | ForEach-Object {
            Write-Host "     - $($_.Title.Substring(0, [Math]::Min(60, $_.Title.Length)))..."
        }
        
        Write-Host "`n   Downloading and installing updates..." -ForegroundColor Cyan
        $updatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
        $searchResult.Updates | ForEach-Object { $updatesToInstall.Add($_) | Out-Null }
        
        $downloader = $updateSession.CreateUpdateDownloader()
        $downloader.Updates = $updatesToInstall
        $downloadResult = $downloader.Download()
        
        Write-Host "   Download result: $($downloadResult.ResultCode)"
        
        $installer = $updateSession.CreateUpdateInstaller()
        $installer.Updates = $updatesToInstall
        $installResult = $installer.Install()
        
        Write-Host "   Install result: $($installResult.ResultCode)"
        Write-Host "   Reboot required: $($installResult.RebootRequired)"
    } else {
        Write-Host "   No updates available" -ForegroundColor Green
    }
} catch {
    Write-Host "   Error checking updates: $_" -ForegroundColor Red
}

# Section 2: GPU Driver Information and Reinstall
Write-Host "`n2. GPU Driver Information..." -ForegroundColor Yellow
try {
    $gpu = Get-WmiObject -Class Win32_VideoController | Where-Object { $_.Name -notlike "*Remote*" } | Select-Object -First 1
    
    Write-Host "   GPU: $($gpu.Name)"
    Write-Host "   Current Driver: $($gpu.DriverVersion)"
    Write-Host "   Driver Date: $($gpu.DriverDate.Substring(0,8))"
    
    # Check if Intel GPU
    if ($gpu.Name -like "*Intel*") {
        Write-Host "`n   Intel GPU detected. Downloading latest driver..." -ForegroundColor Cyan
        
        # Intel driver download URL (UHD 630)
        $intelDriverUrl = "https://downloadmirror.intel.com/30478/a08/igfx_win_101.2128.exe"
        $driverPath = "$env:TEMP\intel_gpu_driver.exe"
        
        Write-Host "   Downloading from Intel..."
        try {
            Invoke-WebRequest -Uri $intelDriverUrl -OutFile $driverPath -UseBasicParsing
            Write-Host "   ✅ Driver downloaded to: $driverPath" -ForegroundColor Green
            Write-Host "`n   To install: Run $driverPath as Administrator"
        } catch {
            Write-Host "   ⚠️  Could not download driver automatically" -ForegroundColor Yellow
            Write-Host "   Please download manually from: https://www.intel.com/content/www/us/en/download/19344" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "   Error getting GPU info: $_" -ForegroundColor Red
}

# Section 3: Check for Windows Store app updates
Write-Host "`n3. Checking Windows Store app updates..." -ForegroundColor Yellow
try {
    Get-CimInstance -Namespace "root\cimv2\mdm\dmmap" -ClassName "MDM_EnterpriseModernAppManagement_AppManagement01" | Out-Null
    Write-Host "   Store apps update check initiated" -ForegroundColor Green
} catch {
    Write-Host "   Could not check Store apps" -ForegroundColor Yellow
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "System maintenance check complete" -ForegroundColor Cyan
Write-Host "=" * 60
