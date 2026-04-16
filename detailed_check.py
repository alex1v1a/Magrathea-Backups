#!/usr/bin/env python3
import json

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

print("All homekit entries:")
for entry in data['data']['entries']:
    if entry.get('domain') == 'homekit':
        print(f"\nEntry ID: {entry['entry_id']}")
        print(f"  Title: {entry.get('title')}")
        print(f"  Port: {entry.get('data', {}).get('port')}")
        if 'homekit' in entry.get('data', {}):
            print(f"  Nested bridges: {[b.get('name') for b in entry['data']['homekit']]}")
        if entry.get('options', {}).get('filter'):
            print(f"  Has options.filter: Yes")
