import json

with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    entities = json.load(f)

# Count by domain and platform
from collections import Counter
domain_count = Counter()
platform_count = Counter()

for entity in entities.get('data', {}).get('entities', []):
    entity_id = entity.get('entity_id', '')
    platform = entity.get('platform', 'unknown')
    domain = entity_id.split('.')[0]
    domain_count[domain] += 1
    platform_count[platform] += 1

print("=== ENTITIES BY DOMAIN ===")
for d, c in sorted(domain_count.items(), key=lambda x: -x[1]):
    print(f"  {d}: {c}")

print("\n=== ENTITIES BY PLATFORM ===")
for p, c in sorted(platform_count.items(), key=lambda x: -x[1]):
    print(f"  {p}: {c}")

# Show what HACS/noise entities exist that should be excluded
print("\n=== HACS PRE-RELEASE SWITCHES (noise) ===")
for entity in entities.get('data', {}).get('entities', []):
    eid = entity.get('entity_id', '')
    plat = entity.get('platform', '')
    if plat == 'hacs' and eid.startswith('switch.'):
        print(f"  - {eid}")

print("\n=== WYZE NOTIFICATION/MOTION SWITCHES (noise) ===")
count = 0
for entity in entities.get('data', {}).get('entities', []):
    eid = entity.get('entity_id', '')
    plat = entity.get('platform', '')
    if plat == 'wyzeapi' and ('notification' in eid or 'motion_detection' in eid):
        count += 1
        if count <= 5:
            print(f"  - {eid}")
if count > 5:
    print(f"  ... {count} total (all noise)")

print("\n=== SMARTTHINGS FRIDGE SWITCHES ===")
for entity in entities.get('data', {}).get('entities', []):
    eid = entity.get('entity_id', '')
    plat = entity.get('platform', '')
    if plat == 'smartthings':
        print(f"  - {eid}")

print("\n=== SMARTTHINGS SENSORS ===")
for entity in entities.get('data', {}).get('entities', []):
    eid = entity.get('entity_id', '')
    plat = entity.get('platform', '')
    if plat == 'smartthings' and eid.startswith('sensor.'):
        print(f"  - {eid}")
