#!/bin/bash
# WSL Keep-Alive Script
# Run inside WSL Ubuntu to keep it active and restart services if needed

LOG_FILE="/var/log/wsl-keepalive.log"
PID_FILE="/var/run/wsl-keepalive.pid"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create log directory if needed
sudo mkdir -p /var/log
sudo touch "$LOG_FILE"
sudo chmod 644 "$LOG_FILE"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        log "Keep-alive already running (PID: $OLD_PID)"
        exit 0
    fi
fi

echo $$ > "$PID_FILE"

log "=== WSL Keep-Alive Started ==="
log "PID: $$"

# Function to check and restart services
check_services() {
    # Check Docker
    if ! pgrep -x "dockerd" > /dev/null; then
        log "Docker not running, starting..."
        sudo service docker start 2>&1 || sudo dockerd > /dev/null 2>&1 &
    fi
    
    # Check Home Assistant container
    if command -v docker > /dev/null 2>&1; then
        if ! docker ps --format "{{.Names}}" | grep -q "^homeassistant$"; then
            log "Home Assistant container not running, attempting restart..."
            
            # Check if container exists
            if docker ps -a --format "{{.Names}}" | grep -q "^homeassistant$"; then
                docker start homeassistant 2>&1 || log "Failed to start homeassistant container"
            else
                log "Home Assistant container does not exist, skipping"
            fi
        fi
    fi
    
    # Check Wyze Bridge
    if command -v docker > /dev/null 2>&1; then
        if ! docker ps --format "{{.Names}}" | grep -q "wyze-bridge"; then
            log "Wyze Bridge not running, attempting restart..."
            
            if docker ps -a --format "{{.Names}}" | grep -q "wyze-bridge"; then
                docker start wyze-bridge 2>&1 || log "Failed to start wyze-bridge container"
            fi
        fi
    fi
}

# Keep-alive loop
while true; do
    # Touch a file to keep WSL alive
    touch /tmp/wsl-alive
    
    # Check and restart critical services
    check_services
    
    # Sleep for 1 minute
    sleep 60
done
