#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

curl -s -H "Authorization: Bearer $HA_TOKEN" http://localhost:8123/api/states | \
  python3 -c "
import sys, json
states = json.load(sys.stdin)
for s in states:
    if 'persistent_notification' in s['entity_id']:
        attrs = s.get('attributes', {})
        msg = attrs.get('message', '')
        if 'homekit' in msg.lower() or 'pair' in msg.lower() or 'code' in msg.lower():
            print('=== HomeKit Notification ===')
            print(f\"Title: {attrs.get('title', 'N/A')}\")
            print(f\"Message: {msg}\")
            print()
"

# Also check homekit config entry for the pincode
echo "=== Checking HomeKit config ==="
curl -s -H "Authorization: Bearer $HA_TOKEN" http://localhost:8123/api/config/config_entries/entry | \
  python3 -c "
import sys, json
entries = json.load(sys.stdin)
for e in entries:
    if e.get('domain') == 'homekit':
        print(f\"Entry ID: {e.get('entry_id')}\")
        print(f\"Title: {e.get('title')}\")
        print(f\"Data: {e.get('data', {})}\")
        print(f\"Options: {e.get('options', {})}\")
"
