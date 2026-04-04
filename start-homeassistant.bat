@echo off
echo Starting Home Assistant...
echo.
echo This requires sudo password in WSL.
echo.
wsl -e bash -c "cd ~/homeassistant && sudo docker-compose up -d"
echo.
echo Waiting for HA to start (30 seconds)...
timeout /t 30 /nobreak >nul
echo.
echo Checking status...
wsl -e bash -c "docker ps | grep homeassistant"
echo.
echo Home Assistant should be available at: http://10.0.1.90:8123
pause
