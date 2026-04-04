#!/bin/bash
# OpenClaw Gateway Recovery - WSL Cron Setup
# Run this script to add automatic gateway monitoring to cron

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECOVERY_SCRIPT="$SCRIPT_DIR/gateway-recovery.sh"
CRON_COMMENT="# OpenClaw Gateway Auto-Recovery"

# Check if recovery script exists
if [ ! -f "$RECOVERY_SCRIPT" ]; then
    echo "Error: Recovery script not found at $RECOVERY_SCRIPT"
    exit 1
fi

# Make sure the script is executable
chmod +x "$RECOVERY_SCRIPT"

echo "=============================================="
echo "  OpenClaw Gateway Auto-Recovery Setup (WSL)"
echo "=============================================="
echo ""

# Function to install cron job
install_cron() {
    echo "Installing cron job..."
    
    # Remove any existing entries
    crontab -l 2>/dev/null | grep -v "$CRON_COMMENT" | crontab -
    
    # Add new cron job (runs every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * $RECOVERY_SCRIPT >/dev/null 2>&1 $CRON_COMMENT") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ Cron job installed successfully!"
        echo ""
        echo "The gateway will be checked every 5 minutes."
        echo "Logs are saved to: ~/.openclaw/logs/gateway-recovery-wsl.log"
        echo ""
        echo "To check status: crontab -l"
        echo "To remove: $0 --uninstall"
        echo ""
        
        # Run initial check
        echo "Running initial health check..."
        "$RECOVERY_SCRIPT"
    else
        echo "Error: Failed to install cron job"
        exit 1
    fi
}

# Function to uninstall cron job
uninstall_cron() {
    echo "Uninstalling cron job..."
    
    crontab -l 2>/dev/null | grep -v "$CRON_COMMENT" | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ Cron job removed successfully"
    else
        echo "Error: Failed to remove cron job"
        exit 1
    fi
}

# Main
if [ "$1" == "--uninstall" ]; then
    uninstall_cron
else
    install_cron
fi
