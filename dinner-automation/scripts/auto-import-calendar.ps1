# Auto-Import Calendar to Outlook (syncs to iCloud)
# Requires Outlook to be configured with iCloud account

$icsPath = "$env:USERPROFILE\.openclaw\workspace\dinner-automation\data\dinner-plan.ics"

if (-not (Test-Path $icsPath)) {
    Write-Error "ICS file not found: $icsPath"
    exit 1
}

try {
    # Create Outlook application object
    $outlook = New-Object -ComObject Outlook.Application
    $namespace = $outlook.GetNamespace("MAPI")
    
    # Find the iCloud calendar
    $icloudCalendar = $null
    foreach ($folder in $namespace.Folders) {
        foreach ($subFolder in $folder.Folders) {
            if ($subFolder.Name -eq "iCloud" -or $subFolder.Name -like "*iCloud*") {
                foreach ($cal in $subFolder.Folders) {
                    if ($cal.Name -eq "Dinner" -or $cal.DefaultItemType -eq 1) {
                        $icloudCalendar = $cal
                        break
                    }
                }
            }
            if ($icloudCalendar) { break }
        }
        if ($icloudCalendar) { break }
    }
    
    # If no Dinner calendar found, try to find any calendar
    if (-not $icloudCalendar) {
        foreach ($folder in $namespace.Folders) {
            foreach ($subFolder in $folder.Folders) {
                if ($subFolder.DefaultItemType -eq 1) {  # olFolderCalendar = 1
                    $icloudCalendar = $subFolder
                    break
                }
            }
            if ($icloudCalendar) { break }
        }
    }
    
    if ($icloudCalendar) {
        Write-Host "Importing to calendar: $($icloudCalendar.Name)"
        
        # Import ICS file
        $icloudCalendar.Import($icsPath, 1)  # 1 = olICal
        
        Write-Host "✅ Calendar imported successfully to $($icloudCalendar.Name)"
        Write-Host "   Events will sync to iCloud automatically"
    } else {
        Write-Warning "No calendar found. Opening ICS file for manual import..."
        Start-Process $icsPath
    }
    
} catch {
    Write-Warning "Outlook automation failed: $_"
    Write-Host "Opening ICS file for manual import..."
    Start-Process $icsPath
}
