#!/bin/bash
# Home Assistant Health Check Script
# Run this periodically to check system status

LOG_FILE="/home/marvin/homeassistant/config/health_check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting health check..." >> $LOG_FILE

# Check if HA is running
if pgrep -f "homeassistant" > /dev/null; then
    echo "[$DATE] ✅ Home Assistant: RUNNING" >> $LOG_FILE
else
    echo "[$DATE] ❌ Home Assistant: NOT RUNNING" >> $LOG_FILE
fi

# Check HomeKit ports
PORTS=(21063 21064 21065 21066 21067 21068)
for PORT in "${PORTS[@]}"; do
    if ss -tlnp | grep -q ":$PORT "; then
        echo "[$DATE] ✅ HomeKit Port $PORT: LISTENING" >> $LOG_FILE
    else
        echo "[$DATE] ❌ HomeKit Port $PORT: NOT LISTENING" >> $LOG_FILE
    fi
done

# Check mDNS/avahi
if systemctl is-active --quiet avahi-daemon; then
    echo "[$DATE] ✅ Avahi mDNS: RUNNING" >> $LOG_FILE
else
    echo "[$DATE] ❌ Avahi mDNS: NOT RUNNING" >> $LOG_FILE
fi

# Count recent errors
ERROR_COUNT=$(tail -100 /home/marvin/homeassistant/config/home-assistant.log | grep -c "ERROR" || echo "0")
echo "[$DATE] 📊 Recent errors in log: $ERROR_COUNT" >> $LOG_FILE

# Check for unavailable entities (requires HA API access)
# This would need a long-lived access token to work properly

echo "[$DATE] Health check complete" >> $LOG_FILE
echo "---" >> $LOG_FILE
