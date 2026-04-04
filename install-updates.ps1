# Install Windows Updates
Write-Host "Installing Windows Updates..." -ForegroundColor Cyan

try {
    $session = New-Object -ComObject Microsoft.Update.Session
    $searcher = $session.CreateUpdateSearcher()
    $result = $searcher.Search("IsInstalled=0 and Type='Software'")
    
    if ($result.Updates.Count -eq 0) {
        Write-Host "No updates to install" -ForegroundColor Green
        exit
    }
    
    Write-Host "Found $($result.Updates.Count) updates"
    
    # Download updates
    $toDownload = New-Object -ComObject Microsoft.Update.UpdateColl
    $result.Updates | ForEach-Object { 
        Write-Host "  Adding: $($_.Title.Substring(0, [Math]::Min(50, $_.Title.Length)))..."
        $toDownload.Add($_) | Out-Null 
    }
    
    $downloader = $session.CreateUpdateDownloader()
    $downloader.Updates = $toDownload
    Write-Host "`nDownloading..."
    $dlResult = $downloader.Download()
    Write-Host "Download result: $($dlResult.ResultCode)"
    
    # Install updates
    $toInstall = New-Object -ComObject Microsoft.Update.UpdateColl
    $result.Updates | Where-Object { $_.IsDownloaded } | ForEach-Object { $toInstall.Add($_) | Out-Null }
    
    if ($toInstall.Count -gt 0) {
        $installer = $session.CreateUpdateInstaller()
        $installer.Updates = $toInstall
        Write-Host "Installing $($toInstall.Count) updates..."
        $instResult = $installer.Install()
        Write-Host "Install result: $($instResult.ResultCode)"
        Write-Host "Reboot required: $($instResult.RebootRequired)"
    }
    
    Write-Host "`n✅ Windows Update complete" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
