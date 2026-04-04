# OpenClaw Gateway Recovery - WSL/Linux Version
# This script monitors and fixes OpenClaw gateway issues from WSL
# Can be run via cron on WSL

LOG_FILE="$HOME/.openclaw/logs/gateway-recovery-wsl.log"
MAX_RETRIES=3
RETRY_DELAY=10

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

test_gateway_health() {
    if curl -s --max-time 5 http://127.0.0.1:18789/status > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

test_browser_health() {
    # Check CDP endpoint and verify we can list targets
    if curl -s --max-time 3 http://127.0.0.1:18800/json/version > /dev/null 2>&1; then
        # Additional check: verify we can get a list of targets/tabs
        if curl -s --max-time 3 http://127.0.0.1:18800/json/list > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

reset_browser_profile() {
    log "WARN" "Resetting OpenClaw browser profile..."
    
    # Kill Chrome processes
    cmd.exe /c 'taskkill /F /IM chrome.exe 2>nul' > /dev/null 2>&1
    
    sleep 2
    
    # Remove user data directory
    USER_DATA_DIR="$HOME/.openclaw/browser/openclaw/user-data"
    if [ -d "$USER_DATA_DIR" ]; then
        rm -rf "$USER_DATA_DIR"
        log "INFO" "Browser profile directory removed"
    fi
    
    # Remove lock files
    find "$HOME/.openclaw/browser" -name "SingletonLock" -delete 2>/dev/null
    
    log "SUCCESS" "Browser profile reset complete"
    return 0
}

restart_gateway() {
    log "INFO" "Attempting to restart OpenClaw gateway..."
    
    # Try using PowerShell through Windows
    if cmd.exe /c "openclaw gateway start" > /dev/null 2>&1; then
        sleep 5
        if test_gateway_health; then
            log "SUCCESS" "Gateway restarted successfully"
            return 0
        fi
    fi
    
    # Try using Task Scheduler
    if cmd.exe /c "schtasks /Run /TN \"OpenClaw Gateway\"" > /dev/null 2>&1; then
        sleep 5
        if test_gateway_health; then
            log "SUCCESS" "Gateway started via Task Scheduler"
            return 0
        fi
    fi
    
    log "ERROR" "Failed to restart gateway"
    return 1
}

repair_gateway() {
    log "WARN" "Performing full gateway repair..."
    
    # Kill stuck processes through Windows
    cmd.exe /c 'taskkill /F /IM node.exe /FI "COMMANDLINE eq *openclaw*" 2>nul' > /dev/null 2>&1
    cmd.exe /c 'taskkill /F /IM chrome.exe /FI "COMMANDLINE eq *openclaw*" 2>nul' > /dev/null 2>&1
    
    sleep 2
    
    # Try starting again
    restart_gateway
}

repair_browser() {
    log "WARN" "Attempting browser repair with profile reset..."
    
    # Reset the browser profile
    reset_browser_profile
    
    # Wait for cleanup
    sleep 3
    
    # Test if browser is now healthy
    if test_browser_health; then
        log "SUCCESS" "Browser is now healthy after profile reset"
        return 0
    fi
    
    log "ERROR" "Browser still not responding after profile reset"
    return 1
}

# Main execution
log "INFO" "=== OpenClaw Gateway Recovery Check Started ==="

gateway_success=false
browser_success=false
attempt=0

# Check and repair gateway
while [ $attempt -lt $MAX_RETRIES ] && [ "$gateway_success" = false ]; do
    attempt=$((attempt + 1))
    log "INFO" "Gateway recovery attempt $attempt of $MAX_RETRIES..."
    
    if test_gateway_health; then
        log "SUCCESS" "Gateway is healthy and responding"
        gateway_success=true
        break
    fi
    
    log "WARN" "Gateway not responding, attempting recovery..."
    
    if [ $attempt -eq 1 ]; then
        restart_gateway && gateway_success=true
    else
        repair_gateway && gateway_success=true
    fi
    
    if [ "$gateway_success" = false ] && [ $attempt -lt $MAX_RETRIES ]; then
        log "INFO" "Waiting $RETRY_DELAY seconds before retry..."
        sleep $RETRY_DELAY
    fi
done

# Check and repair browser if gateway is up
if [ "$gateway_success" = true ]; then
    log "INFO" "Checking browser health..."
    
    if test_browser_health; then
        log "SUCCESS" "Browser is healthy and responding"
        browser_success=true
    else
        log "WARN" "Browser not responding, attempting profile reset..."
        repair_browser
        browser_success=true  # Don't fail overall if browser repair fails
    fi
fi

# Final status
if [ "$gateway_success" = true ] && [ "$browser_success" = true ]; then
    log "SUCCESS" "OpenClaw gateway and browser are now operational"
    exit 0
elif [ "$gateway_success" = true ]; then
    log "SUCCESS" "Gateway is operational (browser may need manual attention)"
    exit 0
else
    log "ERROR" "Failed to recover gateway after $MAX_RETRIES attempts"
    log "ERROR" "Manual intervention may be required"
    exit 1
fi
