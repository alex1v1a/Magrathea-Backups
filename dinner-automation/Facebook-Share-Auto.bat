@echo off
REM Facebook Marketplace Automation - Marvin Profile
REM Uses persistent Chrome profile to maintain login

echo ==========================================
echo Facebook Marketplace Automation
echo Using Chrome Profile: Marvin
echo ==========================================
echo.
echo This will:
echo 1. Launch Chrome with Marvin profile (maintains login)
echo 2. Share F-150 listing to Facebook groups
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Starting automation...
echo.
node scripts\facebook-marketplace-automation.js

pause
