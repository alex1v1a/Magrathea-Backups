@echo off
echo ============================================
echo HEB Cart - Add Items
echo ============================================
echo.
cd /d "C:\Users\Admin\.openclaw\workspace\dinner-automation"

echo Starting Chrome (if not running)...
node scripts\launch-shared-chrome.js > nul 2>&1
timeout /t 3 /nobreak > nul

echo.
echo ============================================
echo Starting automation...
echo Make sure you're logged into heb.com!
echo ============================================
echo.

node scripts\heb-add-cart.js

echo.
echo ============================================
pause
