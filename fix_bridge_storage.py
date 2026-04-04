import json
import sys

# Load config entries
config_path = '/home/marvin/homeassistant/config/.storage/core.config_entries'
with open(config_path) as f:
    config = json.load(f)

# Find and update the main HASS Bridge entry
updated = False
for entry in config.get('data', {}).get('entries', []):
    if entry.get('domain') == 'homekit' and entry.get('entry_id') == '01KKTCK5JVM5GNK40BQSWN06TF':
        print(f"Found HASS Bridge (entry_id: {entry.get('entry_id')[:8]}...)")
        print(f"Current filter: {entry.get('options', {}).get('filter', {})}")
        
        # Update the filter to exclude noise
        entry['options']['filter']['exclude_entities'] = [
            # HACS pre-release switches
            'switch.ytube_music_player_pre_release',
            'switch.youtube_video_card_pre_release',
            'switch.youtube_pre_release',
            'switch.hacs_pre_release',
            'switch.tesla_pre_release',
            'switch.wyze_pre_release',
            'switch.govee_cloud_integration_pre_release',
            'switch.auto_backup_pre_release',
            'switch.govee_pre_release',
            'switch.arlo_camera_support_pre_release',
            'switch.lovelace_hass_aarlo_pre_release',
            'switch.tesla_style_solar_power_card_pre_release',
            # Wyze notification/motion switches
            'switch.alex_allie_bedroom_motion_detection',
            'switch.alex_allie_bedroom_notifications',
            'switch.back_patio_motion_detection',
            'switch.back_patio_notifications',
            'switch.backyard_2_motion_detection',
            'switch.backyard_2_notifications',
            'switch.backyard_egg_chair_motion_detection',
            'switch.backyard_egg_chair_notifications',
            'switch.backyard_kitchen_motion_detection',
            'switch.backyard_kitchen_notifications',
            'switch.backyard_motion_detection',
            'switch.backyard_motion_detection_2',
            'switch.backyard_notifications',
            'switch.backyard_notifications_2',
            'switch.bedroom_backyard_motion_detection',
            'switch.bedroom_backyard_notifications',
            'switch.dog_house_motion_detection',
            'switch.dog_house_notifications',
            'switch.dog_pen_motion_detection',
            'switch.dog_pen_notifications',
            'switch.driveway_motion_detection',
            'switch.driveway_notifications',
            'switch.front_door_notifications',
            'switch.front_yard_east_motion_detection',
            'switch.front_yard_east_notifications',
            'switch.front_yard_west_motion_detection',
            'switch.front_yard_west_notifications',
            'switch.garage_door_motion_detection',
            'switch.garage_door_notifications',
            'switch.garage_motion_detection',
            'switch.garage_notifications',
            'switch.garden_tools_motion_detection',
            'switch.garden_tools_notifications',
            'switch.lounge_floor_motion_detection',
            'switch.lounge_floor_notifications',
            'switch.lounge_motion_detection',
            'switch.lounge_notifications',
            'switch.maeves_room_motion_detection',
            'switch.maeves_room_notifications',
            'switch.noras_room_motion_detection',
            'switch.noras_room_notifications',
            'switch.print_mill_motion_detection',
            'switch.print_mill_notifications',
            'switch.saxton_motion_detection',
            'switch.saxton_notifications',
            'switch.side_yard_motion_detection',
            'switch.side_yard_notifications',
            # Sayville devices (go in separate bridge)
            'switch.anouk_server_socket_1',
            'switch.cyn_pia_switch_socket_1',
            'switch.hanka_9_server_socket_1',
            'switch.marcs_bathroom_heated_floor_socket_1',
            'switch.marcs_room_fridge_lamp_socket_1',
            'scene.driveway_pump_off_cyn_pia_switch_off',
        ]
        
        print(f"Updated filter with {len(entry['options']['filter']['exclude_entities'])} exclusions")
        updated = True
        break

if updated:
    # Save back
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print("Config saved successfully")
else:
    print("ERROR: Could not find HASS Bridge entry!")
    sys.exit(1)
