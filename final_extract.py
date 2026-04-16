#!/usr/bin/env python3
import json
import uuid
from datetime import datetime, timezone

CONFIG_PATH = '/home/marvin/homeassistant/config/.storage/core.config_entries'

# Read current config
with open(CONFIG_PATH, 'r') as f:
    content = f.read()
    data = json.loads(content)

print(f"Before: {len(data['data']['entries'])} entries")

# Find entry with nested homekit
for entry in data['data']['entries']:
    if entry.get('entry_id') == '01KN34DAAM4ER2Y4QD9CV68ZW1':
        nested = entry['data'].get('homekit', [])
        print(f"Found nested array with {len(nested)} bridges")
        
        # Find Sayville
        for i, bridge in enumerate(nested):
            if bridge.get('name') == 'Sayville Home':
                print(f"Found Sayville at index {i}")
                
                # Create new entry
                new_id = '01' + uuid.uuid4().hex.upper()[:24]
                now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + '+00:00'
                
                new_entry = {
                    "created_at": now,
                    "data": {
                        "name": "Sayville Home",
                        "port": 21065,
                        "ip_address": "10.0.1.90",
                        "advertise_ip": ["10.0.1.90"]
                    },
                    "disabled_by": None,
                    "discovery_keys": {},
                    "domain": "homekit",
                    "entry_id": new_id,
                    "minor_version": 1,
                    "modified_at": now,
                    "options": {
                        "entity_config": bridge.get('entity_config', {}),
                        "filter": bridge.get('filter', {}),
                        "mode": "bridge"
                    },
                    "pref_disable_new_entities": False,
                    "pref_disable_polling": False,
                    "source": "user",
                    "subentries": [],
                    "title": "Sayville Home:21065",
                    "unique_id": None,
                    "version": 1
                }
                
                # Add to entries
                data['data']['entries'].append(new_entry)
                print(f"Added new entry: {new_id}")
                
                # Remove from nested
                del entry['data']['homekit'][i]
                print(f"Removed from nested array")
                break
        break

print(f"After: {len(data['data']['entries'])} entries")

# Write back
with open(CONFIG_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print("Config saved")
