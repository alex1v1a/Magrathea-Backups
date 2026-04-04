import json

# Load config entries
with open('/home/marvin/homeassistant/config/.storage/core.config_entries') as f:
    config = json.load(f)

# Find the main HASS Bridge entry
for entry in config.get('data', {}).get('entries', []):
    if entry.get('domain') == 'homekit' and entry.get('entry_id') == '01KKTCK5JVM5GNK40BQSWN06TF':
        print("CURRENT HASS BRIDGE CONFIG:")
        print(f"  Name: {entry.get('data', {}).get('name')}")
        print(f"  Port: {entry.get('data', {}).get('port')}")
        print(f"  Mode: {entry.get('options', {}).get('mode')}")
        filt = entry.get('options', {}).get('filter', {})
        print(f"  Include domains: {filt.get('include_domains')}")
        print(f"  Include entities: {filt.get('include_entities')}")
        print(f"  Exclude domains: {filt.get('exclude_domains')}")
        print(f"  Exclude entities: {filt.get('exclude_entities')}")
        break

# Also show all homekit entries
print("\n\nALL HOMEKIT CONFIG ENTRIES:")
for entry in config.get('data', {}).get('entries', []):
    if entry.get('domain') == 'homekit':
        name = entry.get('data', {}).get('name', 'unnamed')
        port = entry.get('data', {}).get('port', '?')
        mode = entry.get('options', {}).get('mode', '?')
        eid = entry.get('entry_id')
        source = entry.get('source', '?')
        print(f"  [{eid[:8]}] {name} (port:{port}, mode:{mode}, source:{source})")
