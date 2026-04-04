@echo off
REM HEB Cart Automation Launcher
REM Uses your real Chrome profile (bypasses bot detection)

echo ==========================================
echo HEB Cart Automation - Real Chrome Profile
echo ==========================================
echo.
echo This will:
echo 1. Launch Chrome with your profile (already logged in)
echo 2. Navigate to HEB.com
echo 3. Search and add each item from your meal plan
echo.
echo Make sure Chrome is closed before running!
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Starting automation...
node scripts\auto-heb-cart-chrome.js

pause
