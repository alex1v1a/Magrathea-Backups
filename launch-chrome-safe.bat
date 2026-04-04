@echo off
echo ==========================================
echo    Chrome - Marvin Profile (Safe Mode)
echo ==========================================
echo.

:: Kill any existing Chrome
taskkill /F /IM chrome.exe 2> nul

timeout /t 2 /nobreak > nul

:: Launch with minimal flags
start "" "C:Program FilesGoogleChromeApplicationchrome.exe" ^
  --user-data-dir="C:UsersAdmin.openclawchrome-marvin-only-profile" ^
  --load-extension="C:UsersAdmin.openclawworkspacedinner-automationheb-extension" ^
  --start-maximized ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-gpu ^
  --disable-software-rasterizer ^
  https://www.heb.com

echo.
echo Chrome launching in safe mode...
echo Look for the window and click the HEB extension icon.
pause
