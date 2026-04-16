@echo off
:: OpenClaw Health Monitor for Windows
:: Place in C:\openclaw\ and run manually or via Task Scheduler

echo %date% %time% Starting health check >> C:\openclaw\health-monitor.log

:: Check if OpenClaw is running
tasklist | findstr /i "openclaw" >nul
if errorlevel 1 (
    echo %date% %time% No OpenClaw found, restarting... >> C:\openclaw\health-monitor.log
    taskkill /F /IM node.exe 2>nul
    timeout /t 3 /nobreak >nul
    cd C:\openclaw
    start /B npx openclaw gateway --port 18789 > gateway.log 2>&1
    echo %date% %time% Restarted >> C:\openclaw\health-monitor.log
) else (
    echo %date% %time% OpenClaw running normally >> C:\openclaw\health-monitor.log
)

echo %date% %time% Check complete >> C:\openclaw\health-monitor.log
echo --- >> C:\openclaw\health-monitor.log
