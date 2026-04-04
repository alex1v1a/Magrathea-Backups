@echo off
REM Email Monitor Runner - HIDDEN MODE
REM Sets environment variables and runs the email monitor

REM Hide window immediately
if "%1"=="hidden" goto :start
start /min cmd /c "%~f0" hidden %*
exit

:start
REM Get the script directory
set SCRIPT_DIR=%~dp0
set WORKSPACE_DIR=%SCRIPT_DIR%..

REM Load credentials from secure storage
REM You should set these in your system environment variables or Windows Credential Manager
REM For now, we'll check if they're set and prompt if not

if "%ICLOUD_APP_PASSWORD%"=="" (
    echo WARNING: ICLOUD_APP_PASSWORD not set
    echo Please set it in your system environment variables
    echo Getting from TOOLS.md reference...
    REM App-specific password from TOOLS.md: jgdw-epfw-mspb-nihn
    set ICLOUD_APP_PASSWORD=jgdw-epfw-mspb-nihn
)

if "%GMAIL_PASSWORD%"=="" (
    echo WARNING: GMAIL_PASSWORD not set
    echo Please set it in your system environment variables
    echo Getting from TOOLS.md reference...
    REM Password from TOOLS.md: section9
    set GMAIL_PASSWORD=section9
)

REM Set default emails if not set
if "%ICLOUD_EMAIL%"=="" set ICLOUD_EMAIL=MarvinMartian9@icloud.com
if "%GMAIL_EMAIL%"=="" set GMAIL_EMAIL=9marvinmartian@gmail.com

REM Change to script directory
cd /d "%SCRIPT_DIR%"

echo ==========================================
echo Marvin Email Monitor
echo ==========================================
echo Checking accounts:
echo   - %ICLOUD_EMAIL%
echo   - %GMAIL_EMAIL%
echo.

REM Run the monitor
node email-monitor.js %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Monitor failed with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Monitor completed successfully
echo Check logs at: %WORKSPACE_DIR%\marvin-dash\data\email-monitor-state.json
