#!/bin/bash
# deploy-docker-service.sh
# Deploys Docker Desktop as a Windows service for headless operation
# Run this on Marvin (10.0.1.90) via SSH

set -e

echo "=== Docker Desktop Service Deployment ==="
echo "Target: Marvin (10.0.1.90)"
echo ""

# Check if running on Marvin
if [[ "$1" != "--local" ]]; then
    echo "This script must be run locally on Marvin."
    echo "Usage: ./deploy-docker-service.sh --local"
    exit 1
fi

# Check if running as Administrator
if ! powershell -Command "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')" 2>/dev/null | grep -q "True"; then
    echo "ERROR: This script must be run as Administrator"
    exit 1
fi

echo "[1/5] Checking Docker Desktop installation..."
if [[ ! -f "/c/Program Files/Docker/Docker/Docker Desktop.exe" ]]; then
    echo "ERROR: Docker Desktop not found. Please install it first."
    exit 1
fi
echo "      Docker Desktop found."

echo ""
echo "[2/5] Configuring auto-logon for admin user..."
# Enable auto-logon so Docker Desktop can start without interactive session
powershell -Command "
    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name 'AutoAdminLogon' -Value '1'
    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name 'DefaultUserName' -Value 'admin'
    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name 'DefaultPassword' -Value 'section9'
"
echo "      Auto-logon configured for admin user."

echo ""
echo "[3/5] Creating scheduled task for Docker Desktop..."
# Create a scheduled task to start Docker Desktop on user logon
powershell -Command "
    \$action = New-ScheduledTaskAction -Execute 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    \$trigger = New-ScheduledTaskTrigger -AtLogon
    \$principal = New-ScheduledTaskPrincipal -UserId 'admin' -RunLevel Highest
    \$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # Remove existing task if present
    Unregister-ScheduledTask -TaskName 'Docker Desktop AutoStart' -Confirm:\$false -ErrorAction SilentlyContinue
    
    Register-ScheduledTask -TaskName 'Docker Desktop AutoStart' -Action \$action -Trigger \$trigger -Principal \$principal -Settings \$settings
"
echo "      Scheduled task created."

echo ""
echo "[4/5] Creating Docker service wrapper..."
# Create a nssm service to manage Docker Desktop
# This allows Docker to run even without full GUI

DOCKER_WRAPPER="C:\ProgramData\DockerDesktop\docker-service.bat"
mkdir -p "/c/ProgramData/DockerDesktop"

cat > "$DOCKER_WRAPPER" << 'EOF'
@echo off
:: Docker Desktop Service Wrapper
:: Starts Docker Desktop and monitors it

echo [%date% %time%] Docker service starting...

:: Wait for WSL to be ready
timeout /t 10 /nobreak >nul

:: Start Docker Desktop
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: Keep running to prevent service from stopping
:loop
    timeout /t 60 /nobreak >nul
    tasklist | findstr "Docker Desktop.exe" >nul
    if errorlevel 1 (
        echo [%date% %time%] Docker Desktop not running, restarting...
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
goto loop
EOF

echo "      Service wrapper created at $DOCKER_WRAPPER"

echo ""
echo "[5/5] Installing nssm service..."
# Use nssm to create a Windows service for Docker
if command -v nssm &> /dev/null; then
    nssm install DockerDesktop "$DOCKER_WRAPPER"
    nssm set DockerDesktop DisplayName "Docker Desktop Service"
    nssm set DockerDesktop Description "Manages Docker Desktop for container operations"
    nssm set DockerDesktop Start SERVICE_AUTO_START
    nssm set DockerDesktop ObjectName LocalSystem
    nssm set DockerDesktop AppThrottle 5000
    nssm set DockerDesktop AppRestartDelay 60000
    echo "      nssm service installed."
else
    echo "      WARNING: nssm not found. Skipping service installation."
    echo "      Docker will rely on scheduled task instead."
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Reboot the machine: Restart-Computer"
echo "2. After reboot, Docker Desktop should start automatically"
echo "3. Verify with: docker ps"
echo ""
echo "To check status:"
echo "  - Docker Desktop GUI: Look for whale icon in system tray"
echo "  - Command line: docker version"
echo "  - Service: nssm status DockerDesktop (if installed)"
echo ""
echo "If Docker fails to start:"
echo "  1. Check Event Viewer > Windows Logs > Application"
echo "  2. Check Docker logs: %LOCALAPPDATA%\Docker\log\host\"
echo "  3. Try manual start: & 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"
