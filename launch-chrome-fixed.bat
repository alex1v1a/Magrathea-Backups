@echo off
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul
del /Q "C:\Users\Admin\.openclaw\chrome-marvin-only-profile\Default\LOCK" 2>nul
del /Q "C:\Users\Admin\.openclaw\chrome-marvin-only-profile\Default\SingletonLock" 2>nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\Users\Admin\.openclaw\chrome-marvin-only-profile" --no-first-run --no-default-browser-check
echo Chrome launching...
timeout /t 10 /nobreak >nul
