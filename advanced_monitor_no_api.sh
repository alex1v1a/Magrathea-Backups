#!/bin/bash
# Advanced Home Assistant Monitoring - No API Token Required
# Uses alternative methods: logs, database, file parsing

CONFIG_DIR="/home/marvin/homeassistant/config"
LOG_FILE="$CONFIG_DIR/monitoring.log"
ALERT_FILE="$CONFIG_DIR/alerts.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" >> $LOG_FILE
    echo "[$DATE] $1"
}

alert() {
    echo "[$DATE] ALERT: $1" >> $ALERT_FILE
    echo "[$DATE] ALERT: $1"
}

# ==================== ENTITY STATE MONITORING (No API) ====================

log "=== Entity State Analysis (from .storage) ==="

# Parse entity registry for device info
if [ -f "$CONFIG_DIR/.storage/core.entity_registry" ]; then
    # Count entities by domain
    LIGHT_COUNT=$(grep -o '"entity_id": "light\.' $CONFIG_DIR/.storage/core.entity_registry | wc -l)
    SWITCH_COUNT=$(grep -o '"entity_id": "switch\.' $CONFIG_DIR/.storage/core.entity_registry | wc -l)
    SENSOR_COUNT=$(grep -o '"entity_id": "sensor\.' $CONFIG_DIR/.storage/core.entity_registry | wc -l)
    CAMERA_COUNT=$(grep -o '"entity_id": "camera\.' $CONFIG_DIR/.storage/core.entity_registry | wc -l)
    
    log "📊 Entity counts - Lights: $LIGHT_COUNT, Switches: $SWITCH_COUNT, Sensors: $SENSOR_COUNT, Cameras: $CAMERA_COUNT"
    
    # Check for disabled entities
    DISABLED_COUNT=$(grep -c '"disabled_by":' $CONFIG_DIR/.storage/core.entity_registry || echo "0")
    if [ "$DISABLED_COUNT" -gt 0 ]; then
        log "⚠️ Found $DISABLED_COUNT disabled entities"
    fi
fi

# Check device registry for device info
if [ -f "$CONFIG_DIR/.storage/core.device_registry" ]; then
    DEVICE_COUNT=$(grep -o '"id":' $CONFIG_DIR/.storage/core.device_registry | wc -l)
    log "📊 Total devices: $DEVICE_COUNT"
    
    # Check for devices by manufacturer
    TUYA_COUNT=$(grep -c '"manufacturer": "Tuya"' $CONFIG_DIR/.storage/core.device_registry || echo "0")
    GOVEE_COUNT=$(grep -c '"manufacturer": "Govee"' $CONFIG_DIR/.storage/core.device_registry || echo "0")
    WYZE_COUNT=$(grep -c '"manufacturer": "WyzeLabs"' $CONFIG_DIR/.storage/core.device_registry || echo "0")
    SAMSUNG_COUNT=$(grep -c '"manufacturer": "Samsung"' $CONFIG_DIR/.storage/core.device_registry || echo "0")
    
    log "📊 By manufacturer - Tuya: $TUYA_COUNT, Govee: $GOVEE_COUNT, Wyze: $WYZE_COUNT, Samsung: $SAMSUNG_COUNT"
fi

# ==================== LOG ANALYSIS FOR DEVICE ISSUES ====================

log "=== Device Connectivity Analysis (from logs) ==="

# Check for unavailable entities in recent logs
if [ -f "$CONFIG_DIR/home-assistant.log" ]; then
    # Look for unavailable states
    UNAVAILABLE_LOGS=$(tail -1000 $CONFIG_DIR/home-assistant.log | grep -i "unavailable\|disconnected\|connection lost\|failed to connect" | wc -l)
    if [ "$UNAVAILABLE_LOGS" -gt 0 ]; then
        alert "⚠️ Found $UNAVAILABLE_LOGS connectivity issues in recent logs"
        # Show specific entities
        tail -1000 $CONFIG_DIR/home-assistant.log | grep -i "unavailable\|disconnected" | tail -5 >> $ALERT_FILE
    else
        log "✅ No connectivity issues in recent logs"
    fi
    
    # Check for specific integration errors
    TUYA_ERRORS=$(tail -1000 $CONFIG_DIR/home-assistant.log | grep -c "tuya.*error\|tuya.*failed" || echo "0")
    WYZE_ERRORS=$(tail -1000 $CONFIG_DIR/home-assistant.log | grep -c "wyze.*error\|wyze.*failed" || echo "0")
    GOVEE_ERRORS=$(tail -1000 $CONFIG_DIR/home-assistant.log | grep -c "govee.*error\|govee.*failed" || echo "0")
    
    if [ "$TUYA_ERRORS" -gt 0 ]; then
        alert "⚠️ Tuya integration: $TUYA_ERRORS errors"
    fi
    if [ "$WYZE_ERRORS" -gt 0 ]; then
        alert "⚠️ Wyze integration: $WYZE_ERRORS errors"
    fi
    if [ "$GOVEE_ERRORS" -gt 0 ]; then
        alert "⚠️ Govee integration: $GOVEE_ERRORS errors"
    fi
fi

# ==================== HOMEKIT DEVICE COUNT ====================

log "=== HomeKit Device Analysis ==="

# Count HomeKit accessories from state files
if [ -d "$CONFIG_DIR/.storage" ]; then
    HOMEKIT_DEVICES=$(ls -1 $CONFIG_DIR/.storage/homekit.*.iids 2>/dev/null | wc -l)
    log "📊 HomeKit paired devices: $HOMEKIT_DEVICES"
    
    # Check for stale state files
    STALE_STATES=$(find $CONFIG_DIR/.storage -name "homekit.*.state" -mtime +7 2>/dev/null | wc -l)
    if [ "$STALE_STATES" -gt 0 ]; then
        log "⚠️ Found $STALE_STATES stale HomeKit state files (>7 days)"
    fi
fi

# ==================== NETWORK CONNECTIVITY ====================

log "=== Network Device Checks ==="

# Check if common smart home ports are responding
# Tuya devices typically use port 6668
# Wyze cameras use various cloud endpoints

# Check mDNS for device advertisements
MDNS_COUNT=$(avahi-browse -a -t 2>/dev/null | grep -c "_hap._tcp\|_googlecast\|_raop" || echo "0")
log "📊 mDNS advertised devices: $MDNS_COUNT"

# Check for specific device types in mDNS
HAP_DEVICES=$(avahi-browse -a -t 2>/dev/null | grep "_hap._tcp" | wc -l)
GOOGLE_DEVICES=$(avahi-browse -a -t 2>/dev/null | grep "_googlecast" | wc -l)
log "📊 HomeKit accessories: $HAP_DEVICES, Google Cast: $GOOGLE_DEVICES"

# ==================== DATABASE ANALYSIS (if available) ====================

log "=== Database Analysis ==="

# Check if HA database exists and size
if [ -f "$CONFIG_DIR/home-assistant_v2.db" ]; then
    DB_SIZE=$(du -h $CONFIG_DIR/home-assistant_v2.db | cut -f1)
    log "📊 Database size: $DB_SIZE"
    
    # Check database integrity (if sqlite3 available)
    if command -v sqlite3 &> /dev/null; then
        DB_INTEGRITY=$(sqlite3 $CONFIG_DIR/home-assistant_v2.db "PRAGMA integrity_check;" 2>/dev/null || echo "FAILED")
        if [ "$DB_INTEGRITY" = "ok" ]; then
            log "✅ Database integrity: OK"
        else
            alert "❌ Database integrity check failed"
        fi
    fi
fi

# ==================== CONFIGURATION VALIDATION ====================

log "=== Configuration Validation ==="

# Check for YAML syntax errors
if [ -f "$CONFIG_DIR/configuration.yaml" ]; then
    # Basic YAML validation (check for common issues)
    YAML_ERRORS=$(grep -c "\t" $CONFIG_DIR/configuration.yaml || echo "0")
    if [ "$YAML_ERRORS" -gt 0 ]; then
        alert "⚠️ Found tabs in configuration.yaml (should use spaces)"
    fi
    
    # Check for secrets exposure
    SECRET_EXPOSURE=$(grep -E "password:|api_key:|token:" $CONFIG_DIR/configuration.yaml | grep -v "!secret" | wc -l)
    if [ "$SECRET_EXPOSURE" -gt 0 ]; then
        alert "⚠️ Possible secrets exposed in configuration.yaml"
    fi
fi

# Check for missing includes
if [ -f "$CONFIG_DIR/configuration.yaml" ]; then
    for include in $(grep "!include" $CONFIG_DIR/configuration.yaml | sed 's/.*!include //'); do
        if [ ! -f "$CONFIG_DIR/$include" ] && [ ! -d "$CONFIG_DIR/$include" ]; then
            alert "❌ Missing include file: $include"
        fi
    done
fi

# ==================== SUMMARY ====================

log "=== Advanced Monitoring Complete ==="
echo "---" >> $LOG_FILE

# If we have alerts, show summary
if [ -f "$ALERT_FILE" ] && [ $(wc -l < "$ALERT_FILE") -gt 0 ]; then
    RECENT_ALERTS=$(tail -10 $ALERT_FILE)
    echo ""
    echo "⚠️ RECENT ALERTS:"
    echo "$RECENT_ALERTS"
fi
