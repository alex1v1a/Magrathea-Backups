@echo off
echo ==========================================
echo HEB Cart Quick Add
echo ==========================================
echo.

REM Change to workspace directory
cd /d "C:\Users\Admin\.openclaw\workspace"

echo Step 1: Checking Chrome...
node dinner-automation\scripts\launch-shared-chrome.js --status > nul 2>&1
if errorlevel 1 (
    echo Starting Chrome...
    start /b node dinner-automation\scripts\launch-shared-chrome.js
    timeout /t 5 /nobreak > nul
)

echo.
echo Step 2: Running automation...
echo Make sure you're logged into heb.com in Chrome!
echo.

node dinner-automation\scripts\heb-cart-final.js

echo.
echo ==========================================
echo Done! Check your HEB cart.
echo ==========================================
pause
