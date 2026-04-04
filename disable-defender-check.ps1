# Check current status and attempt to disable
$currentStatus = Get-MpPreference | Select-Object -ExpandProperty DisableRealtimeMonitoring
Write-Host "Current real-time protection status: $currentStatus"

try {
    Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction Stop
    $newStatus = Get-MpPreference | Select-Object -ExpandProperty DisableRealtimeMonitoring
    Write-Host "New status: $newStatus"
    
    if ($newStatus -eq $true) {
        Write-Host "✅ Real-time protection DISABLED successfully"
    } else {
        Write-Host "⚠️  Could not disable - may require Administrator privileges"
    }
} catch {
    Write-Host "❌ Error: $_"
    Write-Host "⚠️  Try running as Administrator"
}