@echo off
REM WSL 24/7 Keep-Alive Monitor
REM Runs on Windows to ensure WSL Ubuntu stays running

echo [%date% %time%] WSL Keep-Alive Monitor

REM Check if WSL is running
wsl -l --running | findstr "Ubuntu" > nul
if %errorlevel% neq 0 (
    echo [%date% %time%] WSL Ubuntu not running, starting...
    wsl -d Ubuntu -e bash -c "echo 'WSL started at $(date)'"
    timeout /t 5 /nobreak > nul
)

REM Start keep-alive script inside WSL
wsl -d Ubuntu -e bash -c "pgrep -f 'wsl-keepalive.sh' > /dev/null || (nohup bash /mnt/c/Users/Admin/.openclaw/workspace/marvin-dash/scripts/wsl-keepalive.sh > /dev/null 2>&1 &)"

echo [%date% %time%] WSL keep-alive check complete.
