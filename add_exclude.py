#!/usr/bin/env python3
import json

CONFIG_PATH = '/home/marvin/homeassistant/config/.storage/core.config_entries'

with open(CONFIG_PATH, 'r') as f:
    data = json.load(f)

for entry in data['data']['entries']:
    if entry['entry_id'] == '01F35C2A5A9E8D405E9645F2C0':
        entry['data']['exclude_accessory_mode'] = True
        print(f"Added exclude_accessory_mode to {entry['entry_id']}")
        break

with open(CONFIG_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print("Config updated")
