@echo off
echo ==========================================
echo    Install Marvin Windows Services
echo ==========================================
echo.
echo This requires NSSM (Non-Sucking Service Manager)
echo Download from: https://nssm.cc/download
echo.
echo Press any key to install services...
pause > nul

cd /d "%~dp0"


echo Installing Marvin Auto Recovery...
nssm install MarvinAutoRecovery "C:\Program Files\nodejs\node.exe"
nssm set MarvinAutoRecovery AppDirectory "C:\Users\Admin\.openclaw\workspace"
nssm set MarvinAutoRecovery AppParameters "service-wrappers\MarvinAutoRecovery.js"
nssm set MarvinAutoRecovery DisplayName "Marvin Auto Recovery"
nssm set MarvinAutoRecovery Description "Monitors and repairs critical Marvin services"
nssm set MarvinAutoRecovery Start SERVICE_AUTO_START
nssm start MarvinAutoRecovery


echo Installing Marvin Email Monitor...
nssm install MarvinEmailMonitor "C:\Program Files\nodejs\node.exe"
nssm set MarvinEmailMonitor AppDirectory "C:\Users\Admin\.openclaw\workspace"
nssm set MarvinEmailMonitor AppParameters "service-wrappers\MarvinEmailMonitor.js"
nssm set MarvinEmailMonitor DisplayName "Marvin Email Monitor"
nssm set MarvinEmailMonitor Description "Checks email accounts for important messages"
nssm set MarvinEmailMonitor Start SERVICE_AUTO_START
nssm start MarvinEmailMonitor


echo Installing Marvin Backup Service...
nssm install MarvinBackup "C:\Program Files\nodejs\node.exe"
nssm set MarvinBackup AppDirectory "C:\Users\Admin\.openclaw\workspace"
nssm set MarvinBackup AppParameters "service-wrappers\MarvinBackup.js"
nssm set MarvinBackup DisplayName "Marvin Backup Service"
nssm set MarvinBackup Description "Automated backup system"
nssm set MarvinBackup Start SERVICE_AUTO_START
nssm start MarvinBackup


echo.
echo ==========================================
echo Services installed!
echo ==========================================
echo.
echo To check status:
echo   sc query MarvinAutoRecovery
echo.
pause
