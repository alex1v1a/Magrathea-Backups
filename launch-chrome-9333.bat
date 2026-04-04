@echo off
echo Launching Chrome with Debug Port 9333...
taskkill /F /IM chrome.exe 2>nul
ping -n 2 127.0.0.1 >nul
del /Q "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\LOCK" 2>nul
del /Q "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\SingletonLock" 2>nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9333 --user-data-dir="C:\Users\Admin\AppData\Local\Google\Chrome\User Data" --profile-directory=Default --no-first-run --start-maximized
