#!/bin/bash
# API-Enabled Home Assistant Monitoring
# Uses credentials from secrets.yaml and .storage

CONFIG_DIR="/home/marvin/homeassistant/config"
LOG_FILE="$CONFIG_DIR/api_monitoring.log"
ALERT_FILE="$CONFIG_DIR/api_alerts.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Load secrets
GOVEE_API_KEY=$(grep "govee_api_key:" $CONFIG_DIR/secrets.yaml | awk '{print $2}')
TUYA_USERNAME=$(grep "tuya_username:" $CONFIG_DIR/secrets.yaml | cut -d'"' -f2)
TUYA_PASSWORD=$(grep "tuya_password:" $CONFIG_DIR/secrets.yaml | cut -d'"' -f2)
OPENWEATHER_API_KEY=$(grep "openweathermap_api_key:" $CONFIG_DIR/secrets.yaml | cut -d'"' -f2)

log() {
    echo "[$DATE] $1" | tee -a $LOG_FILE
}

alert() {
    echo "[$DATE] ALERT: $1" | tee -a $ALERT_FILE
}

# ==================== GOVEE API CHECK ====================

log "=== Govee API Check ==="

if [ -n "$GOVEE_API_KEY" ]; then
    GOVEE_RESPONSE=$(curl -s -X GET "https://developer-api.govee.com/v1/devices" \
        -H "Govee-API-Key: $GOVEE_API_KEY" \
        -H "Content-Type: application/json" 2>/dev/null)
    
    if echo "$GOVEE_RESPONSE" | grep -q "device"; then
        DEVICE_COUNT=$(echo "$GOVEE_RESPONSE" | grep -o '"device"' | wc -l)
        log "✅ Govee API: Connected ($DEVICE_COUNT devices)"
    else
        alert "❌ Govee API: Connection failed"
    fi
else
    log "⚠️ Govee API Key not found"
fi

# ==================== TUYA CLOUD API CHECK ====================

log "=== Tuya Cloud API Check ==="

# Extract Tuya credentials from .storage
TUYA_ACCESS_TOKEN=$(grep -o '"access_token": "[^"]*"' $CONFIG_DIR/.storage/core.config_entries | grep -v "refresh_token" | head -1 | cut -d'"' -f4)
TUYA_ENDPOINT="https://openapi.tuyaus.com"

if [ -n "$TUYA_ACCESS_TOKEN" ]; then
    # Try to get device list from Tuya API
    TUYA_RESPONSE=$(curl -s -X GET "$TUYA_ENDPOINT/v1.0/users/az155674097609532q7P/devices" \
        -H "access_token: $TUYA_ACCESS_TOKEN" 2>/dev/null)
    
    if echo "$TUYA_RESPONSE" | grep -q "success"; then
        TUYA_DEVICE_COUNT=$(echo "$TUYA_RESPONSE" | grep -o '"id"' | wc -l)
        log "✅ Tuya API: Connected ($TUYA_DEVICE_COUNT devices)"
    else
        alert "⚠️ Tuya API: Token may be expired"
    fi
else
    log "⚠️ Tuya access token not found"
fi

# ==================== OPENWEATHERMAP API CHECK ====================

log "=== OpenWeatherMap API Check ==="

if [ -n "$OPENWEATHER_API_KEY" ]; then
    WEATHER_RESPONSE=$(curl -s "https://api.openweathermap.org/data/2.5/weather?lat=30.0993&lon=-97.8578&appid=$OPENWEATHER_API_KEY&units=imperial" 2>/dev/null)
    
    if echo "$WEATHER_RESPONSE" | grep -q "weather"; then
        TEMP=$(echo "$WEATHER_RESPONSE" | grep -o '"temp":[0-9.]*' | head -1 | cut -d':' -f2)
        log "✅ OpenWeatherMap API: Connected (Current temp: ${TEMP}°F)"
    else
        alert "❌ OpenWeatherMap API: Connection failed"
    fi
else
    log "⚠️ OpenWeatherMap API Key not found"
fi

# ==================== HOME ASSISTANT API (Using Long-Lived Token if exists) ====================

log "=== Home Assistant API Check ==="

if [ -f "$CONFIG_DIR/.ha_api_token" ]; then
    HA_TOKEN=$(cat $CONFIG_DIR/.ha_api_token)
    HA_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $HA_TOKEN" \
        -H "Content-Type: application/json" \
        http://localhost:8123/api/)
    
    if [ "$HA_RESPONSE" = "200" ]; then
        log "✅ Home Assistant API: Connected"
        
        # Get entity states
        ENTITY_COUNT=$(curl -s -H "Authorization: Bearer $HA_TOKEN" \
            http://localhost:8123/api/states | grep -o '"entity_id"' | wc -l)
        log "📊 Total entities: $ENTITY_COUNT"
    else
        alert "❌ Home Assistant API: HTTP $HA_RESPONSE"
    fi
else
    log "⚠️ HA API Token not configured"
fi

# ==================== DATABASE CHECK (Unavailable Entities) ====================

log "=== Database Unavailable Check ==="

DB_FILE="$CONFIG_DIR/home-assistant_v2.db"
if [ -f "$DB_FILE" ]; then
    UNAVAILABLE_COUNT=$(sqlite3 $DB_FILE "SELECT COUNT(*) FROM states s JOIN states_meta sm ON s.metadata_id = sm.metadata_id WHERE s.state = 'unavailable' AND s.last_updated_ts > strftime('%s', 'now', '-1 day');" 2>/dev/null || echo "0")
    
    if [ "$UNAVAILABLE_COUNT" -gt 0 ]; then
        alert "⚠️ $UNAVAILABLE_COUNT entities unavailable in last 24h"
        
        # List top 5
        sqlite3 $DB_FILE "SELECT sm.entity_id, datetime(s.last_updated_ts, 'unixepoch') FROM states s JOIN states_meta sm ON s.metadata_id = sm.metadata_id WHERE s.state = 'unavailable' ORDER BY s.last_updated_ts DESC LIMIT 5;" 2>/dev/null | while read line; do
            log "  - $line"
        done
    else
        log "✅ No unavailable entities in last 24h"
    fi
fi

# ==================== SYSTEM HEALTH ====================

log "=== System Health ==="

# Check HA process
if pgrep -f "homeassistant" > /dev/null; then
    HA_PID=$(pgrep -f "homeassistant" | head -1)
    log "✅ HA Process: Running (PID: $HA_PID)"
else
    alert "❌ HA Process: NOT RUNNING"
fi

# Check HomeKit ports
for PORT in 21063 21064 21066 21067 21068; do
    if ss -tlnp | grep -q ":$PORT "; then
        log "✅ HomeKit Port $PORT: LISTENING"
    else
        alert "❌ HomeKit Port $PORT: NOT LISTENING"
    fi
done

# Check resources
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
log "📊 Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%"

log "=== API Monitoring Complete ==="
echo "---" >> $LOG_FILE
