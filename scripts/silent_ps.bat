@echo off
:: Silent PowerShell Launcher - Completely hidden execution
:: Usage: silent_ps.bat <script_path> [args]

if "%~1"=="" (
    echo Usage: silent_ps.bat ^<script_path^> [args]
    exit /b 1
)

set "SCRIPT=%~1"
shift

:: Build arguments
set "ARGS="
:loop
if "%~1"=="" goto execute
set "ARGS=%ARGS% %~1"
shift
goto loop

:execute
:: Use PowerShell with hidden window style through start command
powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"%ARGS%
exit /b %errorlevel%
