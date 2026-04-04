@echo off
echo ==========================================
echo    Modify Scheduled Tasks to Run Hidden
echo ==========================================
echo.
echo This script will modify tasks to run without showing CMD windows
echo.

REM Task 1: Marvin Auto Recovery
echo Modifying: Marvin Auto Recovery...
schtasks /Change /TN "Marvin Auto Recovery" /TR "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"node 'C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\auto-recovery.js' --auto\"" 2> nul
if %errorlevel% == 0 (
    echo   ✅ Modified to run hidden
) else (
    echo   ⚠️  Could not modify (may need admin rights)
)

REM Task 2: Marvin Email Monitor  
echo Modifying: Marvin Email Monitor...
schtasks /Change /TN "Marvin Email Monitor" /TR "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \"C:\Users\Admin\.openclaw\workspace\scripts\run-email-monitor.ps1\"" 2> nul
if %errorlevel% == 0 (
    echo   ✅ Modified to run hidden
) else (
    echo   ⚠️  Could not modify
)

REM Task 3: Marvin Backup
echo Modifying: Marvin Backup...
schtasks /Change /TN "Marvin Backup" /TR "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"node 'C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\backup.js' --auto\"" 2> nul
if %errorlevel% == 0 (
    echo   ✅ Modified to run hidden
) else (
    echo   ⚠️  Could not modify
)

REM Task 4: WSL-24x7-Monitor
echo Modifying: WSL-24x7-Monitor...
schtasks /Change /TN "WSL-24x7-Monitor" /TR "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"& 'C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\wsl-monitor.bat'\"" 2> nul
if %errorlevel% == 0 (
    echo   ✅ Modified to run hidden
) else (
    echo   ⚠️  Could not modify
)

REM Task 5: Kanban-AutoRefresh
echo Modifying: Kanban-AutoRefresh...
schtasks /Change /TN "Kanban-AutoRefresh" /TR "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"& 'C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\kanban-refresh.bat'\"" 2> nul
if %errorlevel% == 0 (
    echo   ✅ Modified to run hidden
) else (
    echo   ⚠️  Could not modify
)

echo.
echo ==========================================
echo Note: Tasks that couldn't be modified may
need to be run as Administrator
echo ==========================================
pause
