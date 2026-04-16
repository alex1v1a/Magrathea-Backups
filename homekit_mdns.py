#!/usr/bin/env python3
"""
Complete the HomeKit configuration with mDNS advertising support
Adds proper IP advertising for each bridge
"""

import re

yaml_path = '/home/marvin/homeassistant/config/homekit.yaml'

# Read current homekit.yaml
with open(yaml_path, 'r') as f:
    content = f.read()

# Define bridge configurations with IP addresses
bridge_configs = {
    'Austin Lights': {
        'port': 21063,
        'ip': '10.0.1.90',
        'advertise': ['10.0.1.90']
    },
    'Austin Sensors': {
        'port': 21064,
        'ip': '10.0.1.90',
        'advertise': ['10.0.1.90']
    },
    'Sayville Lights': {
        'port': 21065,
        'ip': '10.0.1.90',
        'advertise': ['10.0.1.90', '10.1.1.90']  # Advertise on both subnets
    },
    'Sayville Switches': {
        'port': 21066,
        'ip': '10.0.1.90',
        'advertise': ['10.0.1.90', '10.1.1.90']
    },
    'Parnell Lights': {
        'port': 21067,
        'ip': '10.0.1.90',
        'advertise': ['10.0.1.90', '10.2.1.90']
    },
    'Parnell Switches': {
        'port': 21068,
        'ip': '10.0.1.90',
        'advertise': ['10.0.1.90', '10.2.1.90']
    }
}

# Add ip_address and advertise_ip to each bridge
for bridge_name, config in bridge_configs.items():
    # Pattern to find the bridge section
    pattern = rf'(# ============================================\s*\n# BRIDGE \d+: {re.escape(bridge_name)}.*?\n# ============================================\s*\n  - name: "{re.escape(bridge_name)}"\s*\n    port: {config["port"]})(\s*\n    filter:)'
    
    replacement = rf'''\1
    ip_address: {config['ip']}
    advertise_ip:
      - {config['advertise'][0]}'''
    
    if len(config['advertise']) > 1:
        for ip in config['advertise'][1:]:
            replacement += f"\n      - {ip}"
    
    replacement += r'\2'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write updated configuration
with open(yaml_path, 'w') as f:
    f.write(content)

print("✓ Updated homekit.yaml with mDNS advertising configuration")
print("  - Added ip_address for each bridge")
print("  - Added advertise_ip for cross-subnet discovery")
print("  - Austin bridges advertise on 10.0.1.x")
print("  - Sayville bridges advertise on 10.0.1.x and 10.1.1.x")
print("  - Parnell bridges advertise on 10.0.1.x and 10.2.1.x")
