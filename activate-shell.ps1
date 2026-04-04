$shell = New-Object -ComObject Shell.Application
$windows = $shell.Windows()
$found = $false
foreach ($win in $windows) {
    if ($win.Name -eq 'Google Chrome') {
        $win.Visible = $true
        Write-Host ('Activated: ' + $win.LocationName)
        $found = $true
    }
}
if (-not $found) {
    Write-Host 'No Chrome windows found via Shell.Application'
}
