@echo off
echo Cleaning up excess Edge processes...
taskkill /F /IM msedge.exe /FI "MEMUSAGE gt 100000" 2>nul
echo Cleanup complete