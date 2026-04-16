#!/usr/bin/env python3
import json

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

# Find entry with nested homekit
for entry in data['data']['entries']:
    if entry.get('domain') == 'homekit' and 'homekit' in entry.get('data', {}):
        print(f"Entry {entry['entry_id']} has nested homekit array")
        print(f"Number of nested bridges: {len(entry['data']['homekit'])}")
        for i, bridge in enumerate(entry['data']['homekit']):
            print(f"  {i}: {bridge.get('name')} (port {bridge.get('port')})")
