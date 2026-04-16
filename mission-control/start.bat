@echo off
REM Vectarr Mission Control Startup Script
REM Starts the LAN-accessible web server for the Mission Control dashboard

echo Starting Vectarr Mission Control...
echo.

REM Get the computer's IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LAN_IP=%%a
    goto :found_ip
)
:found_ip
set LAN_IP=%LAN_IP: =%

powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0server.ps1"

timeout /t 3 >nul

echo Mission Control is now running!
echo.
echo Local access:  http://localhost:8080/
if defined LAN_IP (
echo LAN access:      http://%LAN_IP%:8080/
)
echo.
echo Your browser should open automatically.
echo.
echo Press any key to stop the server...
pause >nul

REM Kill the PowerShell process
taskkill /F /IM powershell.exe /FI "WINDOWTITLE eq *server.ps1*" 2>nul

echo.
echo Server stopped.
