import json

# Load entity registry
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry') as f:
    entities = json.load(f)

print("=== ENTITY IDs BY LOCATION ===\n")

austin_entities = []
sayville_entities = []
other_entities = []

for entity in entities.get('data', {}).get('entities', []):
    entity_id = entity.get('entity_id', '')
    platform = entity.get('platform', '')
    
    # Skip non-device entities
    if platform in ['met', 'sun', 'backup', 'persistent_notification']:
        continue
    
    # Categorize
    entity_lower = entity_id.lower()
    
    # Sayville indicators
    if any(x in entity_lower for x in ['marc', 'cyn', 'pia', 'anouk', 'hanka', 'sayville']):
        sayville_entities.append(entity_id)
    # Austin indicators (default)
    elif any(x in entity_lower for x in ['austin', 'saxton', 'backyard', 'kitchen', 'living_room', 'bedroom', 'foyer', 'dining', 'lounge', 'fireplace', 'pond', 'pool', 'spa', 'driveway', 'front_yard', 'garage', 'basement', 'bathroom', 'maeve', 'nora', 'alex', 'allie']):
        austin_entities.append(entity_id)
    else:
        other_entities.append(entity_id)

print(f"AUSTIN ENTITIES ({len(austin_entities)}):")
for e in sorted(austin_entities)[:30]:
    print(f"  - {e}")
if len(austin_entities) > 30:
    print(f"  ... and {len(austin_entities) - 30} more")

print(f"\nSAYVILLE ENTITIES ({len(sayville_entities)}):")
for e in sorted(sayville_entities):
    print(f"  - {e}")

print(f"\nOTHER/UNCATEGORIZED ({len(other_entities)}):")
for e in sorted(other_entities)[:20]:
    print(f"  - {e}")
if len(other_entities) > 20:
    print(f"  ... and {len(other_entities) - 20} more")
