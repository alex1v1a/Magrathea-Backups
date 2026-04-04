# Fix HA Configuration Script
# Run on Marvin to clean up LCARS dashboards

$ConfigPath = "C:\opt\homeassistant\config\configuration.yaml"
$BackupPath = "C:\opt\homeassistant\config\configuration.yaml.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup
Copy-Item $ConfigPath $BackupPath
Write-Host "Backup created: $BackupPath"

# Read configuration
$content = Get-Content $ConfigPath -Raw

# Fix 1: Hide LCARS dashboards from sidebar (keep in header only)
$lcarsDashboards = @('lcars-bridge', 'lcars-engineering', 'lcars-science', 'lcars-security', 'lcars-quarters')

foreach ($dashboard in $lcarsDashboards) {
    $pattern = "($dashboard:\s*\r?\n\s*mode:\s*yaml\s*\r?\n\s*title:\s*\"[^\"]+\"\s*\r?\n\s*icon:\s*mdi:[^\r\n]+\s*\r?\n\s*)show_in_sidebar:\s*true"
    $replacement = "${1}show_in_sidebar: false"
    $content = $content -replace $pattern, $replacement
}

# Fix 2: Update filenames to correct paths (they're in dashboards/dashboards/)
foreach ($dashboard in $lcarsDashboards) {
    $shortName = $dashboard -replace 'lcars-',''
    $oldPattern = "filename:\s*dashboards/$dashboard\.yaml"
    $newPath = "filename: dashboards/dashboards/$shortName.yaml"
    $content = $content -replace $oldPattern, $newPath
}

# Save fixed configuration
$content | Set-Content $ConfigPath -Encoding UTF8
Write-Host "Configuration fixed!"
Write-Host ""
Write-Host "Changes made:"
Write-Host "- LCARS dashboards hidden from sidebar (still in header tabs)"
Write-Host "- Dashboard file paths corrected"
Write-Host ""
Write-Host "Next step: Restart HA"
Write-Host "  wsl -d Ubuntu bash -c 'sudo docker restart homeassistant'"
