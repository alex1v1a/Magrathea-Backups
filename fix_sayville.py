#!/usr/bin/env python3
import json
import re
from datetime import datetime, timezone

# Read the config file
with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    content = f.read()
    data = json.loads(content)

# Generate a new entry ID (format similar to existing ones)
import uuid
new_entry_id = '01' + uuid.uuid4().hex.upper()[:24]

# Current timestamp
current_time = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + '+00:00'

# Create the Sayville Home config entry
sayville_entry = {
    "created_at": current_time,
    "data": {
        "advertise_ip": ["10.0.1.90"],
        "entity_config": {
            "switch.anouk_server_socket_1": {"name": "Anouk Server"},
            "switch.cyn_pia_switch_socket_1": {"name": "Cyn & Pia Switch"},
            "switch.hanka_9_server_socket_1": {"name": "HANKA Server"},
            "switch.marcs_bathroom_heated_floor_socket_1": {"name": "Marc's Heated Floor"},
            "switch.marcs_room_fridge_lamp_socket_1": {"name": "Marc's Lamp"}
        },
        "filter": {
            "exclude_domains": [],
            "exclude_entities": [],
            "exclude_entity_globs": [],
            "include_domains": ["switch", "scene"],
            "include_entities": [
                "switch.anouk_server_socket_1",
                "switch.cyn_pia_switch_socket_1",
                "switch.hanka_9_server_socket_1",
                "switch.marcs_bathroom_heated_floor_socket_1",
                "switch.marcs_room_fridge_lamp_socket_1",
                "scene.driveway_pump_off_cyn_pia_switch_off"
            ],
            "include_entity_globs": []
        },
        "ip_address": "10.0.1.90",
        "name": "Sayville Home",
        "port": 21065
    },
    "disabled_by": None,
    "discovery_keys": {},
    "domain": "homekit",
    "entry_id": new_entry_id,
    "minor_version": 1,
    "modified_at": current_time,
    "options": {
        "entity_config": {},
        "filter": {
            "exclude_domains": [],
            "exclude_entities": [],
            "exclude_entity_globs": [],
            "include_domains": [],
            "include_entities": [],
            "include_entity_globs": []
        },
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

# Add the new entry to the entries array
data['data']['entries'].append(sayville_entry)

# Write the updated config
with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'w') as f:
    json.dump(data, f, indent=2)

print(f"Created new Sayville Home config entry with ID: {new_entry_id}")
print("Sayville bridge configured on port 21065")
