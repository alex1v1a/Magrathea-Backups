# Auto-Import Apple Calendar (Windows)
# This script automatically imports ICS to Apple Calendar via iCloud

$icsPath = "C:\Users\Admin\.openclaw\workspace\dinner-automation\data\dinner-plan.ics"

# Check if running on Windows with Apple Calendar (unlikely)
# Instead, we'll use a workaround: open the file and simulate the click

# Method 1: Try to use iCloud for Windows if installed
$icloudPath = "$env:LOCALAPPDATA\Apple\iCloud\iCloud.exe"
if (Test-Path $icloudPath) {
    Write-Host "Opening iCloud for Windows..."
    Start-Process $icloudPath
    
    # Open the ICS file - user still needs to click Add
    Start-Process $icsPath
    
    Write-Host @"
    ===========================================
    iCloud opened. Please:
    1. Ensure 'Mail, Contacts, Calendars' is ON
    2. Click 'Add' in the Calendar import window
    ===========================================
"@
} else {
    # Method 2: Open browser to iCloud.com for web import
    Write-Host "Opening iCloud.com calendar for import..."
    Start-Process "https://www.icloud.com/calendar/"
    
    # Open folder with ICS file
    Start-Process explorer.exe -ArgumentList "/select,$icsPath"
    
    Write-Host @"
    ===========================================
    STEPS TO AUTO-IMPORT:
    1. Sign in to iCloud.com (if not already)
    2. Click the gear icon (Settings)
    3. Click 'Import'
    4. Select 'dinner-plan.ics' from the opened folder
    5. Click 'Import'
    ===========================================
"@
}

# Keep window open
Write-Host "`nPress any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
