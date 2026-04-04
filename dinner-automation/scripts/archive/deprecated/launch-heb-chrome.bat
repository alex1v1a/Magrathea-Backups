@echo off
echo ==========================================
echo    HEB Auto-Cart v1.2.0 - Manual Launch
echo ==========================================
echo.
echo This will open Chrome with the HEB extension
echo pre-loaded and ready to auto-start.
echo.
echo Instructions:
echo 1. Chrome will open automatically
echo 2. Go to heb.com and log in (if not already)
echo 3. The extension will auto-detect items
echo 4. Click the extension icon to monitor progress
echo.
echo Press any key to launch Chrome...
pause > nul

"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --user-data-dir="C:\Users\Admin\.openclaw\chrome-heb-manual" ^
  --load-extension="C:\Users\Admin\.openclaw\workspace\dinner-automation\heb-extension" ^
  --start-maximized ^
  https://www.heb.com

echo.
echo Chrome launched! The extension is loaded.
echo Look for the shopping cart icon in your toolbar.
echo.
pause
