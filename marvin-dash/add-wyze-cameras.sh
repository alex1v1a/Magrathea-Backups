#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

# Add go2rtc streams configuration
# First, let's check what cameras are available from wyze-bridge
echo "Fetching camera list from wyze-bridge..."
curl -s http://localhost:5000/api/cameras | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Available cameras:')
for cam in data:
    name = cam.get('name_uri', cam.get('nickname', 'unknown'))
    print(f'  - {name}')
"
