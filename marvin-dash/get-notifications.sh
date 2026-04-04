#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

echo "=== All Persistent Notifications ==="
curl -s -H "Authorization: Bearer $HA_TOKEN" http://localhost:8123/api/states | python3 -c "
import sys, json
states = json.load(sys.stdin)
for s in states:
    if 'persistent_notification' in s['entity_id']:
        print(f\"Entity: {s['entity_id']}\")
        print(f\"State: {s['state']}\")
        attrs = s.get('attributes', {})
        print(f\"Title: {attrs.get('title', 'N/A')}\")
        print(f\"Message: {attrs.get('message', 'N/A')}\")
        print('---')
"
