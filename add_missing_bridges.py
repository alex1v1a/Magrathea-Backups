#!/usr/bin/env python3
"""
Add missing Sayville Lights and Parnell Lights bridges to homekit.yaml
"""

yaml_path = '/home/marvin/homeassistant/config/homekit.yaml'

# Read the file
with open(yaml_path, 'r') as f:
    content = f.read()

# Add Sayville Lights bridge after Austin Sensors (before Sayville Switches)
sayville_lights_bridge = '''
  # ============================================
  # BRIDGE 3: SAYVILLE LIGHTS (10.1.1.x)
  # Port: 21065
  # Ready for future Sayville lights
  # ============================================
  - name: "Sayville Lights"
    port: 21065
    ip_address: 10.0.1.90
    advertise_ip:
      - 10.0.1.90
      - 10.1.1.90
    filter:
      include_domains:
        - light
      include_entities: []

'''

# Add Parnell Lights bridge after Sayville Switches (before Parnell Switches)
parnell_lights_bridge = '''
  # ============================================
  # BRIDGE 5: PARNELL LIGHTS (10.2.1.x)
  # Port: 21067
  # Ready for future Parnell lights
  # ============================================
  - name: "Parnell Lights"
    port: 21067
    ip_address: 10.0.1.90
    advertise_ip:
      - 10.0.1.90
      - 10.2.1.90
    filter:
      include_domains:
        - light
      include_entities: []

'''

# Insert Sayville Lights before Sayville Switches
content = content.replace(
    '  # ============================================\n  # BRIDGE 4: SAYVILLE SWITCHES',
    sayville_lights_bridge + '  # ============================================\n  # BRIDGE 4: SAYVILLE SWITCHES'
)

# Insert Parnell Lights before Parnell Switches
content = content.replace(
    '  # ============================================\n  # BRIDGE 6: PARNELL SWITCHES',
    parnell_lights_bridge + '  # ============================================\n  # BRIDGE 6: PARNELL SWITCHES'
)

# Write updated file
with open(yaml_path, 'w') as f:
    f.write(content)

print("✓ Added missing bridge configurations")
print("  - Sayville Lights (port 21065)")
print("  - Parnell Lights (port 21067)")
