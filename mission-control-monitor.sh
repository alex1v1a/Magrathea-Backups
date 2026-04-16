#!/bin/bash
# Mission Control Health Monitor
# Checks backend API health and logs status
# Runs via cron every 5 minutes

LOG_FILE="/var/log/mission-control-health.log"
API_URL="http://10.0.1.90:8080/health"
ALERT_THRESHOLD=3
CONSECUTIVE_FAILURES=0

# Check if log file exists, create if not
if [ ! -f "$LOG_FILE" ]; then
    touch "$LOG_FILE"
fi

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check API health
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null)

if [ "$HEALTH_STATUS" = "200" ]; then
    log_message "OK - Mission Control backend responding (HTTP 200)"
    CONSECUTIVE_FAILURES=0
else
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    log_message "ERROR - Mission Control backend not responding (HTTP: $HEALTH_STATUS, Failures: $CONSECUTIVE_FAILURES)"
    
    # Alert if threshold reached
    if [ "$CONSECUTIVE_FAILURES" -ge "$ALERT_THRESHOLD" ]; then
        log_message "ALERT - Mission Control down for $CONSECUTIVE_FAILURES consecutive checks"
        # Could add notification here (Discord, email, etc.)
    fi
fi

# Rotate log if too large (>10MB)
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt 10485760 ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    touch "$LOG_FILE"
    log_message "Log rotated"
fi