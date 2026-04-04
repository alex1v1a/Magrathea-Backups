# Chrome Test Script
try {
    taskkill /F /IM chrome.exe 2> $null | Out-Null
} catch {}

Start-Sleep 2

try {
    $proc = Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--no-first-run","about:blank" -PassThru -WindowStyle Normal
    Start-Sleep 3
    
    if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
        Write-Host "SUCCESS: Chrome running with PID $($proc.Id)"
    } else {
        Write-Host "FAILED: Chrome crashed immediately"
    }
} catch {
    Write-Host "ERROR: $_"
}
