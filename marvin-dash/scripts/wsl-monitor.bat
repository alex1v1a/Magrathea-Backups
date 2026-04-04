@echo off
if defined ALREADY_HIDDEN goto :run
set ALREADY_HIDDEN=1
start /min "" cmd /c "%~f0" %*
exit
:run
cd /d "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts"
wsl -l --running | findstr "Ubuntu" > nul
if %errorlevel% neq 0 (
    wsl -d Ubuntu -e bash -c "echo 'WSL started at $(date)'" >nul 2>&1
    timeout /t 5 /nobreak > nul
)
wsl -d Ubuntu -e bash -c "pgrep -f 'wsl-keepalive.sh' > /dev/null || (nohup bash /mnt/c/Users/Admin/.openclaw/workspace/marvin-dash/scripts/wsl-keepalive.sh > /dev/null 2>&1 &)" >nul 2>&1
