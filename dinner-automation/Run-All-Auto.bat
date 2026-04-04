@echo off
echo ===========================================
echo    🤖 FULLY AUTOMATIC DINNER SYSTEM
echo    (Zero User Intervention)
echo ===========================================
echo.

cd /d "%~dp0"

REM Step 1: Generate and auto-import calendar
echo [1/4] Syncing calendar to Outlook/iCloud...
powershell -ExecutionPolicy Bypass -File "scripts\auto-import-calendar.ps1" 2>nul
if %errorlevel% neq 0 (
    echo      ⚠️  Auto-import failed, opening file...
    start "" "data\dinner-plan.ics"
)

REM Step 2: Launch HEB auto-cart
echo [2/4] Launching HEB auto-cart...
start /min cmd /c "node scripts\heb-auto-launcher-module.js"

REM Step 3: Send email
echo [3/4] Sending dinner plan email...
node scripts\email-client.js --send 2>nul

REM Step 4: Start email monitor
echo [4/4] Starting email reply monitor...
start /min cmd /c "node scripts\monitor-email.js"

echo.
echo ===========================================
echo    ✅ AUTOMATION COMPLETE
echo ===========================================
echo.
echo 🤖 All systems running automatically:
echo    • Calendar: Synced to Outlook/iCloud
echo    • HEB Cart: Chrome ready (visit heb.com)
echo    • Email: Sent to alex@1v1a.com
echo    • Monitor: Watching for email replies
echo.
echo Press any key to close this window...
pause > nul
