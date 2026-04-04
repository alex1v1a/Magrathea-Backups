@echo off
echo ===========================================
echo    🍎 Apple Calendar Import Only
echo    (No Outlook - iCloud Direct)
echo ===========================================
echo.

REM Check if iCloud for Windows is installed
if exist "%LOCALAPPDATA%\Apple\iCloud\iCloud.exe" (
    echo [✓] iCloud for Windows found
    echo.
    echo Opening iCloud to sync calendar...
    start "" "%LOCALAPPDATA%\Apple\iCloud\iCloud.exe"
    echo.
    echo Please ensure 'Mail, Contacts, Calendars' is enabled in iCloud settings
) else (
    echo [!] iCloud for Windows not detected
    echo.
    echo Opening iCloud.com for web import...
    start https://www.icloud.com/calendar/
    echo.
    echo Steps to import:
    echo   1. Sign in to iCloud.com
    echo   2. Click Calendar
    echo   3. Click gear icon → Import
    echo   4. Select dinner-plan.ics file
)

echo.
echo ===========================================
echo    📅 Calendar File Location:
echo ===========================================
echo.
echo Opening calendar file folder...
start "" "%~dp0data"
echo.
echo File: dinner-plan.ics
echo.
echo ===========================================
pause
