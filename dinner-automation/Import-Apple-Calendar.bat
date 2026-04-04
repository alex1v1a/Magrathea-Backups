@echo off
echo ===========================================
echo    🍎 AUTO-IMPORT TO APPLE CALENDAR
echo ===========================================
echo.

REM Check if iCloud for Windows is installed and configured
if exist "%LOCALAPPDATA%\Apple\iCloud\iCloud.exe" (
    echo [✓] iCloud for Windows found
    echo.
    echo Starting iCloud and calendar import...
    start "" "%LOCALAPPDATA%\Apple\iCloud\iCloud.exe"
    timeout /t 2 /nobreak >nul
    
    REM Open the ICS file
    start "" "%~dp0data\dinner-plan.ics"
    
    echo.
    echo ===========================================
    echo    AUTOMATION LIMIT ON WINDOWS
    echo ===========================================
    echo.
    echo Apple Calendar is macOS/iOS only.
    echo On Windows, you have these options:
    echo.
    echo OPTION 1: iCloud for Windows (Recommended)
    echo   - Ensure 'Mail, Contacts, Calendars' is enabled
    echo   - The calendar will sync automatically after import
    echo   - Click 'Add' in the import dialog that appears
    echo.
    echo OPTION 2: iCloud.com Web (No installation)
    echo   - Visit https://www.icloud.com/calendar/
    echo   - Sign in with your Apple ID
    echo   - Click gear icon ^> Import ^> Select dinner-plan.ics
    echo.
    echo OPTION 3: Use iPhone/iPad/Mac
    echo   - Airdrop/email the dinner-plan.ics file to your device
    echo   - Tap to open and add to calendar
    echo.
) else (
    echo [!] iCloud for Windows not found
    echo.
    echo Opening iCloud.com in browser...
    start https://www.icloud.com/calendar/
    
    echo Opening calendar file location...
    start "" "%~dp0data"
    
    echo.
    echo ===========================================
    echo    MANUAL IMPORT REQUIRED
    echo ===========================================
    echo.
    echo Apple Calendar requires macOS or iOS.
    echo.
    echo To import on Windows:
    echo 1. Sign in to https://www.icloud.com/calendar/
    echo 2. Click the gear icon (Settings)
    echo 3. Click 'Import'
    echo 4. Select 'dinner-plan.ics' from the opened folder
    echo 5. Click 'Import'
    echo.
    echo The calendar will then sync to all your Apple devices.
    echo.
)

echo Press any key to close...
pause > nul
