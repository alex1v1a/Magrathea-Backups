@echo off
taskkill /F /IM chrome.exe 2>nul
ping -n 2 127.0.0.1 >nul
del "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\LOCK" 2>nul
del "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\SingletonLock" 2>nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
