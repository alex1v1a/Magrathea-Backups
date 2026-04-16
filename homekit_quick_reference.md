# HomeKit Bridge Quick Reference Guide

## Quick Commands

### Check Bridge Ports
```bash
# Linux/WSL
for port in 21063 21064 21065 21066 21067 21068; do
  echo "Port $port: $(nc -z 10.0.1.90 $port && echo 'OPEN' || echo 'CLOSED')"
done

# Windows PowerShell
21063,21064,21065,21066,21067,21068 | ForEach-Object { 
  $result = (Test-NetConnection -ComputerName 10.0.1.90 -Port $_ -WarningAction SilentlyContinue).TcpTestSucceeded
  Write-Host "Port $_`: $(if($result){'OPEN'}else{'CLOSED'})" 
}
```

### Check mDNS Advertising
```bash
# Requires avahi-utils
avahi-browse -a | grep -E 'Austin|Sayville|Parnell|homekit|hap'

# Alternative - check for HAP (HomeKit Accessory Protocol)
avahi-browse -a | grep -i hap
```

### Test HomeKit Response
```bash
# Test each bridge
curl -s -o /dev/null -w "%{http_code}" http://10.0.1.90:21063/accessories
curl -s -o /dev/null -w "%{http_code}" http://10.0.1.90:21064/accessories
curl -s -o /dev/null -w "%{http_code}" http://10.0.1.90:21065/accessories
curl -s -o /dev/null -w "%{http_code}" http://10.0.1.90:21066/accessories
curl -s -o /dev/null -w "%{http_code}" http://10.0.1.90:21067/accessories
curl -s -o /dev/null -w "%{http_code}" http://10.0.1.90:21068/accessories
```

### Check HA Logs for HomeKit
```bash
# Recent HomeKit errors
tail -500 /opt/homeassistant/config/home-assistant.log | grep -iE "homekit|hap" | grep -iE "error|exception|failed"

# Bridge startup messages
tail -100 /opt/homeassistant/config/home-assistant.log | grep -iE "homekit.*bridge.*started"
```

### Restart HomeKit
```bash
# Via HA API (requires token)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  http://10.0.1.90:8123/api/services/homekit/restart

# Or restart entire HA
ha core restart
```

## Bridge Configuration

### Current Setup
| Bridge | Port | Expected Devices | Limit Status |
|--------|------|------------------|--------------|
| Austin Lights | 21063 | 66 | ✅ OK |
| Austin Sensors | 21064 | 236 | ❌ EXCEEDS 150! |
| Sayville Lights | 21065 | 0 | ✅ OK |
| Sayville Switches | 21066 | 5 | ✅ OK |
| Parnell Lights | 21067 | 0 | ✅ OK |
| Parnell Switches | 21068 | 0 | ✅ OK |

### Critical Issue: Austin Sensors
The Austin Sensors bridge has **236 devices**, exceeding HomeKit's **150 device limit**.

**Fix Required:**
Split into two bridges:
```yaml
homekit:
  # Bridge 1: Austin Sensors A (first 150)
  - name: "Austin Sensors A"
    port: 21064
    ip_address: 10.0.1.90
    filter:
      include_domains:
        - sensor
        - binary_sensor
      # Include first 150 sensors
      include_entities:
        - sensor.sensor_1
        # ... through sensor_150

  # Bridge 2: Austin Sensors B (remaining 86)
  - name: "Austin Sensors B"
    port: 21069
    ip_address: 10.0.1.90
    filter:
      include_domains:
        - sensor
        - binary_sensor
      # Include remaining sensors
      include_entities:
        - sensor.sensor_151
        # ... through sensor_236
```

## Running Health Checks

### Full Health Check (Recommended)
```bash
# SSH into HA host first
ssh root@10.0.1.90

# Download and run script
curl -O https://raw.githubusercontent.com/yourrepo/homekit_health_check.sh
chmod +x homekit_health_check.sh
./homekit_health_check.sh
```

### Windows PowerShell
```powershell
# Run from Windows machine
.\homekit_health_check.ps1 -HAHost "10.0.1.90" -HAToken "your_token"
```

### Scheduled Checks
```bash
# Add to crontab (run every 6 hours)
0 */6 * * * /path/to/homekit_health_check.sh >> /var/log/homekit_health.log 2>&1
```

## Troubleshooting

### Bridge Not Responding
1. Check if port is listening: `nc -z 10.0.1.90 PORT`
2. Check HA logs for errors
3. Restart HomeKit integration
4. Delete `.homekit.state` files if corrupted

### mDNS Not Advertising
1. Check avahi-daemon is running: `systemctl status avahi-daemon`
2. Disable IGMP snooping on router/switch
3. Verify `advertise_ip` is configured in homekit.yaml
4. Check firewall rules for multicast (224.0.0.251)

### Device Shows "No Response" in iOS
1. Check device is still in HA (not deleted)
2. Verify bridge has < 150 devices
3. Restart HomeKit bridge
4. Re-pair bridge in iOS Home app

## Configuration Files

| File | Purpose |
|------|---------|
| `/opt/homeassistant/config/homekit.yaml` | Active HomeKit configuration |
| `/opt/homeassistant/config/home-assistant.log` | HA logs |
| `/opt/homeassistant/config/.storage/homekit.*.state` | Pairing state files |
| `homekit_health_check.sh` | Bash health check script |
| `homekit_health_check.ps1` | PowerShell health check script |

## Network Requirements

- **Multicast**: Must allow 224.0.0.251 (mDNS)
- **Ports**: 21063-21068 must be open
- **Static IP**: HA should have reserved IP (10.0.1.90)
- **IGMP Snooping**: Should be disabled for mDNS to work across subnets

---

*Last Updated: April 11, 2026*
