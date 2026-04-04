# Quick Chrome Reinstall
Write-Host "🔧 Quick Chrome Reinstall" -ForegroundColor Cyan

# Kill Chrome
Write-Host "`n1. Killing Chrome..."
taskkill /F /IM chrome.exe 2> $null
taskkill /F /IM GoogleUpdate.exe 2> $null
Write-Host "   ✅ Done"

# Uninstall
Write-Host "`n2. Uninstalling Chrome..."
if (Test-Path "C:\Program Files\Google\Chrome\Application\144.0.7559.133\Installer\setup.exe") {
    & "C:\Program Files\Google\Chrome\Application\144.0.7559.133\Installer\setup.exe" --uninstall --multi-install --chrome --system-level --force-uninstall 2> $null
}
Write-Host "   ✅ Done"

# Delete data
Write-Host "`n3. Deleting Chrome data..."
Remove-Item -Path "C:\Program Files\Google\Chrome" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Google\Chrome" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\Admin\.openclaw\chrome-*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Done"

# Download Chrome (alternate URL)
Write-Host "`n4. Downloading Chrome (this may take 2 minutes)..."
$url = "https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi"
$output = "$env:TEMP\Chrome.msi"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing -TimeoutSec 180
    if (Test-Path $output) {
        Write-Host "   ✅ Downloaded"
        
        # Install
        Write-Host "`n5. Installing Chrome..."
        Start-Process msiexec.exe -ArgumentList "/i `"$output`" /qn /norestart" -Wait
        Write-Host "   ✅ Installed"
        
        # Test
        Write-Host "`n6. Testing Chrome..."
        if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
            Write-Host "   ✅ Chrome installed successfully!"
            
            # Quick test
            $testProfile = "$env:TEMP\chrome-test"
            Remove-Item $testProfile -Recurse -Force -ErrorAction SilentlyContinue
            New-Item -ItemType Directory -Path $testProfile -Force | Out-Null
            
            $chrome = Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--user-data-dir=`"$testProfile`" --no-first-run about:blank" -PassThru
            Write-Host "   Chrome PID: $($chrome.Id)"
            Write-Host "   Waiting 15 seconds..."
            Start-Sleep 15
            
            try {
                Get-Process -Id $chrome.Id -ErrorAction Stop | Out-Null
                Write-Host "   ✅ Chrome still running after 15 seconds!"
                Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "   ⚠️  Chrome crashed"
            }
        } else {
            Write-Host "   ❌ Chrome not found after install"
        }
    }
} catch {
    Write-Host "   ❌ Error: $_"
    Write-Host "   Please download manually from: https://www.google.com/chrome/"
}

Write-Host "`n✅ Reinstall complete!" -ForegroundColor Green
