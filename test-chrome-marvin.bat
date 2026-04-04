@echo off
echo ==========================================
echo    Chrome Test - Marvin Profile
echo ==========================================
echo.

echo Killing existing Chrome...
taskkill /F /IM chrome.exe 2> nul
timeout /t 2 /nobreak > nul

echo Launching Chrome with Marvin profile...
start "Chrome-Marvin" "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\Users\Admin\.openclaw\chrome-marvin-only-profile" --no-first-run --no-default-browser-check --start-maximized "https://www.heb.com"

timeout /t 5 /nobreak > nul

echo.
echo Checking if Chrome is running...
tasklist | findstr /I "chrome.exe"

echo.
echo If Chrome is listed above, check your taskbar/desktop for the window.
echo.
pause
