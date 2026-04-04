@echo off
echo ============================================
echo     HEB Auto Shopper Extension
echo ============================================
echo.
echo This will open Edge and guide you through
echo installing the HEB extension.
echo.
echo Press any key to continue...
pause > nul

echo.
echo Opening Edge extensions page...
echo.
echo STEPS:
echo 1. Toggle "Developer mode" ON (top right)
echo 2. Click "Load unpacked"
echo 3. Select this folder:
echo    %~dp0
4. Click "Select Folder"
echo.
echo Press any key to open Edge...
pause > nul

start msedge "edge://extensions/"

echo.
echo Edge opened. Follow the steps above.
echo.
echo Press any key when done installing...
pause > nul

echo.
echo ============================================
echo Installation complete!
echo.
echo Now go to heb.com, login, and click the
echo extension icon to start adding items.
echo ============================================
pause
