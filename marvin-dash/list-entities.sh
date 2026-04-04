#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

curl -s -H "Authorization: Bearer $HA_TOKEN" http://localhost:8123/api/states | \
  python3 -c "
import sys, json
states = json.load(sys.stdin)
# Look for light and switch entities
relevant = [s for s in states if s['entity_id'].startswith(('light.', 'switch.'))]
for e in relevant:
    print(f\"{e['entity_id']}: {e['state']} ({e['attributes'].get('friendly_name', 'N/A')})\")
"
