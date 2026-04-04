import json
import sys

config_path = '/home/marvin/homeassistant/config/.storage/core.config_entries'

with open(config_path) as f:
    config = json.load(f)

# Remove all *arr integrations entirely
integrations_to_remove = ['radarr', 'sonarr', 'lidarr']
original_count = len(config.get('data', {}).get('entries', []))

config['data']['entries'] = [
    entry for entry in config['data']['entries'] 
    if entry.get('domain') not in integrations_to_remove
]

new_count = len(config['data']['entries'])
removed = original_count - new_count

if removed > 0:
    print(f"Removed {removed} *arr integration(s)")
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print("Config saved. Restart HA to apply.")
else:
    print("No *arr integrations found to remove")
