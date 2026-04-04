import json

# Load config entries
with open('/home/marvin/homeassistant/config/.storage/core.config_entries') as f:
    config = json.load(f)

# Entities to EXCLUDE from the main HASS Bridge
exclude_entities = [
    # HACS pre-release switches (internal noise)
    "switch.ytube_music_player_pre_release",
    "switch.youtube_video_card_pre_release",
    "switch.youtube_pre_release",
    "switch.hacs_pre_release",
    "switch.tesla_pre_release",
    "switch.wyze_pre_release",
    "switch.govee_cloud_integration_pre_release",
    "switch.auto_backup_pre_release",
    "switch.govee_pre_release",
    "switch.arlo_camera_support_pre_release",
    "switch.lovelace_hass_aarlo_pre_release",
    "switch.tesla_style_solar_power_card_pre_release",
    # Wyze notification switches (noise)
    "switch.backyard_2_notifications",
    "switch.backyard_2_motion_detection",
    "switch.backyard_notifications",
    "switch.backyard_notifications_2",
    "switch.backyard_motion_detection",
    "switch.backyard_motion_detection_2",
    "switch.garden_tools_notifications",
    "switch.garden_tools_motion_detection",
    "switch.alex_allie_bedroom_notifications",
    "switch.alex_allie_bedroom_motion_detection",
    "switch.back_patio_notifications",
    "switch.back_patio_motion_detection",
    "switch.backyard_egg_chair_notifications",
    "switch.backyard_egg_chair_motion_detection",
    "switch.backyard_kitchen_notifications",
    "switch.backyard_kitchen_motion_detection",
    "switch.bedroom_backyard_notifications",
    "switch.bedroom_backyard_motion_detection",
    "switch.dog_house_notifications",
    "switch.dog_house_motion_detection",
    "switch.dog_pen_notifications",
    "switch.dog_pen_motion_detection",
    "switch.driveway_notifications",
    "switch.driveway_motion_detection",
    "switch.front_door_notifications",
    "switch.front_yard_east_notifications",
    "switch.front_yard_east_motion_detection",
    "switch.front_yard_west_notifications",
    "switch.front_yard_west_motion_detection",
    "switch.garage_door_notifications",
    "switch.garage_door_motion_detection",
    "switch.garage_notifications",
    "switch.garage_motion_detection",
    "switch.lounge_floor_notifications",
    "switch.lounge_floor_motion_detection",
    "switch.lounge_notifications",
    "switch.lounge_motion_detection",
    "switch.maeves_room_notifications",
    "switch.maeves_room_motion_detection",
    "switch.noras_room_notifications",
    "switch.noras_room_motion_detection",
    "switch.print_mill_notifications",
    "switch.print_mill_motion_detection",
    "switch.saxton_notifications",
    "switch.saxton_motion_detection",
    "switch.side_yard_notifications",
    "switch.side_yard_motion_detection",
    "switch.wyze_notifications",
    # Exclude Sayville devices (separate home)
    "switch.anouk_server_socket_1",
    "switch.cyn_pia_switch_socket_1",
    "switch.hanka_9_server_socket_1",
    "switch.marcs_bathroom_heated_floor_socket_1",
    "switch.marcs_room_fridge_lamp_socket_1",
    "scene.driveway_pump_off_cyn_pia_switch_off",
    # Exclude noisy domains that aren't useful in HomeKit
    "sensor.govee_integration_api_rate_limit_remaining",
]

# Also exclude these domains entirely (not useful in HomeKit)
exclude_domains = [
    "automation",
    "button",
    "input_boolean",
    "input_button",
    "input_select",
    "script",
    "select",
    "update",
    "number",
    "stt",
    "tts",
    "wake_word",
    "assist_satellite",
    "todo",
    "calendar",
    "siren",
    "valve",
    "event",
]

# Update the HASS Bridge entry
for entry in config.get('data', {}).get('entries', []):
    if entry.get('entry_id') == '01KKTCK5JVM5GNK40BQSWN06TF':
        entry['options']['filter']['exclude_entities'] = exclude_entities
        # Tighten include domains to what HomeKit actually supports well
        entry['options']['filter']['include_domains'] = [
            "light",
            "switch",
            "sensor",
            "binary_sensor",
            "climate",
            "fan",
            "cover",
            "lock",
            "media_player",
            "scene",
            "device_tracker",
            "remote",
            "camera",
        ]
        print(f"Updated HASS Bridge filter:")
        print(f"  Exclude entities: {len(exclude_entities)} noise entities removed")
        print(f"  Include domains: {entry['options']['filter']['include_domains']}")
        break

# Remove the YAML-imported bridge (01KN34DA) to avoid conflict
new_entries = []
removed = False
for entry in config.get('data', {}).get('entries', []):
    if entry.get('entry_id') == '01KN34DAAM4ER2Y4QD9CV68ZW1':
        removed = True
        print(f"Removed duplicate YAML bridge: {entry.get('data', {}).get('name')}")
        continue
    new_entries.append(entry)

if removed:
    config['data']['entries'] = new_entries

# Write back
with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'w') as f:
    json.dump(config, f, indent=2)

print("\nConfig updated. Restart HA to apply.")
