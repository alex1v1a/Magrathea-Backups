@echo off
REM Dinner Plans Automation - Windows Task Scheduler Setup
REM Run this script as Administrator to create scheduled tasks

echo ========================================
echo  Dinner Plans Automation Setup
echo ========================================
echo.

set "TASK_NAME=Dinner Plans Weekly Automation"
set "MONITOR_EMAIL=Dinner Email Monitor"
set "MONITOR_PURCHASE=Dinner Purchase Check"
set "MONITOR_CART=Dinner Cart Monitor"
set "CALENDAR_UPDATE=Dinner Calendar Update"
set "SCRIPT_DIR=C:\Users\Admin\.openclaw\workspace\dinner-automation\scripts"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"

REM Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run this script as Administrator
    pause
    exit /b 1
)

REM Check if Node.js is installed
if not exist "%NODE_PATH%" (
    echo ERROR: Node.js not found at %NODE_PATH%
    echo Please install Node.js or update NODE_PATH in this script
    pause
    exit /b 1
)

echo Node.js found: %NODE_PATH%
echo Script directory: %SCRIPT_DIR%
echo.

REM Delete existing tasks (ignore errors if they don't exist)
echo Cleaning up existing tasks...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
schtasks /delete /tn "%MONITOR_EMAIL%" /f >nul 2>&1
schtasks /delete /tn "%MONITOR_PURCHASE%" /f >nul 2>&1
schtasks /delete /tn "%MONITOR_CART%" /f >nul 2>&1
schtasks /delete /tn "%CALENDAR_UPDATE%" /f >nul 2>&1

REM Create main automation task (Sundays at 9:00 AM)
echo.
echo Creating main automation task (Sundays 9:00 AM)...
schtasks /create /tn "%TASK_NAME%" /tr "\"%NODE_PATH%\" \"%SCRIPT_DIR%\dinner-automation.js\"" /sc weekly /d SUN /st 09:00 /rl HIGHEST /f
if %errorlevel% neq 0 (
    echo ERROR: Failed to create main automation task
    pause
    exit /b 1
)
echo [OK] Main automation task created

REM Create email monitor (Hourly 1pm-9pm)
echo.
echo Creating email monitor task (Hourly 1pm-9pm)...
schtasks /create /tn "%MONITOR_EMAIL%" /tr "\"%NODE_PATH%\" \"%SCRIPT_DIR%\monitor-email.js\"" /sc hourly /st 13:00 /f
if %errorlevel% neq 0 (
    echo WARNING: Failed to create email monitor task
) else (
    echo [OK] Email monitor task created
)

REM Create purchase check (Daily 8:45pm)
echo.
echo Creating purchase check task (Daily 8:45 PM)...
schtasks /create /tn "%MONITOR_PURCHASE%" /tr "\"%NODE_PATH%\" \"%SCRIPT_DIR%\monitor-purchase.js\"" /sc daily /st 20:45 /f
if %errorlevel% neq 0 (
    echo WARNING: Failed to create purchase check task
) else (
    echo [OK] Purchase check task created
)

REM Create cart monitor (Daily 9:00pm)
echo.
echo Creating cart monitor task (Daily 9:00 PM)...
schtasks /create /tn "%MONITOR_CART%" /tr "\"%NODE_PATH%\" \"%SCRIPT_DIR%\monitor-cart.js\"" /sc daily /st 21:00 /f
if %errorlevel% neq 0 (
    echo WARNING: Failed to create cart monitor task
) else (
    echo [OK] Cart monitor task created
)

REM Create calendar update (Daily 5:00pm)
echo.
echo Creating calendar update task (Daily 5:00 PM)...
schtasks /create /tn "%CALENDAR_UPDATE%" /tr "\"%NODE_PATH%\" \"%SCRIPT_DIR%\update-calendar.js\"" /sc daily /st 17:00 /f
if %errorlevel% neq 0 (
    echo WARNING: Failed to create calendar update task
) else (
    echo [OK] Calendar update task created
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Tasks created:
echo   - %TASK_NAME% (Sundays 9:00 AM)
echo   - %MONITOR_EMAIL% (Hourly 1-9 PM)
echo   - %MONITOR_PURCHASE% (Daily 8:45 PM)
echo   - %MONITOR_CART% (Daily 9:00 PM)
echo   - %CALENDAR_UPDATE% (Daily 5:00 PM)
echo.
echo To view tasks, open Task Scheduler (taskschd.msc)
echo.
pause
