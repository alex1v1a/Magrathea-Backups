#!/bin/bash
# Dinner Plans Automation - WSL Cron Setup
# Run this script in WSL to install crontab entries

echo "========================================"
echo "  Dinner Plans Automation - WSL Setup"
echo "========================================"
echo ""

# Get the workspace directory
WORKSPACE_DIR="/mnt/c/Users/Admin/.openclaw/workspace"
SCRIPT_DIR="$WORKSPACE_DIR/dinner-automation/scripts"

# Check if running in WSL
if ! grep -q Microsoft /proc/version 2>/dev/null && ! grep -q microsoft /proc/version 2>/dev/null; then
    echo "WARNING: This doesn't appear to be WSL. Continuing anyway..."
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js in WSL:"
    echo "  sudo apt update && sudo apt install -y nodejs npm"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "Script directory: $SCRIPT_DIR"
echo ""

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Add header
cat << 'EOF' > "$TEMP_CRON"
# Dinner Plans Automation Cron Jobs
# Generated: $(date)
# 
# Main automation: Sundays at 9:00 AM CST
# Email monitor: Hourly 1pm-9pm
# Purchase check: Daily 8:45pm
# Cart monitor: Daily 9:00pm
# Calendar update: Daily 5:00pm

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

EOF

# Add cron jobs
cat << EOF >> "$TEMP_CRON"
# Main automation: Every Sunday at 9:00 AM
0 9 * * 0 cd "$WORKSPACE_DIR" && /usr/bin/node "$SCRIPT_DIR/dinner-automation.js" >> "$WORKSPACE_DIR/dinner-automation/logs/cron.log" 2>&1

# Email reply monitoring: Every hour from 1pm-9pm
0 13-21 * * * cd "$WORKSPACE_DIR" && /usr/bin/node "$SCRIPT_DIR/monitor-email.js" >> "$WORKSPACE_DIR/dinner-automation/logs/monitor.log" 2>&1

# Purchase confirmation check: Daily at 8:45pm
45 20 * * * cd "$WORKSPACE_DIR" && /usr/bin/node "$SCRIPT_DIR/monitor-purchase.js" >> "$WORKSPACE_DIR/dinner-automation/logs/monitor.log" 2>&1

# HEB cart monitoring: Daily at 9:00pm
0 21 * * * cd "$WORKSPACE_DIR" && /usr/bin/node "$SCRIPT_DIR/monitor-cart.js" >> "$WORKSPACE_DIR/dinner-automation/logs/monitor.log" 2>&1

# Calendar update: Daily at 5:00pm
0 17 * * * cd "$WORKSPACE_DIR" && /usr/bin/node "$SCRIPT_DIR/update-calendar.js" >> "$WORKSPACE_DIR/dinner-automation/logs/calendar.log" 2>&1

EOF

echo "The following cron jobs will be installed:"
echo ""
cat "$TEMP_CRON"
echo ""
echo "========================================"

# Backup existing crontab
crontab -l > "$WORKSPACE_DIR/dinner-automation/data/crontab-backup-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || echo "# No existing crontab" > "$WORKSPACE_DIR/dinner-automation/data/crontab-backup-$(date +%Y%m%d-%H%M%S).txt"

# Install new crontab
echo "Installing crontab..."
crontab "$TEMP_CRON"

if [ $? -eq 0 ]; then
    echo "[OK] Crontab installed successfully!"
    echo ""
    echo "To verify, run: crontab -l"
else
    echo "ERROR: Failed to install crontab"
    rm "$TEMP_CRON"
    exit 1
fi

# Clean up
rm "$TEMP_CRON"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Cron jobs installed:"
echo "  - Main automation (Sundays 9:00 AM)"
echo "  - Email monitor (Hourly 1-9 PM)"
echo "  - Purchase check (Daily 8:45 PM)"
echo "  - Cart monitor (Daily 9:00 PM)"
echo "  - Calendar update (Daily 5:00 PM)"
echo ""
echo "To view scheduled jobs: crontab -l"
echo "To remove all jobs: crontab -r"
echo ""
