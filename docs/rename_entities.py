#!/usr/bin/env python3
"""
Entity Renaming Helper for Multi-Location Home Assistant
Renames entities to include location prefix for proper HomeKit organization

Usage:
    python3 rename_entities.py --location austin --config /config/configuration.yaml
"""

import argparse
import re
import yaml
from pathlib import Path

# Entity naming conventions by domain
ENTITY_PATTERNS = {
    # Lights
    'light.living_room': 'light.{location}_living_room',
    'light.kitchen': 'light.{location}_kitchen',
    'light.bedroom': 'light.{location}_bedroom',
    'light.bathroom': 'light.{location}_bathroom',
    'light.hallway': 'light.{location}_hallway',
    'light.office': 'light.{location}_office',
    'light.outside': 'light.{location}_outside',
    'light.front_porch': 'light.{location}_front_porch',
    'light.backyard': 'light.{location}_backyard',
    'light.garage': 'light.{location}_garage',
    
    # Climate
    'climate.thermostat': 'climate.{location}_thermostat',
    'climate.hvac': 'climate.{location}_hvac',
    
    # Sensors
    'sensor.temperature': 'sensor.{location}_temperature',
    'sensor.humidity': 'sensor.{location}_humidity',
    'sensor.motion': 'sensor.{location}_motion',
    'sensor.door': 'sensor.{location}_door',
    'sensor.window': 'sensor.{location}_window',
    
    # Binary Sensors
    'binary_sensor.motion': 'binary_sensor.{location}_motion',
    'binary_sensor.door': 'binary_sensor.{location}_door',
    'binary_sensor.window': 'binary_sensor.{location}_window',
    'binary_sensor.occupancy': 'binary_sensor.{location}_occupancy',
    
    # Locks
    'lock.front_door': 'lock.{location}_front_door',
    'lock.back_door': 'lock.{location}_back_door',
    'lock.garage_door': 'lock.{location}_garage_door',
    
    # Switches
    'switch.outlet': 'switch.{location}_outlet',
    'switch.fan': 'switch.{location}_fan',
    
    # Covers
    'cover.garage': 'cover.{location}_garage',
    'cover.blinds': 'cover.{location}_blinds',
    
    # Media Players
    'media_player.living_room': 'media_player.{location}_living_room',
    'media_player.speaker': 'media_player.{location}_speaker',
    
    # Cameras
    'camera.front_door': 'camera.{location}_front_door',
    'camera.backyard': 'camera.{location}_backyard',
    'camera.garage': 'camera.{location}_garage',
}

# Location-specific defaults
LOCATION_DEFAULTS = {
    'austin': {
        'ip_range': '10.0.1.0/24',
        'timezone': 'America/Chicago',
        'common_devices': [
            'light.living_room',
            'light.kitchen', 
            'light.bedroom',
            'climate.thermostat',
            'sensor.temperature',
            'media_player.living_room',
        ]
    },
    'sayville': {
        'ip_range': '10.1.1.0/24',
        'timezone': 'America/New_York',
        'common_devices': [
            'light.front_porch',
            'light.backyard',
            'lock.front_door',
            'alarm_control_panel.alarm',
        ]
    },
    'parnell': {
        'ip_range': '10.2.1.0/24',
        'timezone': 'America/Chicago',
        'common_devices': [
            'light.garage',
            'lock.garage_door',
            'climate.hvac',
        ]
    }
}


def generate_entity_mapping(location):
    """Generate entity mapping for a specific location."""
    mapping = {}
    for old_pattern, new_pattern in ENTITY_PATTERNS.items():
        new_name = new_pattern.format(location=location)
        mapping[old_pattern] = new_name
    return mapping


def generate_yaml_config(location):
    """Generate HomeKit bridge configuration for a location."""
    location_info = LOCATION_DEFAULTS.get(location, {})
    ip_range = location_info.get('ip_range', '10.0.0.0/24')
    
    config = f"""# ============================================
# HomeKit Bridge Configuration - {location.title()}
# Auto-generated entity includes
# ============================================

homekit:
  - name: "HASS Bridge {location.title()}"
    port: {51827 + list(LOCATION_DEFAULTS.keys()).index(location)}
    ip_address: {ip_range.replace('.0/24', '.XXX')}  # UPDATE WITH ACTUAL IP
    
    filter:
      include_domains:
        - light
        - climate
        - sensor
        - binary_sensor
        - switch
        - fan
        - cover
        - lock
        - media_player
      
      exclude_entities:
        - sensor.date
        - sensor.time
        - update.home_assistant_core_update
      
      include_entity_globs:
        - "*.{location}_*"
    
    entity_config:
"""
    
    # Add entity configs for common devices
    for device in location_info.get('common_devices', []):
        domain, name = device.split('.')
        new_name = f"{domain}.{location}_{name}"
        friendly_name = name.replace('_', ' ').title()
        
        if domain == 'light':
            config += f"""      {new_name}:
        name: "{friendly_name}"
        type: lightbulb
"""
        elif domain == 'climate':
            config += f"""      {new_name}:
        name: "{friendly_name}"
        type: thermostat
"""
        elif domain == 'lock':
            config += f"""      {new_name}:
        name: "{friendly_name}"
"""
        elif domain == 'media_player':
            config += f"""      {new_name}:
        name: "{friendly_name}"
        type: speaker
"""
    
    return config


def print_entity_checklist(location):
    """Print a checklist of entities to rename."""
    print(f"\n{'='*60}")
    print(f"ENTITY RENAMING CHECKLIST - {location.upper()}")
    print(f"{'='*60}\n")
    
    mapping = generate_entity_mapping(location)
    
    print("Rename these entities in Home Assistant:")
    print("(Settings → Devices & Services → Entities)\n")
    
    for old_name, new_name in sorted(mapping.items()):
        print(f"  ☐ {old_name}")
        print(f"    → {new_name}")
    
    print(f"\n{'='*60}")
    print("AFTER RENAMING:")
    print("1. Update all automations that reference old entity IDs")
    print("2. Update all dashboard cards")
    print("3. Update all scripts")
    print("4. Restart Home Assistant")
    print("5. Re-pair HomeKit if needed")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Generate entity mappings for multi-location Home Assistant'
    )
    parser.add_argument(
        '--location', 
        choices=['austin', 'sayville', 'parnell'],
        required=True,
        help='Location to generate config for'
    )
    parser.add_argument(
        '--action',
        choices=['checklist', 'config', 'mapping'],
        default='checklist',
        help='Action to perform'
    )
    
    args = parser.parse_args()
    
    if args.action == 'checklist':
        print_entity_checklist(args.location)
    
    elif args.action == 'config':
        print(generate_yaml_config(args.location))
    
    elif args.action == 'mapping':
        mapping = generate_entity_mapping(args.location)
        print(f"\n# Entity Mapping for {args.location.title()}")
        print("# Old Name -> New Name\n")
        for old, new in mapping.items():
            print(f"{old}: {new}")


if __name__ == '__main__':
    main()
