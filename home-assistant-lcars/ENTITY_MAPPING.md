# ============================================
# ENTITY MAPPING TEMPLATE
# Use this to map your entities to the LCARS dashboards
# ============================================

# ============================================
# LIGHTS - Update in bridge.yaml and quarters.yaml
# ============================================

# Living Room Lights
light.living_room_main: YOUR_LIVING_ROOM_MAIN_LIGHT
light.living_room_ambient: YOUR_LIVING_ROOM_AMBIENT_LIGHT
light.living_room_accent: YOUR_LIVING_ROOM_ACCENT_LIGHT

# Bedroom Lights
light.bedroom_main: YOUR_BEDROOM_MAIN_LIGHT
light.bedroom_nightstand: YOUR_BEDROOM_NIGHTSTAND_LIGHT
light.bedroom_closet: YOUR_BEDROOM_CLOSET_LIGHT

# Kitchen Lights
light.kitchen: YOUR_KITCHEN_LIGHT

# Other Lights
light.hallway: YOUR_HALLWAY_LIGHT
light.bathroom: YOUR_BATHROOM_LIGHT
light.office: YOUR_OFFICE_LIGHT
light.outside: YOUR_OUTSIDE_LIGHT

# ============================================
# CLIMATE - Update in bridge.yaml and quarters.yaml
# ============================================

# Thermostats
climate.living_room: YOUR_LIVING_ROOM_THERMOSTAT
climate.bedroom: YOUR_BEDROOM_THERMOSTAT

# Temperature Sensors
sensor.temperature_inside: YOUR_INSIDE_TEMP_SENSOR
sensor.temperature_outside: YOUR_OUTSIDE_TEMP_SENSOR
sensor.living_room_temperature: YOUR_LIVING_ROOM_TEMP
sensor.bedroom_temperature: YOUR_BEDROOM_TEMP
sensor.kitchen_temperature: YOUR_KITCHEN_TEMP
sensor.outdoor_temperature: YOUR_OUTDOOR_TEMP

# Humidity
sensor.humidity: YOUR_HUMIDITY_SENSOR

# ============================================
# WEATHER - Update in bridge.yaml and science.yaml
# ============================================

# Weather Entity
weather.home: YOUR_WEATHER_ENTITY

# Weather Sensors
sensor.barometric_pressure: YOUR_PRESSURE_SENSOR
sensor.uv_index: YOUR_UV_SENSOR
sensor.precipitation_probability: YOUR_RAIN_CHANCE_SENSOR

# Astronomy
sensor.sunrise: YOUR_SUNRISE_SENSOR
sensor.sunset: YOUR_SUNSET_SENSOR
sensor.moon_phase: YOUR_MOON_PHASE_SENSOR

# ============================================
# SECURITY - Update in tactical.yaml
# ============================================

# Cameras
camera.front_door: YOUR_FRONT_DOOR_CAMERA
camera.backyard: YOUR_BACKYARD_CAMERA
camera.garage: YOUR_GARAGE_CAMERA
camera.living_room: YOUR_LIVING_ROOM_CAMERA

# Locks
lock.front_door: YOUR_FRONT_DOOR_LOCK
lock.back_door: YOUR_BACK_DOOR_LOCK
lock.garage_door: YOUR_GARAGE_DOOR_LOCK

# Motion Sensors
binary_sensor.front_door_motion: YOUR_FRONT_MOTION
binary_sensor.backyard_motion: YOUR_BACKYARD_MOTION
binary_sensor.garage_motion: YOUR_GARAGE_MOTION

# Alarm
alarm_control_panel.home: YOUR_ALARM_PANEL

# ============================================
# ENERGY - Update in engineering.yaml
# ============================================

# Power
sensor.power_consumption: YOUR_POWER_SENSOR
sensor.solar_power_production: YOUR_SOLAR_SENSOR
sensor.daily_energy: YOUR_DAILY_ENERGY
sensor.monthly_energy: YOUR_MONTHLY_ENERGY
sensor.energy_cost: YOUR_ENERGY_COST

# System
sensor.processor_use: YOUR_CPU_SENSOR
sensor.memory_use_percent: YOUR_MEMORY_SENSOR
sensor.disk_use_percent: YOUR_DISK_SENSOR

# Network
sensor.internet_speed_download: YOUR_DOWNLOAD_SPEED
sensor.internet_speed_upload: YOUR_UPLOAD_SPEED
sensor.connected_devices: YOUR_CONNECTED_DEVICES

# Updates
binary_sensor.updater: YOUR_UPDATER_SENSOR

# ============================================
# AIR QUALITY - Update in science.yaml
# ============================================
sensor.air_quality_index: YOUR_AQI_SENSOR
sensor.co2: YOUR_CO2_SENSOR
sensor.voc: YOUR_VOC_SENSOR

# ============================================
# COVERS - Update in quarters.yaml
# ============================================
cover.living_room_blinds: YOUR_LIVING_ROOM_BLINDS
cover.bedroom_blinds: YOUR_BEDROOM_BLINDS
cover.kitchen_blinds: YOUR_KITCHEN_BLINDS

# ============================================
# MEDIA - Update in bridge.yaml
# ============================================
media_player.living_room_speaker: YOUR_MEDIA_PLAYER

# ============================================
# SCENES - Update in bridge.yaml and quarters.yaml
# ============================================
scene.good_morning: YOUR_GOOD_MORNING_SCENE
scene.good_night: YOUR_GOOD_NIGHT_SCENE
scene.away: YOUR_AWAY_SCENE
scene.movie_time: YOUR_MOVIE_SCENE
scene.relaxing: YOUR_RELAXING_SCENE
scene.reading: YOUR_READING_SCENE
scene.romantic: YOUR_ROMANTIC_SCENE
scene.energize: YOUR_ENERGIZE_SCENE
scene.music_mode: YOUR_MUSIC_SCENE
scene.party_mode: YOUR_PARTY_SCENE

# ============================================
# QUICK REPLACEMENT COMMANDS
# ============================================

# Use these sed commands (Linux/Mac) or find/replace in editor:

# sed -i 's/light.living_room/YOUR_ENTITY/g' lovelace/dashboards/*.yaml
# sed -i 's/climate.living_room/YOUR_ENTITY/g' lovelace/dashboards/*.yaml
# sed -i 's/weather.home/YOUR_ENTITY/g' lovelace/dashboards/*.yaml

# ============================================
# VALIDATION CHECKLIST
# ============================================

# Before starting, verify each entity exists:
# 1. Go to Developer Tools > States
# 2. Search for each entity ID
# 3. If entity doesn't exist, either:
#    a) Create the entity in your config
#    b) Remove/replace the card using that entity
#    c) Comment out the card with #

# ============================================
# EXAMPLE: Commenting Out a Card
# ============================================

# Before:
#   - type: custom:button-card
#     template: lcars_light_button
#     entity: light.missing_entity
#     name: "Missing Light"

# After:
#   # Disabled - entity not configured
#   # - type: custom:button-card
#   #   template: lcars_light_button
#   #   entity: light.missing_entity
#   #   name: "Missing Light"

# Or simply remove the card entirely from the list

# ============================================
# CUSTOM ENTITY SUGGESTIONS
# ============================================

# If you don't have certain entities, consider these alternatives:

# No motion sensors? Use:
# - Device_tracker from phones
# - Door/window sensors
# - Schedule helpers

# No cameras? Use:
# - Picture elements with static images
# - Weather radar images
# - Floor plan diagrams

# No smart locks? Use:
# - Door/window contact sensors
# - Presence detection
# - Geofencing status

# No scenes? Create them:
# - Settings > Automations & Scenes > Scenes
# - Or define in scenes.yaml
