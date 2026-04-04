#!/bin/bash
cat /opt/homeassistant/config/.storage/core.config_entries | python3 -c "
import sys, json
data = json.load(sys.stdin)
entries = data.get('data', {}).get('entries', [])
for e in entries:
    if e.get('domain') == 'homekit':
        print('=== HomeKit Entry ===')
        print(json.dumps(e, indent=2))
"
