#!/bin/bash
# Setup automated team health monitoring
# Run this on Deep Thought to monitor all team members

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/team-health-monitor.sh"
LOG_FILE="/tmp/team-health-monitor.log"

echo "Setting up Team Health Monitor..."

# Make script executable
chmod +x "$MONITOR_SCRIPT"

# Add to crontab (run every 5 minutes)
CRON_JOB="*/5 * * * * $MONITOR_SCRIPT >> $LOG_FILE 2>&1"

# Check if already in crontab
if crontab -l 2>/dev/null | grep -q "team-health-monitor"; then
    echo "Health monitor already in crontab. Updating..."
    crontab -l 2>/dev/null | grep -v "team-health-monitor" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Team Health Monitor installed!"
echo "   - Runs every 5 minutes"
echo "   - Log file: $LOG_FILE"
echo "   - Script: $MONITOR_SCRIPT"
echo ""
echo "To check status: tail -f $LOG_FILE"
echo "To disable: crontab -e and remove the team-health-monitor line"
