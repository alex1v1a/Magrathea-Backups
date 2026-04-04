#!/bin/bash
# Team Hitchhikers Health Check
# Runs every 5 minutes via cron
LOG_FILE="$HOME/team_health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Health check starting..." >> $LOG_FILE

# Check OpenClaw status
if command -v openclaw >/dev/null 2>&1; then
    if openclaw status > /dev/null 2>&1; then
        echo "[$TIMESTAMP] ✅ OpenClaw: RUNNING" >> $LOG_FILE
    else
        echo "[$TIMESTAMP] ❌ OpenClaw: DOWN" >> $LOG_FILE
    fi
else
    echo "[$TIMESTAMP] ⚠️ OpenClaw: NOT INSTALLED" >> $LOG_FILE
fi

# Check SSH mesh connectivity
echo "[$TIMESTAMP] Testing SSH mesh..." >> $LOG_FILE

# Test connections (adjust IPs/usernames as needed)
if ssh -o ConnectTimeout=5 -o BatchMode=yes -i ~/.ssh/marvin_wsl anouk@100.97.122.5 "echo B_OK" > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ✅ SSH → Bistromath: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ❌ SSH → Bistromath: FAIL" >> $LOG_FILE
fi

if ssh -o ConnectTimeout=5 -o BatchMode=yes -i ~/.ssh/marvin_wsl admin@100.91.198.42 "echo DT_OK" > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ✅ SSH → Deep Thought: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ❌ SSH → Deep Thought: FAIL" >> $LOG_FILE
fi

echo "[$TIMESTAMP] Health check complete" >> $LOG_FILE
