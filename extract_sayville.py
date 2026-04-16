#!/usr/bin/env python3
import json
import uuid
from datetime import datetime, timezone

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

# Find the entry with nested homekit array
for entry in data['data']['entries']:
    if entry.get('domain') == 'homekit' and 'homekit' in entry.get('data', {}):
        nested_bridges = entry['data']['homekit']
        sayville_bridge = None
        remaining_bridges = []
        
        for bridge in nested_bridges:
            if bridge.get('name') == 'Sayville Home' and bridge.get('port') == 21065:
                sayville_bridge = bridge
            else:
                remaining_bridges.append(bridge)
        
        if sayville_bridge:
            # Create new separate entry for Sayville
            new_entry_id = '01' + uuid.uuid4().hex.upper()[:24]
            current_time = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + '+00:00'
            
            sayville_entry = {
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
            data['data']['entries'].append(sayville_entry)
            print(f"Created new Sayville entry: {new_entry_id}")
            
            # Remove Sayville from nested array
            entry['data']['homekit'] = remaining_bridges
            print(f"Removed Sayville from nested array in {entry['entry_id']}")
        
        break

# Write updated config
with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'w') as f:
    json.dump(data, f, indent=2)

print("Config updated successfully")
