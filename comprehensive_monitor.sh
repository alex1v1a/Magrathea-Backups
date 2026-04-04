#!/bin/bash
# Comprehensive Home Assistant Monitoring Script
# This script monitors HA, HomeKit, and connected devices
# Run via cron every 15 minutes

CONFIG_DIR="/home/marvin/homeassistant/config"
LOG_FILE="$CONFIG_DIR/monitoring.log"
ALERT_FILE="$CONFIG_DIR/alerts.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output (when run interactively)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$DATE] $1" >> $LOG_FILE
    echo "[$DATE] $1"
}

alert() {
    echo "[$DATE] ALERT: $1" >> $ALERT_FILE
    echo "[$DATE] ALERT: $1"
}

# ==================== CHECKS ====================

# 1. Check Home Assistant Process
log "=== Home Assistant Process Check ==="
if pgrep -f "homeassistant" > /dev/null; then
    HA_PID=$(pgrep -f "homeassistant" | head -1)
    HA_UPTIME=$(ps -o etime= -p $HA_PID 2>/dev/null || echo "unknown")
    log "✅ HA Running (PID: $HA_PID, Uptime: $HA_UPTIME)"
else
    alert "❌ Home Assistant NOT RUNNING"
fi

# 2. Check HomeKit Bridges
log "=== HomeKit Bridge Check ==="
HOMEKIT_PORTS=(21063 21064 21066 21067 21068)
for PORT in "${HOMEKIT_PORTS[@]}"; do
    if ss -tlnp | grep -q ":$PORT "; then
        log "✅ HomeKit Port $PORT: LISTENING"
    else
        alert "❌ HomeKit Port $PORT: NOT LISTENING"
    fi
done

# 3. Check mDNS/Avahi
log "=== mDNS Service Check ==="
if systemctl is-active --quiet avahi-daemon; then
    log "✅ Avahi mDNS: RUNNING"
else
    alert "❌ Avahi mDNS: NOT RUNNING - Attempting restart..."
    sudo systemctl restart avahi-daemon
fi

# 4. Check HA API (requires token - will fail without it)
log "=== HA API Check ==="
if [ -f "$CONFIG_DIR/.ha_api_token" ]; then
    TOKEN=$(cat $CONFIG_DIR/.ha_api_token)
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        http://localhost:8123/api/)
    if [ "$API_STATUS" = "200" ]; then
        log "✅ HA API: RESPONDING"
        
        # Get entity counts
        ENTITY_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" \
            http://localhost:8123/api/states | grep -o '"entity_id"' | wc -l)
        log "📊 Total entities: $ENTITY_COUNT"
        
        # Check for unavailable entities
        UNAVAILABLE=$(curl -s -H "Authorization: Bearer $TOKEN" \
            http://localhost:8123/api/states | grep -c '"state": "unavailable"' || echo "0")
        if [ "$UNAVAILABLE" -gt 0 ]; then
            alert "⚠️ $UNAVAILABLE entities are UNAVAILABLE"
        fi
    else
        alert "❌ HA API: NOT RESPONDING (HTTP $API_STATUS)"
    fi
else
    log "⚠️ HA API Token not configured - skipping API checks"
    log "   To enable: Create $CONFIG_DIR/.ha_api_token with your Long-Lived Access Token"
fi

# 5. Check Recent Errors
log "=== Recent Error Check ==="
ERROR_COUNT=$(tail -100 $CONFIG_DIR/home-assistant.log 2>/dev/null | grep -c "ERROR" || echo "0")
WARNING_COUNT=$(tail -100 $CONFIG_DIR/home-assistant.log 2>/dev/null | grep -c "WARNING" || echo "0")
log "📊 Recent errors: $ERROR_COUNT, warnings: $WARNING_COUNT"

if [ "$ERROR_COUNT" -gt 10 ]; then
    alert "⚠️ High error count: $ERROR_COUNT errors in last 100 log lines"
fi

# 6. Check Disk Space
log "=== Disk Space Check ==="
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    alert "⚠️ Disk space critical: ${DISK_USAGE}% used"
else
    log "✅ Disk space: ${DISK_USAGE}% used"
fi

# 7. Check Memory
log "=== Memory Check ==="
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    alert "⚠️ Memory usage critical: ${MEMORY_USAGE}%"
else
    log "✅ Memory usage: ${MEMORY_USAGE}%"
fi

# 8. Check WSL Status (if applicable)
log "=== WSL Status Check ==="
if [ -f /proc/sys/kernel/osrelease ]; then
    log "✅ WSL Environment detected"
fi

# ==================== SUMMARY ====================
log "=== Monitoring Check Complete ==="
echo "---" >> $LOG_FILE
