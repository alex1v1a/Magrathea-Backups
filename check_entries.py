#!/usr/bin/env python3
import json

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

print("HomeKit entries:")
for entry in data['data']['entries']:
    if entry.get('domain') == 'homekit':
        print(f"  - {entry['entry_id']}: {entry.get('title', 'N/A')} (port: {entry.get('data', {}).get('port', 'N/A')})")
        if 'homekit' in entry.get('data', {}):
            print(f"    Has nested homekit array with {len(entry['data']['homekit'])} bridges")

print("\nSayville entries:")
for entry in data['data']['entries']:
    if 'Sayville' in str(entry):
        print(f"  - {entry['entry_id']}")
        print(f"    data keys: {list(entry.get('data', {}).keys())}")
