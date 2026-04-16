#!/usr/bin/env python3
import json

# Read the config file
with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.loads(f.read())

# Find and update the Sayville entry
for entry in data['data']['entries']:
    if entry.get('domain') == 'homekit' and entry.get('data', {}).get('port') == 21065:
        # Move filter from data to options where HomeKit expects it
        entry['options'] = {
            'entity_config': entry['data'].get('entity_config', {}),
            'filter': entry['data'].get('filter', {}),
            'mode': 'bridge'
        }
        # Remove filter and entity_config from data (keep only port, name, ip_address, advertise_ip)
        entry['data'] = {
            'name': entry['data']['name'],
            'port': entry['data']['port'],
            'ip_address': entry['data']['ip_address'],
            'advertise_ip': entry['data']['advertise_ip']
        }
        print(f"Fixed entry {entry['entry_id']} - moved filter to options")
        break

# Write the updated config
with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'w') as f:
    json.dump(data, f, indent=2)

print("Sayville bridge config fixed")
