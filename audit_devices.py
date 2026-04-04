import json

# Load entity registry
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    entities = json.load(f)

print("=== DEVICE CLASSIFICATION AUDIT ===\n")

# Find potential misclassifications
issues = []

for entity in entities.get('data', {}).get('entities', []):
    entity_id = entity.get('entity_id', '')
    domain = entity_id.split('.')[0]
    name = entity.get('name_by_user') or entity.get('original_name', '') or ''
    platform = entity.get('platform', '')
    
    # Check for switches that should be lights
    if domain == 'switch' and any(word in name.lower() for word in ['lamp', 'light', 'bulb', 'led']):
        issues.append(('SWITCH→LIGHT', entity_id, name, platform))
    
    # Check for lights that might be switches (outlets)
    if domain == 'light' and any(word in name.lower() for word in ['outlet', 'socket', 'plug', 'pump']):
        issues.append(('LIGHT→SWITCH?', entity_id, name, platform))
    
    # Check for misnamed devices
    if 'socket_1' in entity_id and domain == 'switch':
        issues.append(('GENERIC NAME', entity_id, name, platform))

print(f"Found {len(issues)} potential issues:\n")
for issue_type, eid, name, platform in sorted(issues)[:30]:
    print(f"  {issue_type}: {eid}")
    print(f"    Name: {name}")
    print(f"    Platform: {platform}")

# Summary by domain
print("\n=== ENTITY COUNT BY DOMAIN ===")
from collections import Counter
domains = Counter()
for entity in entities.get('data', {}).get('entities', []):
    domains[entity.get('entity_id', '').split('.')[0]] += 1

for d, c in sorted(domains.items(), key=lambda x: -x[1]):
    print(f"  {d}: {c}")

# Check for unavailable entities
print("\n=== CHECKING FOR UNAVAILABLE ENTITIES ===")
print("(Would need access to current states - check HA Developer Tools)")
