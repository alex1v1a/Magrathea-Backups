#!/bin/bash
# Complete Home Assistant Monitoring - Database Queries (No API Token)
# Uses direct SQLite database access

CONFIG_DIR="/home/marvin/homeassistant/config"
LOG_FILE="$CONFIG_DIR/monitoring.log"
ALERT_FILE="$CONFIG_DIR/alerts.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
DB_FILE="$CONFIG_DIR/home-assistant_v2.db"

log() {
    echo "[$DATE] $1" | tee -a $LOG_FILE
}

alert() {
    echo "[$DATE] ALERT: $1" | tee -a $ALERT_FILE
}

# ==================== UNAVAILABLE ENTITIES ====================

log "=== Checking for Unavailable Entities ==="

UNAVAILABLE_COUNT=$(sqlite3 $DB_FILE "SELECT COUNT(*) FROM states s JOIN states_meta sm ON s.metadata_id = sm.metadata_id WHERE s.state = 'unavailable' AND s.last_updated_ts > strftime('%s', 'now', '-1 day');" 2>/dev/null || echo "0")

if [ "$UNAVAILABLE_COUNT" -gt 0 ]; then
    alert "⚠️ Found $UNAVAILABLE_COUNT unavailable entities in last 24 hours"
    
    # List the unavailable entities
    log "Recent unavailable entities:"
    sqlite3 $DB_FILE "SELECT sm.entity_id, datetime(s.last_updated_ts, 'unixepoch') FROM states s JOIN states_meta sm ON s.metadata_id = sm.metadata_id WHERE s.state = 'unavailable' ORDER BY s.last_updated_ts DESC LIMIT 10;" 2>/dev/null | while read line; do
        log "  - $line"
    done
else
    log "✅ No unavailable entities in last 24 hours"
fi

# ==================== DEVICE COUNT BY PLATFORM ====================

log "=== Device Count by Integration ==="

# Get counts from entity registry (JSON parsing)
if [ -f "$CONFIG_DIR/.storage/core.entity_registry" ]; then
    # Use Python for reliable JSON parsing
    python3 << 'PYEOF'
import json
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    data = json.load(f)

from collections import Counter
platforms = Counter()
domains = Counter()

for entity in data.get('data', {}).get('entities', []):
    platforms[entity.get('platform', 'unknown')] += 1
    domains[entity.get('entity_id', '').split('.')[0]] += 1

print("INTEGRATIONS:")
for p, c in platforms.most_common(10):
    print(f"  {p}: {c}")

print("\nDOMAINS:")
for d, c in domains.most_common(10):
    print(f"  {d}: {c}")
PYEOF
fi

# ==================== RECENT STATE CHANGES ====================

log "=== Recent State Changes (Last Hour) ==="

RECENT_CHANGES=$(sqlite3 $DB_FILE "SELECT COUNT(*) FROM states WHERE last_updated_ts > strftime('%s', 'now', '-1 hour');" 2>/dev/null || echo "0")
log "📊 State changes in last hour: $RECENT_CHANGES"

# ==================== DATABASE HEALTH ====================

log "=== Database Health ==="

DB_SIZE=$(du -h $DB_FILE | cut -f1)
log "📊 Database size: $DB_SIZE"

# Check for database corruption
DB_INTEGRITY=$(sqlite3 $DB_FILE "PRAGMA integrity_check;" 2>/dev/null)
if [ "$DB_INTEGRITY" = "ok" ]; then
    log "✅ Database integrity: OK"
else
    alert "❌ Database integrity check failed"
fi

# ==================== HOMEKIT STATUS ====================

log "=== HomeKit Bridge Status ==="

# Count paired HomeKit devices
HOMEKIT_PAIRED=$(ls -1 $CONFIG_DIR/.storage/homekit.*.state 2>/dev/null | wc -l)
log "📊 HomeKit paired devices: $HOMEKIT_PAIRED"

# Check if bridges are listening
for PORT in 21063 21064 21066 21067 21068; do
    if ss -tlnp | grep -q ":$PORT "; then
        log "✅ HomeKit port $PORT: LISTENING"
    else
        alert "❌ HomeKit port $PORT: NOT LISTENING"
    fi
done

# ==================== SYSTEM RESOURCES ====================

log "=== System Resources ==="

# Memory
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
log "📊 Memory usage: ${MEMORY_USAGE}%"

# Disk
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
log "📊 Disk usage: ${DISK_USAGE}%"

# HA Process
if pgrep -f "homeassistant" > /dev/null; then
    HA_PID=$(pgrep -f "homeassistant" | head -1)
    log "✅ HA Process: Running (PID: $HA_PID)"
else
    alert "❌ HA Process: NOT RUNNING"
fi

# ==================== ERROR ANALYSIS ====================

log "=== Recent Error Analysis ==="

if [ -f "$CONFIG_DIR/home-assistant.log" ]; then
    # Count errors by integration
    log "Errors by integration (last 1000 lines):"
    grep "ERROR" $CONFIG_DIR/home-assistant.log 2>/dev/null | tail -1000 | grep -oP '(?<=\[)[^\]]+(?=\])' | sort | uniq -c | sort -rn | head -5 | while read line; do
        log "  $line"
    done
fi

log "=== Monitoring Complete ==="
echo "---" >> $LOG_FILE
