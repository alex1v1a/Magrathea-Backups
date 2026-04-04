@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════
echo    🛒 HEB Auto-Cart - Fully Automatic
echo ═══════════════════════════════════════════
echo.
echo Launching Chrome with HEB Auto-Cart extension...
echo This will automatically add items from your meal plan.
echo.

cd /d "%~dp0"
node scripts\heb-auto-launcher.js

echo.
echo Press any key to exit...
pause > nul
