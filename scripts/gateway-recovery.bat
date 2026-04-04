@echo off
:: OpenClaw Gateway Recovery - Simple Wrapper
:: This batch file runs the PowerShell recovery script

echo [%date% %time%] Starting OpenClaw Gateway Recovery...

powershell.exe -ExecutionPolicy Bypass -File "%~dp0gateway-recovery.ps1" -Verbose

if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Gateway recovery failed!
    exit /b 1
) else (
    echo [%date% %time%] Gateway recovery successful!
    exit /b 0
)
