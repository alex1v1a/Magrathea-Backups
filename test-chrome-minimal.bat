@echo off
echo ==========================================
echo    Chrome Minimal Test - Marvin Profile
echo ==========================================
echo.

echo Killing any existing Chrome...
taskkill /F /IM chrome.exe 2> nul

timeout /t 2 /nobreak > nul

echo.
echo Testing Chrome with minimal arguments...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --no-first-run "about:blank"

timeout /t 3 /nobreak > nul

echo.
echo Checking if Chrome is running...
tasklist /FI "IMAGENAME eq chrome.exe" 2> nul | find /C "chrome"

echo.
echo If number above is 0, Chrome crashed immediately.
echo If number is 1+, Chrome is running.
echo.
pause
