import json
import re

# Load device registry
with open('/home/marvin/homeassistant/config/.storage/core.device_registry') as f:
    devices = json.load(f)

# Load entity registry to get more info
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    entities = json.load(f)

print("=== DEVICE INVENTORY BY LOCATION ===\n")

austin_devices = []
sayville_devices = []
parnell_devices = []
unknown_devices = []

for device in devices.get('data', {}).get('devices', []):
    name = device.get('name_by_user') or device.get('name', 'Unknown')
    manufacturer = device.get('manufacturer', 'Unknown')
    model = device.get('model', 'Unknown')
    
    # Categorize by device type/name patterns
    name_lower = name.lower()
    
    # Austin indicators
    if any(x in name_lower for x in ['austin', 'saxton', 'marvin', 'living room', 'kitchen', 'bedroom', 'foyer', 'dining', 'lounge', 'fireplace', 'pond', 'pool', 'spa', 'driveway', 'backyard', 'front yard', 'garage', 'basement', 'bathroom', 'maeve', 'nora', 'alex', 'allie']):
        austin_devices.append((name, manufacturer, model))
    # Sayville indicators
    elif any(x in name_lower for x in ['sayville', 'marc', 'cyn', 'pia', 'anouk', 'hanka']):
        sayville_devices.append((name, manufacturer, model))
    # Parnell indicators
    elif any(x in name_lower for x in ['parnell']):
        parnell_devices.append((name, manufacturer, model))
    else:
        unknown_devices.append((name, manufacturer, model))

print(f"AUSTIN (10.0.1.x) - {len(austin_devices)} devices:")
for name, mfg, model in sorted(austin_devices):
    print(f"  - {name} ({mfg} {model})")

print(f"\nSAYVILLE (10.1.1.x) - {len(sayville_devices)} devices:")
for name, mfg, model in sorted(sayville_devices):
    print(f"  - {name} ({mfg} {model})")

print(f"\nPARNELL (10.2.1.x) - {len(parnell_devices)} devices:")
for name, mfg, model in sorted(parnell_devices):
    print(f"  - {name} ({mfg} {model})")

print(f"\nUNKNOWN/OTHER - {len(unknown_devices)} devices:")
for name, mfg, model in sorted(unknown_devices)[:20]:  # Limit output
    print(f"  - {name} ({mfg} {model})")
if len(unknown_devices) > 20:
    print(f"  ... and {len(unknown_devices) - 20} more")
