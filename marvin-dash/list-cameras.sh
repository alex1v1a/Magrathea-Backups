#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

curl -s -H "Authorization: Bearer $HA_TOKEN" http://localhost:8123/api/states | python3 -c "
import sys, json
states = json.load(sys.stdin)
cameras = [s for s in states if s['entity_id'].startswith('camera.')]
print(f'Found {len(cameras)} cameras:')
for cam in cameras:
    print(f\"  - {cam['entity_id']}: {cam['state']}\")
"
