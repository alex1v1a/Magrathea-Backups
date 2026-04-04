@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════
echo    🎯 FULLY AUTOMATIC DINNER SYNC
echo    Email + Calendar + HEB Cart
echo ═══════════════════════════════════════════
echo.
echo Starting all systems automatically...
echo.

cd /d "%~dp0"
node scripts/auto-everything.js

echo.
echo ═══════════════════════════════════════════
echo    ✅ AUTOMATION COMPLETE
echo ═══════════════════════════════════════════
echo.
pause
