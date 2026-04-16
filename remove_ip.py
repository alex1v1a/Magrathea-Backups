#!/usr/bin/env python3
import json

CONFIG_PATH = '/home/marvin/homeassistant/config/.storage/core.config_entries'

with open(CONFIG_PATH, 'r') as f:
    data = json.load(f)

for entry in data['data']['entries']:
    if entry['entry_id'] == '01F35C2A5A9E8D405E9645F2C0':
        # Remove ip_address and advertise_ip to use default binding
        if 'ip_address' in entry['data']:
            del entry['data']['ip_address']
        if 'advertise_ip' in entry['data']:
            del entry['data']['advertise_ip']
        print(f"Removed IP bindings from {entry['entry_id']}")
        print(f"New data keys: {list(entry['data'].keys())}")
        break

with open(CONFIG_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print("Config updated")
