import json
import sys

config_path = '/home/marvin/homeassistant/config/.storage/core.config_entries'

with open(config_path) as f:
    config = json.load(f)

# Find and disable the Radarr integration
found = False
for entry in config.get('data', {}).get('entries', []):
    if entry.get('domain') == 'radarr':
        print(f"Found Radarr integration: {entry.get('title')}")
        entry['disabled_by'] = 'user'  # Disable it
        found = True
        print("✅ Disabled Radarr integration")

if found:
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print("Config saved. Restart HA to apply.")
else:
    print("Radarr integration not found")
