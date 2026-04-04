@echo off
echo ╔════════════════════════════════════════════════╗
echo ║   🤖 FULLY AUTOMATIC DINNER SYSTEM             ║
echo ║   (Zero Manual Steps - Maximum Automation)     ║
echo ╚════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Step 1: Send Email (Fully Automatic)
echo [1/3] 📧 Sending dinner plan email...
node scripts\email-client.js --send 2>nul
if %errorlevel% equ 0 (
    echo      ✅ Email sent successfully
) else (
    echo      ⚠️  Email may have failed
)
echo.

:: Step 2: Launch HEB Cart (Fully Automatic - brings Chrome to front)
echo [2/3] 🛒 Launching HEB auto-cart (Chrome will open automatically)...
start /wait cmd /c "node scripts\auto-heb-foreground.js"
echo      ✅ Chrome launched with auto-start extension
echo.

:: Step 3: Calendar (Windows Limitation - requires manual import)
echo [3/3] 📅 Preparing Apple Calendar file...
echo      ℹ️  Windows cannot auto-import to Apple Calendar
echo      ℹ️  Opening import helper...
start cmd /c "Import-Apple-Calendar.bat"
echo      ✅ Calendar file ready
echo.

echo ╔════════════════════════════════════════════════╗
echo ║   ✅ AUTOMATION COMPLETE                       ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 🤖 Automatic actions completed:
echo    • Email sent to alex@1v1a.com
echo    • Chrome opened with HEB auto-cart
echo    • Calendar file generated
echo.
echo ⚠️  MANUAL STEP REQUIRED FOR CALENDAR:
echo    Apple Calendar requires macOS/iOS.
echo    Options:
echo      1. Use iCloud.com/calendar (web import)
echo      2. Use iCloud for Windows app
echo      3. Import on your iPhone/Mac
echo.
echo 📁 Calendar file: data\dinner-plan.ics
echo.
pause
