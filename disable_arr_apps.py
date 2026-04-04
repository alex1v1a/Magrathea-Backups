import json
import sys

config_path = '/home/marvin/homeassistant/config/.storage/core.config_entries'

with open(config_path) as f:
    config = json.load(f)

# Find and disable all *arr integrations
integrations_to_disable = ['radarr', 'sonarr', 'lidarr']
found_any = False

for entry in config.get('data', {}).get('entries', []):
    domain = entry.get('domain', '')
    if domain in integrations_to_disable:
        print(f"Found {domain} integration: {entry.get('title')}")
        entry['disabled_by'] = 'user'  # Disable it
        found_any = True
        print(f"✅ Disabled {domain} integration")

if found_any:
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print("Config saved. Restart HA to apply.")
else:
    print("No *arr integrations found")
