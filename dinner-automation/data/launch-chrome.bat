@echo off
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul
del /Q "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\LOCK" 2>nul
del /Q "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\SingletonLock" 2>nul
start "" /B "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\Users\Admin\AppData\Local\Google\Chrome\User Data" --profile-directory=Default --restore-last-session --no-first-run --no-default-browser-check --start-maximized
