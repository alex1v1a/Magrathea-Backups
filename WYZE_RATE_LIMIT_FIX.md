# Wyze API Rate Limiting Fix

## Date Applied: 2026-04-09

## Changes Made:

### 1. Increased Polling Intervals (custom_components/wyzeapi/)
Changed SCAN_INTERVAL from aggressive values to 60 seconds for all platforms:
- lock.py: 10s → 60s
- alarm_control_panel.py: 15s → 60s  
- climate.py: 30s → 60s
- light.py: 30s → 60s
- switch.py: 30s → 60s
- coordinator.py: 300s (unchanged - already reasonable)

### 2. Updated API Credentials (.storage/core.config_entries)
- Added api_key: hKQwoTq0sPelYmpk15XHXRhiqhXVHxWNW3PijpbXK0sH8f9duzp6PUraMZUS
- Added key_id: abc12345-1234-1234-1234-123456789abc
- Modified entry: 01KK8G95CVZ3NXBZBM2QWP3GCJ

### 3. Backup Created
- Original config backed up to: core.config_entries.backup

## Current Setup:
- 25 Wyze devices
- 97 Wyze entities
- All platforms now poll every 60 seconds instead of 10-30 seconds
- This reduces API calls by approximately 50-83%

## Next Steps:
1. Restart Home Assistant to apply changes
2. Monitor logs for 429 errors
3. If issues persist, consider disabling non-essential entities

## Verification Command:
```bash
wsl -d Ubuntu -e bash -c "grep -iE '429|rate.*limit|wyzeapy.*error' /home/marvin/homeassistant/config/home-assistant.log"
```
