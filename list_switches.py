import json

# Load entity registry
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    entities = json.load(f)

print("=== ALL SWITCH ENTITIES ===\n")
switches = []

for entity in entities.get('data', {}).get('entities', []):
    entity_id = entity.get('entity_id', '')
    if entity_id.startswith('switch.'):
        platform = entity.get('platform', 'unknown')
        switches.append((entity_id, platform))

# Sort by platform then name
for e, p in sorted(switches, key=lambda x: (x[1], x[0])):
    print(f"  - {e} (platform: {p})")

print(f"\nTotal switches: {len(switches)}")
