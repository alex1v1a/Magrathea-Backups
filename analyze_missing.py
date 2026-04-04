import json

# Load entity registry
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    entities = json.load(f)

print("=== MISSING DEVICE ANALYSIS ===\n")

# Categories
lights = []
switches = []
sensors = []
media_players = []
cameras = []
govee_devices = []
tuya_devices = []
smartlife_devices = []
samsung_devices = []
wyze_devices = []
arlo_devices = []
other_devices = []

for entity in entities.get('data', {}).get('entities', []):
    entity_id = entity.get('entity_id', '')
    platform = entity.get('platform', '')
    domain = entity_id.split('.')[0]
    
    # Skip certain domains
    if domain in ['persistent_notification', 'person', 'zone', 'weather', 'sun']:
        continue
    
    # Categorize by platform/type
    if platform == 'govee' or 'govee' in entity_id.lower():
        govee_devices.append((entity_id, platform, domain))
    elif platform == 'tuya':
        tuya_devices.append((entity_id, platform, domain))
    elif platform == 'smartlife':
        smartlife_devices.append((entity_id, platform, domain))
    elif platform == 'samsungtv' or platform == 'samsung_smart_tv':
        samsung_devices.append((entity_id, platform, domain))
    elif platform == 'wyze':
        wyze_devices.append((entity_id, platform, domain))
    elif platform == 'aarlo' or platform == 'arlo':
        arlo_devices.append((entity_id, platform, domain))
    elif domain == 'light':
        lights.append((entity_id, platform, domain))
    elif domain == 'switch':
        switches.append((entity_id, platform, domain))
    elif domain == 'sensor':
        sensors.append((entity_id, platform, domain))
    elif domain == 'media_player':
        media_players.append((entity_id, platform, domain))
    elif domain == 'camera':
        cameras.append((entity_id, platform, domain))
    else:
        other_devices.append((entity_id, platform, domain))

print(f"GOVEE DEVICES ({len(govee_devices)}):")
for e, p, d in sorted(govee_devices):
    print(f"  - {e} (platform: {p})")

print(f"\nTUYA DEVICES ({len(tuya_devices)}):")
for e, p, d in sorted(tuya_devices)[:30]:
    print(f"  - {e}")
if len(tuya_devices) > 30:
    print(f"  ... and {len(tuya_devices) - 30} more")

print(f"\nSMARTLIFE DEVICES ({len(smartlife_devices)}):")
for e, p, d in sorted(smartlife_devices):
    print(f"  - {e}")

print(f"\nSAMSUNG DEVICES ({len(samsung_devices)}):")
for e, p, d in sorted(samsung_devices):
    print(f"  - {e}")

print(f"\nWYZE DEVICES ({len(wyze_devices)}):")
for e, p, d in sorted(wyze_devices)[:20]:
    print(f"  - {e}")
if len(wyze_devices) > 20:
    print(f"  ... and {len(wyze_devices) - 20} more")

print(f"\nARLO DEVICES ({len(arlo_devices)}):")
for e, p, d in sorted(arlo_devices):
    print(f"  - {e}")

print(f"\nLIGHTS ({len(lights)}):")
for e, p, d in sorted(lights)[:20]:
    print(f"  - {e} (platform: {p})")
if len(lights) > 20:
    print(f"  ... and {len(lights) - 20} more")

print(f"\nSWITCHES ({len(switches)}):")
for e, p, d in sorted(switches)[:20]:
    print(f"  - {e} (platform: {p})")
if len(switches) > 20:
    print(f"  ... and {len(switches) - 20} more")

print(f"\nCAMERAS ({len(cameras)}):")
for e, p, d in sorted(cameras):
    print(f"  - {e} (platform: {p})")
