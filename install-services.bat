@echo off
echo ==========================================
echo    Install Marvin Windows Services
echo ==========================================
echo.
echo This will convert scheduled tasks to Windows Services
echo Services run in background without CMD windows
echo.
echo Press any key to continue as Administrator...
pause > nul

powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File create-services.ps1' -Verb RunAs -Wait"

echo.
echo Installation complete!
echo.
echo To check services:
echo   powershell -Command "Get-Service ^| Where-Object { $_.Name -like 'Marvin*' }"
echo.
pause
