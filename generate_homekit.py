import json

with open('/tmp/entity_registry.json', 'r') as f:
    data = json.load(f)

entities = data.get('data', {}).get('entities', [])

# Collect all enabled entities by type
all_lights = []
all_switches = []
all_sensors = []
all_binary_sensors = []
all_climate = []

for e in entities:
    if e.get('disabled_by') or e.get('hidden_by'):
        continue
    entity_id = e.get('entity_id', '')
    
    if entity_id.startswith('light.'):
        all_lights.append(entity_id)
    elif entity_id.startswith('switch.'):
        all_switches.append(entity_id)
    elif entity_id.startswith('sensor.'):
        all_sensors.append(entity_id)
    elif entity_id.startswith('binary_sensor.'):
        all_binary_sensors.append(entity_id)
    elif entity_id.startswith('climate.'):
        all_climate.append(entity_id)

# Categorize by location based on naming patterns
def is_sayville(entity_id):
    """Sayville entities have 'saxton' in the name"""
    return 'saxton' in entity_id.lower()

def is_parnell(entity_id):
    """Parnell entities - none identified yet"""
    return False

def is_austin(entity_id):
    """Austin entities - everything else"""
    return not is_sayville(entity_id) and not is_parnell(entity_id)

# Austin entities
austin_lights = [e for e in all_lights if is_austin(e)]
austin_switches = [e for e in all_switches if is_austin(e)]
austin_sensors = [e for e in all_sensors if is_austin(e)]
austin_binary = [e for e in all_binary_sensors if is_austin(e)]

# Sayville entities  
sayville_lights = [e for e in all_lights if is_sayville(e)]
sayville_switches = [e for e in all_switches if is_sayville(e)]
sayville_sensors = [e for e in all_sensors if is_sayville(e)]
sayville_binary = [e for e in all_binary_sensors if is_sayville(e)]

# Parnell entities
parnell_lights = [e for e in all_lights if is_parnell(e)]
parnell_switches = [e for e in all_switches if is_parnell(e)]

print('=== LOCATION-BASED CATEGORIZATION ===')
print(f'\nAUSTIN (10.0.1.x):')
print(f'  Lights: {len(austin_lights)}')
print(f'  Switches: {len(austin_switches)}')
print(f'  Sensors: {len(austin_sensors)}')
print(f'  Binary Sensors: {len(austin_binary)}')

print(f'\nSAYVILLE (10.1.1.x):')
print(f'  Lights: {len(sayville_lights)}')
print(f'  Switches: {len(sayville_switches)}')
print(f'  Sensors: {len(sayville_sensors)}')
print(f'  Binary Sensors: {len(sayville_binary)}')

print(f'\nPARNELL (10.2.1.x):')
print(f'  Lights: {len(parnell_lights)}')
print(f'  Switches: {len(parnell_switches)}')

# Split Austin sensors into A (priority) and B (secondary)
security_keywords = ['motion', 'door', 'window', 'contact', 'occupancy', 'presence', 'alarm']
climate_keywords = ['temperature', 'humidity', 'temp', 'thermostat']
leak_smoke_keywords = ['leak', 'water', 'smoke', 'co2', 'carbon', 'fire']
battery_keywords = ['battery']
signal_keywords = ['signal', 'rssi', 'wifi', 'strength']
diagnostic_keywords = ['diagnostic', 'update', 'status', 'health', 'version', 'trigger']

def categorize_sensor(entity_id):
    e_lower = entity_id.lower()
    if any(k in e_lower for k in battery_keywords):
        return 'battery'
    if any(k in e_lower for k in signal_keywords):
        return 'signal'
    if any(k in e_lower for k in diagnostic_keywords):
        return 'diagnostic'
    if any(k in e_lower for k in security_keywords):
        return 'security'
    if any(k in e_lower for k in climate_keywords):
        return 'climate'
    if any(k in e_lower for k in leak_smoke_keywords):
        return 'leak_smoke'
    return 'other'

austin_security = []
austin_climate = []
austin_leak = []
austin_battery = []
austin_signal = []
austin_diagnostic = []
austin_other_sensors = []

for s in austin_sensors:
    cat = categorize_sensor(s)
    if cat == 'security':
        austin_security.append(s)
    elif cat == 'climate':
        austin_climate.append(s)
    elif cat == 'leak_smoke':
        austin_leak.append(s)
    elif cat == 'battery':
        austin_battery.append(s)
    elif cat == 'signal':
        austin_signal.append(s)
    elif cat == 'diagnostic':
        austin_diagnostic.append(s)
    else:
        austin_other_sensors.append(s)

print(f'\n=== AUSTIN SENSOR BREAKDOWN ===')
print(f'Security (motion/door/window/alarm): {len(austin_security)}')
print(f'Climate (temp/humidity): {len(austin_climate)}')
print(f'Leak/Smoke: {len(austin_leak)}')
print(f'Battery: {len(austin_battery)}')
print(f'Signal: {len(austin_signal)}')
print(f'Diagnostic: {len(austin_diagnostic)}')
print(f'Other: {len(austin_other_sensors)}')

# Bridge A = Security + Climate + Leak/Smoke (priority)
# Bridge B = Battery + Signal + Diagnostic + Other
bridge_a_sensors = austin_security + austin_climate + austin_leak
bridge_b_sensors = austin_battery + austin_signal + austin_diagnostic + austin_other_sensors

# Add binary sensors to appropriate bridges
austin_motion_binary = [b for b in austin_binary if 'motion' in b.lower()]
austin_other_binary = [b for b in austin_binary if 'motion' not in b.lower()]

print(f'\n=== BINARY SENSOR BREAKDOWN ===')
print(f'Motion binary sensors: {len(austin_motion_binary)}')
print(f'Other binary sensors: {len(austin_other_binary)}')

print(f'\n=== FINAL BRIDGE SPLIT ===')
print(f'Austin Lights: {len(austin_lights)} entities')
print(f'Austin Sensors A (priority): {len(bridge_a_sensors)} sensors + {len(austin_motion_binary)} motion binary = {len(bridge_a_sensors) + len(austin_motion_binary)} total')
print(f'Austin Sensors B (secondary): {len(bridge_b_sensors)} sensors + {len(austin_other_binary)} other binary = {len(bridge_b_sensors) + len(austin_other_binary)} total')
print(f'Sayville Lights: {len(sayville_lights)} entities')
print(f'Sayville Switches: {len(sayville_switches)} entities')
print(f'Parnell Lights: {len(parnell_lights)} entities')
print(f'Parnell Switches: {len(parnell_switches)} entities')

# Generate the YAML file content
print('\n\n=== GENERATING HOMEKIT.YAML ===\n')

yaml_content = '''# ============================================
# HOMEKIT ARCHITECTURE - IP-BASED SEPARATION
# 7 Bridges for 3 Homes (Split Austin Sensors)
# ============================================
# Austin (10.0.1.x) - Primary home
# Sayville (10.1.1.x) - Secondary home  
# Parnell (10.2.1.x) - Third home
# ============================================

'''

# Bridge 1: Austin Lights
yaml_content += '''# ============================================
# BRIDGE 1: AUSTIN LIGHTS (10.0.1.x)
# Port: 21063
# ============================================
- name: "Austin Lights"
  port: 21063
  ip_address: "10.0.1.0/24"
  filter:
    include_entities:
'''
for e in sorted(austin_lights):
    yaml_content += f'      - {e}\n'

yaml_content += '''  entity_config:
'''
for e in sorted(austin_lights):
    yaml_content += f'''    {e}:
      name: "{e.replace('light.', '').replace('_', ' ').title()}"
'''

# Bridge 2: Austin Sensors A (Priority)
yaml_content += '''
# ============================================
# BRIDGE 2: AUSTIN SENSORS A (Priority)
# Port: 21064
# Security, Climate, Leak/Smoke detectors
# ============================================
- name: "Austin Sensors A"
  port: 21064
  ip_address: "10.0.1.0/24"
  filter:
    include_entities:
'''
for e in sorted(bridge_a_sensors):
    yaml_content += f'      - {e}\n'
for e in sorted(austin_motion_binary):
    yaml_content += f'      - {e}\n'

yaml_content += '''  entity_config:
'''
for e in sorted(bridge_a_sensors + austin_motion_binary):
    name = e.split('.')[-1].replace('_', ' ').title()
    yaml_content += f'''    {e}:
      name: "{name}"
'''

# Bridge 3: Austin Sensors B (Secondary)
yaml_content += '''
# ============================================
# BRIDGE 3: AUSTIN SENSORS B (Secondary)  
# Port: 21069
# Battery, Signal, Diagnostic, Other
# ============================================
- name: "Austin Sensors B"
  port: 21069
  ip_address: "10.0.1.0/24"
  filter:
    include_entities:
'''
for e in sorted(bridge_b_sensors):
    yaml_content += f'      - {e}\n'
for e in sorted(austin_other_binary):
    yaml_content += f'      - {e}\n'

yaml_content += '''  entity_config:
'''
for e in sorted(bridge_b_sensors + austin_other_binary):
    name = e.split('.')[-1].replace('_', ' ').title()
    yaml_content += f'''    {e}:
      name: "{name}"
'''

# Bridge 4: Sayville Lights
yaml_content += '''
# ============================================
# BRIDGE 4: SAYVILLE LIGHTS (10.1.1.x)
# Port: 21065
# ============================================
- name: "Sayville Lights"
  port: 21065
  ip_address: "10.1.1.0/24"
  filter:
    include_entities:
'''
for e in sorted(sayville_lights):
    yaml_content += f'      - {e}\n'

yaml_content += '''  entity_config:
'''
for e in sorted(sayville_lights):
    name = e.split('.')[-1].replace('_', ' ').title()
    yaml_content += f'''    {e}:
      name: "{name}"
'''

# Bridge 5: Sayville Switches
yaml_content += '''
# ============================================
# BRIDGE 5: SAYVILLE SWITCHES (10.1.1.x)
# Port: 21066
# ============================================
- name: "Sayville Switches"
  port: 21066
  ip_address: "10.1.1.0/24"
  filter:
    include_entities:
'''
for e in sorted(sayville_switches):
    yaml_content += f'      - {e}\n'

yaml_content += '''  entity_config:
'''
for e in sorted(sayville_switches):
    name = e.split('.')[-1].replace('_', ' ').title()
    yaml_content += f'''    {e}:
      name: "{name}"
'''

# Bridge 6: Parnell Lights
yaml_content += '''
# ============================================
# BRIDGE 6: PARNELL LIGHTS (10.2.1.x)
# Port: 21067
# ============================================
- name: "Parnell Lights"
  port: 21067
  ip_address: "10.2.1.0/24"
  filter:
    include_entities:
      # Add Parnell light entities here when available
'''

# Bridge 7: Parnell Switches
yaml_content += '''
# ============================================
# BRIDGE 7: PARNELL SWITCHES (10.2.1.x)
# Port: 21068
# ============================================
- name: "Parnell Switches"
  port: 21068
  ip_address: "10.2.1.0/24"
  filter:
    include_entities:
      # Add Parnell switch entities here when available
'''

print(yaml_content)

# Write to file
with open('/tmp/homekit_new.yaml', 'w') as f:
    f.write(yaml_content)

print(f'\n=== YAML file written to /tmp/homekit_new.yaml ===')
print(f'Total lines: {len(yaml_content.split(chr(10)))}')
