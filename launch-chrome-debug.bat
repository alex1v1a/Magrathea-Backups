@echo off
echo ==========================================
echo  Launching Chrome with Debug Port 9222
echo ==========================================
echo.

REM Kill existing Chrome
echo Stopping existing Chrome processes...
taskkill /F /IM chrome.exe 2>nul
taskkill /F /IM chromedriver.exe 2>nul
ping -n 3 127.0.0.1 >nul

REM Clear lock files
echo Clearing lock files...
if exist "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\LOCK" del /Q "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\LOCK"
if exist "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\SingletonLock" del /Q "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\SingletonLock"

echo.
echo Launching Chrome...
echo.

REM Launch Chrome with debug port - NOTE: removed /B flag which may cause issues
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\Users\Admin\AppData\Local\Google\Chrome\User Data" --profile-directory=Default --restore-last-session --no-first-run --no-default-browser-check --start-maximized

echo Chrome launching...
echo.
echo Wait 5 seconds for Chrome to open
echo Then login to HEB and tell Marvin "logged in"
echo.
pause
