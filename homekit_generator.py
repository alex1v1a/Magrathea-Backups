#!/usr/bin/env python3
"""
HomeKit IP-Based Architecture Generator
Parses HA entity registry and creates 6 HomeKit bridges organized by subnet
"""

import json
import re

# Read entity registry
with open('/home/marvin/homeassistant/config/.storage/core.entity_registry', 'r') as f:
    registry = json.load(f)

# Device categorization based on naming patterns and areas
# Austin (10.0.1.x) - Primary home - Most indoor devices
# Sayville (10.1.1.x) - Secondary home - Devices with "marc", "cyn", "pia", "anouk", "hanka" in name
# Parnell (10.2.1.x) - Third home - Future devices

AUSTIN_KEYWORDS = [
    'lounge', 'living_room', 'kitchen', 'bedroom', 'foyer', 'front_door',
    'backyard', 'garage', 'driveway', 'pond', 'pool', 'fire_pit',
    'saxton', 'wyze', 'govee', 'samsung', 'apple_tv', 'trillian',
    'dog_pen', 'dog_house', 'print_mill', 'side_yard', 'back_patio',
    'garden', 'toolbox', 'front_yard', 'rgbic', 'rgbwic', 'soft_lights',
    'pathway', 'porch', 'refrigerator', 'range', 'washer', 'dryer',
    'maeve', 'nora', 'alex_allie', 'blue', 'black'
]

SAYVILLE_KEYWORDS = [
    'anouk', 'cyn', 'pia', 'hanka', 'marcs', 'marc_room', 'marc_bathroom',
    'sayville'
]

PARNELL_KEYWORDS = [
    'parnell'
]

def categorize_entity(entity_id, original_name):
    """Categorize entity by subnet based on name patterns"""
    entity_lower = entity_id.lower()
    name_lower = (original_name or '').lower()
    
    # Check Sayville keywords first (specific match)
    for kw in SAYVILLE_KEYWORDS:
        if kw in entity_lower or kw in name_lower:
            return 'sayville'
    
    # Check Parnell keywords
    for kw in PARNELL_KEYWORDS:
        if kw in entity_lower or kw in name_lower:
            return 'parnell'
    
    # Default to Austin
    return 'austin'

def get_domain(entity_id):
    """Extract domain from entity_id"""
    return entity_id.split('.')[0] if '.' in entity_id else None

def is_light_entity(entity):
    """Check if entity is a light"""
    domain = get_domain(entity.get('entity_id', ''))
    if domain == 'light':
        return True
    # Check capabilities for color modes
    caps = entity.get('capabilities', {}) or {}
    if caps.get('supported_color_modes'):
        return True
    return False

def is_sensor_climate_entity(entity):
    """Check if entity is sensor, climate, or related"""
    domain = get_domain(entity.get('entity_id', ''))
    return domain in ['sensor', 'binary_sensor', 'climate', 'fan', 'device_tracker', 'event']

def is_switch_entity(entity):
    """Check if entity is a switch"""
    domain = get_domain(entity.get('entity_id', ''))
    return domain == 'switch'

# Collect entities by category
entities = {
    'austin': {
        'lights': [],
        'sensors_climate': [],
        'switches': [],
        'media_players': [],
        'cameras': [],
        'others': []
    },
    'sayville': {
        'lights': [],
        'switches': [],
        'others': []
    },
    'parnell': {
        'lights': [],
        'switches': [],
        'others': []
    }
}

# Process all entities
for entity in registry.get('data', {}).get('entities', []):
    entity_id = entity.get('entity_id', '')
    original_name = entity.get('original_name', '')
    disabled = entity.get('disabled_by')
    
    # Skip disabled entities
    if disabled:
        continue
    
    # Skip diagnostic/config entities
    entity_cat = entity.get('entity_category')
    if entity_cat in ['diagnostic', 'config']:
        continue
    
    domain = get_domain(entity_id)
    if not domain:
        continue
    
    # Skip certain domains
    if domain in ['update', 'tts', 'stt', 'wake_word', 'assist_satellite', 'button', 'select', 'number', 'valve', 'scene']:
        continue
    
    location = categorize_entity(entity_id, original_name)
    
    entry = {
        'entity_id': entity_id,
        'name': original_name or entity_id,
        'domain': domain
    }
    
    # Categorize by type
    if is_light_entity(entity):
        entities[location]['lights'].append(entry)
    elif is_switch_entity(entity):
        entities[location]['switches'].append(entry)
    elif is_sensor_climate_entity(entity):
        if location == 'austin':
            entities[location]['sensors_climate'].append(entry)
        else:
            entities[location]['others'].append(entry)
    elif domain == 'media_player':
        if location == 'austin':
            entities[location]['media_players'].append(entry)
        else:
            entities[location]['others'].append(entry)
    elif domain == 'camera':
        if location == 'austin':
            entities[location]['cameras'].append(entry)
        else:
            entities[location]['others'].append(entry)
    else:
        entities[location]['others'].append(entry)

# Print summary
print("=" * 60)
print("DEVICE CATEGORIZATION SUMMARY")
print("=" * 60)

for location in ['austin', 'sayville', 'parnell']:
    print(f"\n{location.upper()} (10.{['0', '1', '2'][['austin', 'sayville', 'parnell'].index(location)]}.1.x):")
    for cat, items in entities[location].items():
        if items:
            print(f"  {cat}: {len(items)} entities")
            for item in items[:5]:  # Show first 5
                print(f"    - {item['entity_id']}")
            if len(items) > 5:
                print(f"    ... and {len(items) - 5} more")

# Generate HomeKit YAML configuration
print("\n\n" + "=" * 60)
print("GENERATING HOMEKIT.YAML")
print("=" * 60)

yaml_content = """# ============================================
# HOMEKIT ARCHITECTURE - IP-BASED SEPARATION
# 6 Bridges for 3 Homes
# ============================================
# Austin (10.0.1.x) - Primary home
# Sayville (10.1.1.x) - Secondary home
# Parnell (10.2.1.x) - Third home
# ============================================

homekit:
"""

# Bridge 1: Austin Lights (Port 21063)
austin_lights = entities['austin']['lights']
if austin_lights:
    yaml_content += """
  # ============================================
  # BRIDGE 1: AUSTIN LIGHTS (10.0.1.x)
  # Port: 21063
  # ============================================
  - name: "Austin Lights"
    port: 21063
    filter:
      include_domains:
        - light
"""
    # Add specific light entities
    yaml_content += "      include_entities:\n"
    for light in austin_lights:
        yaml_content += f"        - {light['entity_id']}\n"
    
    yaml_content += "    entity_config:\n"
    for light in austin_lights:
        clean_name = light['name'].replace('_', ' ').title() if light['name'] else light['entity_id']
        yaml_content += f"      {light['entity_id']}:\n"
        yaml_content += f"        name: \"{clean_name}\"\n"

# Bridge 2: Austin Sensors/Climate (Port 21064)
austin_sensors = entities['austin']['sensors_climate']
austin_media = entities['austin']['media_players']
austin_cameras = entities['austin']['cameras']
austin_switches = entities['austin']['switches']

if austin_sensors or austin_media or austin_cameras or austin_switches:
    yaml_content += """
  # ============================================
  # BRIDGE 2: AUSTIN SENSORS/CLIMATE (10.0.1.x)
  # Port: 21064
  # Includes: sensors, cameras, media players, switches
  # ============================================
  - name: "Austin Sensors"
    port: 21064
    filter:
      include_domains:
        - sensor
        - binary_sensor
        - climate
        - fan
        - device_tracker
        - event
        - camera
        - media_player
        - switch
"""
    all_austin_entities = austin_sensors + austin_cameras + austin_media + austin_switches
    if all_austin_entities:
        yaml_content += "      include_entities:\n"
        for entity in all_austin_entities:
            yaml_content += f"        - {entity['entity_id']}\n"
        
        yaml_content += "    entity_config:\n"
        for entity in all_austin_entities:
            clean_name = entity['name'].replace('_', ' ').title() if entity['name'] else entity['entity_id']
            yaml_content += f"      {entity['entity_id']}:\n"
            yaml_content += f"        name: \"{clean_name}\"\n"
            if entity['domain'] == 'media_player':
                yaml_content += f"        type: television\n"

# Bridge 3: Sayville Lights (Port 21065)
sayville_lights = entities['sayville']['lights']
sayville_others = entities['sayville']['others']

if sayville_lights or sayville_others:
    yaml_content += """
  # ============================================
  # BRIDGE 3: SAYVILLE LIGHTS (10.1.1.x)
  # Port: 21065
  # ============================================
  - name: "Sayville Lights"
    port: 21065
    filter:
      include_domains:
        - light
"""
    if sayville_lights:
        yaml_content += "      include_entities:\n"
        for light in sayville_lights:
            yaml_content += f"        - {light['entity_id']}\n"
        
        yaml_content += "    entity_config:\n"
        for light in sayville_lights:
            clean_name = light['name'].replace('_', ' ').title() if light['name'] else light['entity_id']
            yaml_content += f"      {light['entity_id']}:\n"
            yaml_content += f"        name: \"{clean_name}\"\n"

# Bridge 4: Sayville Switches (Port 21066)
sayville_switches = entities['sayville']['switches']

if sayville_switches or sayville_others:
    yaml_content += """
  # ============================================
  # BRIDGE 4: SAYVILLE SWITCHES (10.1.1.x)
  # Port: 21066
  # ============================================
  - name: "Sayville Switches"
    port: 21066
    filter:
      include_domains:
        - switch
        - sensor
        - binary_sensor
"""
    all_sayville = sayville_switches + sayville_others
    if all_sayville:
        yaml_content += "      include_entities:\n"
        for entity in all_sayville:
            yaml_content += f"        - {entity['entity_id']}\n"
        
        yaml_content += "    entity_config:\n"
        for entity in all_sayville:
            clean_name = entity['name'].replace('_', ' ').title() if entity['name'] else entity['entity_id']
            yaml_content += f"      {entity['entity_id']}:\n"
            yaml_content += f"        name: \"{clean_name}\"\n"

# Bridge 5: Parnell Lights (Port 21067)
parnell_lights = entities['parnell']['lights']
parnell_others = entities['parnell']['others']

if parnell_lights or parnell_others:
    yaml_content += """
  # ============================================
  # BRIDGE 5: PARNELL LIGHTS (10.2.1.x)
  # Port: 21067
  # ============================================
  - name: "Parnell Lights"
    port: 21067
    filter:
      include_domains:
        - light
"""
    if parnell_lights:
        yaml_content += "      include_entities:\n"
        for light in parnell_lights:
            yaml_content += f"        - {light['entity_id']}\n"

# Bridge 6: Parnell Switches (Port 21068)
parnell_switches = entities['parnell']['switches']

yaml_content += """
  # ============================================
  # BRIDGE 6: PARNELL SWITCHES (10.2.1.x)
  # Port: 21068
  # Ready for future Parnell devices
  # ============================================
  - name: "Parnell Switches"
    port: 21068
    filter:
      include_domains:
        - switch
        - sensor
        - binary_sensor
"""

if parnell_switches:
    yaml_content += "      include_entities:\n"
    for switch in parnell_switches:
        yaml_content += f"        - {switch['entity_id']}\n"

# Write the configuration
output_path = '/home/marvin/homeassistant/config/homekit.yaml'
with open(output_path, 'w') as f:
    f.write(yaml_content)

print(f"\n✓ Generated homekit.yaml at: {output_path}")
print(f"  - Austin Lights: {len(austin_lights)} entities (port 21063)")
print(f"  - Austin Sensors: {len(austin_sensors + austin_cameras + austin_media + austin_switches)} entities (port 21064)")
print(f"  - Sayville Lights: {len(sayville_lights)} entities (port 21065)")
print(f"  - Sayville Switches: {len(sayville_switches + sayville_others)} entities (port 21066)")
print(f"  - Parnell Lights: {len(parnell_lights)} entities (port 21067)")
print(f"  - Parnell Switches: {len(parnell_switches + parnell_others)} entities (port 21068)")
