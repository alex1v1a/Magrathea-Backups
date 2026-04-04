# Windows Update Check
Write-Host "Checking Windows Updates..."
$session = New-Object -ComObject Microsoft.Update.Session
$searcher = $session.CreateUpdateSearcher()
$result = $searcher.Search("IsInstalled=0")
Write-Host "Available updates: $($result.Updates.Count)"
$result.Updates | Select-Object -First 5 Title

Write-Host "`nGPU Info:"
Get-WmiObject Win32_VideoController | Select-Object Name, DriverVersion | Format-Table
