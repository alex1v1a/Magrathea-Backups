#!/usr/bin/env python3
import json
import uuid
from datetime import datetime, timezone

config_path = '/home/marvin/homeassistant/config/.storage/core.config_entries'

with open(config_path, 'r') as f:
    data = json.load(f)

# Find the entry with nested homekit array
for entry in data['data']['entries']:
    if entry.get('entry_id') == '01KN34DAAM4ER2Y4QD9CV68ZW1':
        nested_bridges = entry['data']['homekit']
        sayville_idx = None
        
        for i, bridge in enumerate(nested_bridges):
            if bridge.get('name') == 'Sayville Home':
                sayville_idx = i
                sayville_bridge = bridge
                break
        
        if sayville_idx is not None:
            # Create new entry
            new_entry_id = '01' + uuid.uuid4().hex.upper()[:24]
            current_time = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + '+00:00'
            
            new_entry = {
                "created_at": current_time,
                "data": {
                    "name": sayville_bridge['name'],
                    "port": sayville_bridge['port'],
                    "ip_address": sayville_bridge['ip_address'],
                    "advertise_ip": sayville_bridge['advertise_ip']
                },
                "disabled_by": None,
                "discovery_keys": {},
                "domain": "homekit",
                "entry_id": new_entry_id,
                "minor_version": 1,
                "modified_at": current_time,
                "options": {
                    "entity_config": sayville_bridge.get('entity_config', {}),
                    "filter": sayville_bridge.get('filter', {}),
                    "mode": "bridge"
                },
                "pref_disable_new_entities": False,
                "pref_disable_polling": False,
                "source": "user",
                "subentries": [],
                "title": f"Sayville Home:{sayville_bridge['port']}",
                "unique_id": None,
                "version": 1
            }
            
            # Add new entry
            data['data']['entries'].append(new_entry)
            
            # Remove Sayville from nested array
            del entry['data']['homekit'][sayville_idx]
            
            print(f"Created new entry: {new_entry_id}")
            print(f"Removed Sayville from nested array")
            
            # Save file
            with open(config_path, 'w') as f:
                json.dump(data, f, indent=2)
            print("File saved successfully")
            break
