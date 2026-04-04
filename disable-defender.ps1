Set-MpPreference -DisableRealtimeMonitoring $true
Write-Host "Windows Defender real-time protection: DISABLED"
Get-MpPreference | Select-Object DisableRealtimeMonitoring | Format-Table