#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

curl -s -H "Authorization: Bearer $HA_TOKEN" http://localhost:8123/api/states | \
  python3 -c "
import sys, json
states = json.load(sys.stdin)
govee = [s for s in states if 'govee' in s['entity_id'].lower()]
if govee:
    for e in govee:
        print(f\"{e['entity_id']}: {e['state']} ({e['attributes'].get('friendly_name', 'N/A')})\")
else:
    print('No Govee entities yet - may take a moment to discover devices')
"
