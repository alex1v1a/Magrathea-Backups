@echo off
echo Uninstalling Marvin Services...


nssm stop MarvinAutoRecovery
nssm remove MarvinAutoRecovery confirm


nssm stop MarvinEmailMonitor
nssm remove MarvinEmailMonitor confirm


nssm stop MarvinBackup
nssm remove MarvinBackup confirm


echo Done!
pause
