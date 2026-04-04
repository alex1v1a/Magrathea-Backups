@echo off
echo ==========================================
echo    Chrome Launcher - Visible Window
echo ==========================================
echo.

echo Killing existing Chrome processes...
taskkill /F /IM chrome.exe 2> nul
timeout /t 2 /nobreak > nul

echo.
echo Launching Chrome with visible window...
echo.

REM Use START command to ensure window is visible
start "Chrome" /NORMAL "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\Users\Admin\.openclaw\chrome-marvin-only-profile" --no-first-run --no-default-browser-check "https://www.heb.com"

timeout /t 3 /nobreak > nul

echo.
echo Checking if Chrome started...
tasklist | find /I "chrome.exe" > nul
if %errorlevel% == 0 (
    echo ✅ Chrome is running!
    echo.
    echo Look for Chrome window on your screen.
    echo If not visible, try:
    echo   - Alt+Tab to cycle windows
    echo   - Check taskbar for Chrome icon
    echo   - Look for window on secondary monitor
) else (
    echo ❌ Chrome failed to start
)

echo.
pause
