import json
import sys

with open('/tmp/entity_registry.json', 'r') as f:
    data = json.load(f)

entities = data.get('data', {}).get('entities', [])

# Categorize entities
lights = []
sensors = []
switches = []
climate = []
binary_sensors = []
covers = []
fans = []
others = []

for e in entities:
    if e.get('disabled_by') or e.get('hidden_by'):
        continue
    entity_id = e.get('entity_id', '')
    platform = e.get('platform', '')
    
    if entity_id.startswith('light.'):
        lights.append(entity_id)
    elif entity_id.startswith('sensor.'):
        sensors.append(entity_id)
    elif entity_id.startswith('switch.'):
        switches.append(entity_id)
    elif entity_id.startswith('climate.'):
        climate.append(entity_id)
    elif entity_id.startswith('binary_sensor.'):
        binary_sensors.append(entity_id)
    elif entity_id.startswith('cover.'):
        covers.append(entity_id)
    elif entity_id.startswith('fan.'):
        fans.append(entity_id)
    else:
        others.append(entity_id)

print('=== ENTITY SUMMARY ===')
print(f'Total enabled entities: {len(lights) + len(sensors) + len(switches) + len(climate) + len(binary_sensors) + len(covers) + len(fans) + len(others)}')
print(f'Lights: {len(lights)}')
print(f'Sensors: {len(sensors)}')
print(f'Switches: {len(switches)}')
print(f'Climate: {len(climate)}')
print(f'Binary Sensors: {len(binary_sensors)}')
print(f'Covers: {len(covers)}')
print(f'Fans: {len(fans)}')
print(f'Others: {len(others)}')

# Separate sensors into priority categories
security_sensors = []
climate_sensors = []
leak_smoke_sensors = []
battery_sensors = []
signal_sensors = []
diagnostic_sensors = []
other_sensors = []

for s in sorted(sensors):
    s_lower = s.lower()
    if 'battery' in s_lower:
        battery_sensors.append(s)
    elif any(x in s_lower for x in ['signal', 'rssi', 'wifi', 'strength']):
        signal_sensors.append(s)
    elif any(x in s_lower for x in ['motion', 'door', 'window', 'contact', 'occupancy', 'presence']):
        security_sensors.append(s)
    elif any(x in s_lower for x in ['temperature', 'humidity', 'temp']):
        climate_sensors.append(s)
    elif any(x in s_lower for x in ['leak', 'water', 'smoke', 'co2', 'carbon', 'fire']):
        leak_smoke_sensors.append(s)
    elif any(x in s_lower for x in ['diagnostic', 'update', 'status', 'health']):
        diagnostic_sensors.append(s)
    else:
        other_sensors.append(s)

print(f'\n=== SENSOR CATEGORIES ===')
print(f'Security sensors (motion/door/window): {len(security_sensors)}')
print(f'Climate sensors (temp/humidity): {len(climate_sensors)}')
print(f'Leak/Smoke sensors: {len(leak_smoke_sensors)}')
print(f'Battery sensors: {len(battery_sensors)}')
print(f'Signal sensors: {len(signal_sensors)}')
print(f'Diagnostic sensors: {len(diagnostic_sensors)}')
print(f'Other sensors: {len(other_sensors)}')

bridge_a = security_sensors + climate_sensors + leak_smoke_sensors
bridge_b = battery_sensors + signal_sensors + diagnostic_sensors + other_sensors

print(f'\n=== BRIDGE SPLIT ===')
print(f'Bridge A (priority): {len(bridge_a)} entities')
print(f'Bridge B (secondary): {len(bridge_b)} entities')

print('\n=== ALL LIGHTS ===')
for l in sorted(lights):
    print(l)

print('\n=== ALL SWITCHES ===')
for s in sorted(switches):
    print(s)

print('\n=== ALL BINARY SENSORS ===')
for b in sorted(binary_sensors):
    print(b)

print('\n=== BRIDGE A ENTITIES ===')
for s in bridge_a:
    print(s)

print('\n=== BRIDGE B ENTITIES ===')
for s in bridge_b:
    print(s)
