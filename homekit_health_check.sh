#!/bin/bash
# =============================================================================
# HomeKit Bridge Health Check Script
# Checks all 6 bridges: Austin (2), Sayville (2), Parnell (2)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HA_HOST="10.0.1.90"
HA_PORT="8123"
HA_TOKEN="${HA_TOKEN:-}"  # Set via environment variable

# Bridge configuration (based on HOMEKIT_SUMMARY.md)
declare -A BRIDGES
declare -A BRIDGE_PORTS
declare -A BRIDGE_SUBNETS
declare -A BRIDGE_DEVICES

# Bridge definitions
BRIDGES["austin-lights"]="Austin Lights"
BRIDGE_PORTS["austin-lights"]=21063
BRIDGE_SUBNETS["austin-lights"]="10.0.1"
BRIDGE_DEVICES["austin-lights"]=66

BRIDGES["austin-sensors"]="Austin Sensors"
BRIDGE_PORTS["austin-sensors"]=21064
BRIDGE_SUBNETS["austin-sensors"]="10.0.1"
BRIDGE_DEVICES["austin-sensors"]=236

BRIDGES["sayville-lights"]="Sayville Lights"
BRIDGE_PORTS["sayville-lights"]=21065
BRIDGE_SUBNETS["sayville-lights"]="10.1.1"
BRIDGE_DEVICES["sayville-lights"]=0

BRIDGES["sayville-switches"]="Sayville Switches"
BRIDGE_PORTS["sayville-switches"]=21066
BRIDGE_SUBNETS["sayville-switches"]="10.1.1"
BRIDGE_DEVICES["sayville-switches"]=5

BRIDGES["parnell-lights"]="Parnell Lights"
BRIDGE_PORTS["parnell-lights"]=21067
BRIDGE_SUBNETS["parnell-lights"]="10.2.1"
BRIDGE_DEVICES["parnell-lights"]=0

BRIDGES["parnell-switches"]="Parnell Switches"
BRIDGE_PORTS["parnell-switches"]=21068
BRIDGE_SUBNETS["parnell-switches"]=10.2.1"
BRIDGE_DEVICES["parnell-switches"]=0

# Device limit per bridge (HomeKit limit is 150)
DEVICE_LIMIT=150

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════════════${NC}\n"
}

print_subheader() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

# =============================================================================
# Check 1: Bridge Ports Listening
# =============================================================================

check_bridge_ports() {
    print_header "CHECK 1: Bridge Port Listening Status"
    
    local all_listening=true
    
    for key in "${!BRIDGES[@]}"; do
        local name="${BRIDGES[$key]}"
        local port="${BRIDGE_PORTS[$key]}"
        
        if nc -z "$HA_HOST" "$port" 2>/dev/null; then
            log_success "$name (port $port) - LISTENING"
        else
            log_error "$name (port $port) - NOT LISTENING"
            all_listening=false
        fi
    done
    
    if [ "$all_listening" = true ]; then
        echo -e "\n${GREEN}✓ All bridges are listening on their configured ports${NC}"
    else
        echo -e "\n${RED}✗ Some bridges are not listening. Check HA logs for errors.${NC}"
    fi
    
    return $([ "$all_listening" = true ] && echo 0 || echo 1)
}

# =============================================================================
# Check 2: mDNS Advertising
# =============================================================================

check_mdns_advertising() {
    print_header "CHECK 2: mDNS Advertising Verification"
    
    # Check if avahi-browse is available
    if ! command -v avahi-browse &> /dev/null; then
        log_warning "avahi-browse not found. Installing avahi-utils..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y avahi-utils 2>/dev/null || true
        elif command -v apk &> /dev/null; then
            sudo apk add avahi-tools 2>/dev/null || true
        fi
    fi
    
    if command -v avahi-browse &> /dev/null; then
        print_subheader "Searching for HomeKit bridges via mDNS..."
        
        # Run avahi-browse and filter for HomeKit/Home Assistant
        local mdns_output
        mdns_output=$(timeout 10 avahi-browse -a 2>/dev/null | grep -iE 'homekit|hap|home\s*assistant' || true)
        
        if [ -n "$mdns_output" ]; then
            log_success "Found mDNS advertisements:"
            echo "$mdns_output" | while read -r line; do
                echo "  • $line"
            done
        else
            log_warning "No mDNS advertisements found for HomeKit"
            log_info "This could mean:"
            echo "  - Bridges haven't started yet (wait 30-60 seconds after HA restart)"
            echo "  - mDNS is being blocked by firewall/router"
            echo "  - IGMP snooping is enabled on switch"
        fi
        
        print_subheader "Searching for Austin|Sayville|Parnell specifically..."
        local location_output
        location_output=$(timeout 10 avahi-browse -a 2>/dev/null | grep -iE 'austin|sayville|parnell' || true)
        
        if [ -n "$location_output" ]; then
            log_success "Found location-specific advertisements:"
            echo "$location_output" | while read -r line; do
                echo "  • $line"
            done
        else
            log_warning "No location-specific advertisements found"
        fi
    else
        log_warning "avahi-browse not available. Skipping mDNS check."
        echo "  To enable mDNS checks, install avahi-utils:"
        echo "  sudo apt-get install avahi-utils"
    fi
    
    # Alternative: Check if HA is responding to HomeKit protocol
    print_subheader "Testing HomeKit protocol response..."
    for key in "${!BRIDGES[@]}"; do
        local name="${BRIDGES[$key]}"
        local port="${BRIDGE_PORTS[$key]}"
        
        # Try to connect and get HAP response
        local hap_response
        hap_response=$(timeout 2 bash -c "echo -e 'GET /accessories HTTP/1.1\r\nHost: $HA_HOST:$port\r\n\r\n' | nc $HA_HOST $port" 2>/dev/null | head -1 || true)
        
        if [ -n "$hap_response" ]; then
            log_success "$name responds to HomeKit protocol"
        else
            log_warning "$name not responding to HomeKit protocol (may need pairing)"
        fi
    done
}

# =============================================================================
# Check 3: Bridge HomeKit Response
# =============================================================================

check_homekit_response() {
    print_header "CHECK 3: HomeKit Protocol Response Test"
    
    local responding=0
    local not_responding=0
    
    for key in "${!BRIDGES[@]}"; do
        local name="${BRIDGES[$key]}"
        local port="${BRIDGE_PORTS[$key]}"
        
        # Try to get accessory info
        local response
        response=$(timeout 3 curl -s -o /dev/null -w "%{http_code}" \
            "http://$HA_HOST:$port/accessories" 2>/dev/null || echo "000")
        
        case "$response" in
            200)
                log_success "$name - Responding (HTTP 200)"
                ((responding++))
                ;;
            401|403)
                log_success "$name - Authenticated (HTTP $response - needs pairing)"
                ((responding++))
                ;;
            000)
                log_error "$name - No response (connection failed)"
                ((not_responding++))
                ;;
            *)
                log_warning "$name - Unexpected response (HTTP $response)"
                ;;
        esac
    done
    
    echo -e "\n${BLUE}Summary: $responding responding, $not_responding not responding${NC}"
}

# =============================================================================
# Check 4: Device Counts Per Bridge
# =============================================================================

check_device_counts() {
    print_header "CHECK 4: Device Count Verification"
    
    log_info "HomeKit bridge device limit: $DEVICE_LIMIT devices per bridge"
    echo ""
    
    local over_limit=false
    
    for key in "${!BRIDGES[@]}"; do
        local name="${BRIDGES[$key]}"
        local expected="${BRIDGE_DEVICES[$key]}"
        local port="${BRIDGE_PORTS[$key]}"
        
        # Try to get actual device count from bridge
        local actual_count="unknown"
        if [ -n "$HA_TOKEN" ]; then
            # Query HA API for entity count in this bridge
            actual_count=$(curl -s -H "Authorization: Bearer $HA_TOKEN" \
                "http://$HA_HOST:$HA_PORT/api/config/config_entries/entry" 2>/dev/null | \
                python3 -c "import sys,json; data=json.load(sys.stdin); print(sum(1 for e in data if e.get('domain')=='homekit'))" 2>/dev/null || echo "unknown")
        fi
        
        local count_display="$expected (configured)"
        if [ "$actual_count" != "unknown" ] && [ "$actual_count" != "0" ]; then
            count_display="$actual_count (actual) / $expected (expected)"
        fi
        
        if [ "$expected" -gt "$DEVICE_LIMIT" ]; then
            log_error "$name: $count_display - EXCEEDS LIMIT!"
            over_limit=true
        elif [ "$expected" -gt $((DEVICE_LIMIT * 80 / 100)) ]; then
            log_warning "$name: $count_display - Approaching limit (80%+)"
        else
            log_success "$name: $count_display - Within limit"
        fi
    done
    
    if [ "$over_limit" = true ]; then
        echo -e "\n${RED}✗ Some bridges exceed the 150 device limit!${NC}"
        echo -e "${YELLOW}  Recommendation: Split devices across additional bridges${NC}"
    else
        echo -e "\n${GREEN}✓ All bridges within device limits${NC}"
    fi
}

# =============================================================================
# Check 5: IP-Based Filtering
# =============================================================================

check_ip_filtering() {
    print_header "CHECK 5: IP-Based Filtering Verification"
    
    log_info "Checking bridge IP configurations..."
    echo ""
    
    for key in "${!BRIDGES[@]}"; do
        local name="${BRIDGES[$key]}"
        local subnet="${BRIDGE_SUBNETS[$key]}"
        local port="${BRIDGE_PORTS[$key]}"
        
        # Check if HA is listening on the correct IP
        if ss -tlnp 2>/dev/null | grep -q ":$port"; then
            local actual_ip
            actual_ip=$(ss -tlnp 2>/dev/null | grep ":$port" | awk '{print $4}' | head -1)
            if [[ "$actual_ip" == *"$subnet"* ]]; then
                log_success "$name - Bound to correct subnet ($subnet.x)"
            else
                log_warning "$name - May not be bound to expected subnet ($subnet.x)"
                log_info "  Actual: $actual_ip"
            fi
        else
            log_warning "$name - Cannot verify binding (port not found in ss output)"
        fi
    done
    
    echo -e "\n${BLUE}IP Subnet Configuration:${NC}"
    echo "  • Austin: 10.0.1.x"
    echo "  • Sayville: 10.1.1.x"
    echo "  • Parnell: 10.2.1.x"
    
    # Check if advertise_ip is configured
    print_subheader "Checking advertise_ip configuration..."
    
    if [ -f "/opt/homeassistant/config/homekit.yaml" ]; then
        local advertise_ips
        advertise_ips=$(grep -A 5 "advertise_ip:" /opt/homeassistant/config/homekit.yaml 2>/dev/null | grep "- " | sed 's/^[[:space:]]*-[[:space:]]*//' || true)
        
        if [ -n "$advertise_ips" ]; then
            log_success "advertise_ip is configured:"
            echo "$advertise_ips" | while read -r ip; do
                echo "  • $ip"
            done
        else
            log_warning "advertise_ip not found in configuration"
            echo "  This may cause mDNS discovery issues across subnets"
        fi
    else
        log_warning "homekit.yaml not found at expected location"
    fi
}

# =============================================================================
# Check 6: HA Logs for Errors
# =============================================================================

check_ha_logs() {
    print_header "CHECK 6: Home Assistant Log Analysis"
    
    local log_file="/opt/homeassistant/config/home-assistant.log"
    
    if [ ! -f "$log_file" ]; then
        log_warning "HA log file not found at $log_file"
        log_info "Trying alternate locations..."
        
        # Try to find log file
        log_file=$(find /opt/homeassistant /config /home -name "home-assistant.log" 2>/dev/null | head -1 || true)
        
        if [ -z "$log_file" ]; then
            log_error "Could not find home-assistant.log"
            return 1
        fi
        
        log_info "Found log file: $log_file"
    fi
    
    log_info "Checking for HomeKit errors in last 500 lines..."
    echo ""
    
    # Check for HomeKit errors
    local hk_errors
    hk_errors=$(tail -500 "$log_file" 2>/dev/null | grep -iE "homekit|hap" | grep -iE "error|exception|failed|warning" | tail -20 || true)
    
    if [ -n "$hk_errors" ]; then
        log_warning "Found recent HomeKit-related log entries:"
        echo "$hk_errors" | while read -r line; do
            echo "  $line"
        done
    else
        log_success "No recent HomeKit errors found in logs"
    fi
    
    # Check for specific error patterns
    print_subheader "Checking for specific error patterns..."
    
    local error_patterns=(
        "mDNS"
        "advertise"
        "port.*in.*use"
        "bind.*failed"
        "pairing"
        "accessory"
    )
    
    for pattern in "${error_patterns[@]}"; do
        local count
        count=$(tail -500 "$log_file" 2>/dev/null | grep -icE "$pattern" || echo "0")
        if [ "$count" -gt 0 ]; then
            log_warning "Found $count occurrences of '$pattern'"
        fi
    done
    
    # Check bridge startup messages
    print_subheader "Checking bridge startup status..."
    local startup_msgs
    startup_msgs=$(tail -500 "$log_file" 2>/dev/null | grep -iE "homekit.*bridge.*started|driver.*started" | tail -10 || true)
    
    if [ -n "$startup_msgs" ]; then
        log_success "Found bridge startup messages:"
        echo "$startup_msgs" | while read -r line; do
            echo "  $line"
        done
    else
        log_warning "No recent bridge startup messages found"
    fi
}

# =============================================================================
# Check 7: Network Connectivity
# =============================================================================

check_network() {
    print_header "CHECK 7: Network Connectivity"
    
    # Check if HA host is reachable
    if ping -c 1 -W 2 "$HA_HOST" &> /dev/null; then
        log_success "HA host ($HA_HOST) is reachable"
    else
        log_error "HA host ($HA_HOST) is NOT reachable"
        return 1
    fi
    
    # Check HA web interface
    if curl -s -o /dev/null -w "%{http_code}" "http://$HA_HOST:$HA_PORT" | grep -q "200\|302"; then
        log_success "HA web interface is responding"
    else
        log_error "HA web interface is NOT responding"
    fi
    
    # Check multicast support
    print_subheader "Checking multicast support..."
    if ip route get 224.0.0.251 &> /dev/null; then
        log_success "Multicast routing is available"
    else
        log_warning "Multicast routing may not be available"
    fi
}

# =============================================================================
# Generate Health Report
# =============================================================================

generate_report() {
    print_header "HEALTH CHECK SUMMARY"
    
    local report_file="/tmp/homekit_health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
HomeKit Bridge Health Check Report
Generated: $(date)
HA Host: $HA_HOST

BRIDGE STATUS:
EOF

    for key in "${!BRIDGES[@]}"; do
        local name="${BRIDGES[$key]}"
        local port="${BRIDGE_PORTS[$key]}"
        local devices="${BRIDGE_DEVICES[$key]}"
        
        local status
        if nc -z "$HA_HOST" "$port" 2>/dev/null; then
            status="LISTENING"
        else
            status="NOT LISTENING"
        fi
        
        echo "  $name (port $port): $status - $devices devices" >> "$report_file"
    done
    
    echo "" >> "$report_file"
    echo "RECOMMENDATIONS:" >> "$report_file"
    echo "  1. Ensure all bridges show LISTENING status" >> "$report_file"
    echo "  2. Keep device count under $DEVICE_LIMIT per bridge" >> "$report_file"
    echo "  3. Verify mDNS advertising with: avahi-browse -a | grep -i homekit" >> "$report_file"
    echo "  4. Check HA logs regularly for errors" >> "$report_file"
    
    log_info "Report saved to: $report_file"
    
    # Also copy to workspace
    cp "$report_file" "homekit_health_report.txt" 2>/dev/null || true
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     HomeKit Bridge Health Check                              ║${NC}"
    echo -e "${BLUE}║     Austin | Sayville | Parnell                             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Checking 6 bridges across 3 locations..."
    echo "Timestamp: $(date)"
    echo ""
    
    # Run all checks
    check_network
    check_bridge_ports
    check_mdns_advertising
    check_homekit_response
    check_device_counts
    check_ip_filtering
    check_ha_logs
    generate_report
    
    print_header "Health Check Complete"
    echo -e "${GREEN}✓ Health check finished${NC}"
    echo -e "${BLUE}  Review any warnings/errors above and take corrective action${NC}"
    echo ""
}

# Run main function
main "$@"