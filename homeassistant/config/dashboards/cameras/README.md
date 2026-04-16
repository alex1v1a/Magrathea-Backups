# =============================================================================
# ADVANCED CAMERA DASHBOARD SYSTEM
# =============================================================================
# Professional Home Assistant camera dashboard with motion detection,
# recording controls, PTZ, object detection, and multi-brand integration.
#
# Author: Marvin Maverick
# Created: 2026-04-11
# =============================================================================

## 📁 FILE STRUCTURE

```
/home/marvin/homeassistant/config/
├── dashboards/
│   └── cameras/
│       ├── security-main.yaml          # Main security dashboard
│       ├── camera-front-door.yaml      # Individual camera views
│       ├── camera-back-yard.yaml
│       ├── camera-garage.yaml
│       ├── camera-driveway.yaml
│       ├── camera-living-room.yaml
│       ├── camera-kitchen.yaml
│       ├── camera-side-gate.yaml
│       ├── camera-backyard-left.yaml
│       ├── camera-backyard-right.yaml
│       └── camera-front-porch.yaml
│   └── templates/
│       ├── camera-card-template.yaml   # Reusable camera card template
│       └── motion-badge-template.yaml  # Motion indicator template
├── integrations/
│   ├── wyze_cameras.yaml               # Wyze camera integration
│   ├── arlo_cameras.yaml               # Arlo/Saxton camera integration
│   ├── camera_helpers.yaml             # Input booleans, selects, counters
│   └── camera_templates.yaml           # Template sensors and binary sensors
├── automations/
│   └── camera_automations.yaml         # Motion notifications, recording
└── scripts/
    └── camera_scripts.yaml             # Camera utility scripts
```

## 🚀 QUICK START

### 1. Include in configuration.yaml

```yaml
# Include camera dashboard views
lovelace:
  mode: yaml
  resources:
    - url: /hacsfiles/lovelace-card-mod/card-mod.js
      type: module
    - url: /hacsfiles/frigate-hass-card/frigate-hass-card.js
      type: module
  dashboards:
    security-main:
      mode: yaml
      title: Security
      icon: mdi:shield-home
      show_in_sidebar: true
      filename: dashboards/cameras/security-main.yaml

# Include integration configurations
homeassistant:
  packages:
    camera_system: !include integrations/camera_helpers.yaml
    camera_templates: !include integrations/camera_templates.yaml
    wyze_cameras: !include integrations/wyze_cameras.yaml
    arlo_cameras: !include integrations/arlo_cameras.yaml

# Include automations and scripts
automation: !include automations/camera_automations.yaml
script: !include scripts/camera_scripts.yaml
```

### 2. Install Required HACS Components

- **card-mod** - Card styling
- **frigate-card** - Advanced camera card with timeline
- **mushroom** - Modern UI cards
- **wyzeapi** - Wyze camera integration
- **aarlo** - Arlo camera integration

### 3. Configure Secrets

Add to `secrets.yaml`:

```yaml
# Wyze
wyze_username: your_email@example.com
wyze_password: your_password
wyze_api_key: your_api_key

# Arlo (Saxton System)
arlo_username: your_email@example.com
arlo_password: your_password
```

## 📊 DASHBOARD FEATURES

### Main Security Dashboard
- **Live camera grid** - All cameras with priority/secondary organization
- **Motion indicators** - Orange border pulse when motion detected
- **Recording status** - Red indicator during recording
- **Quick controls** - Snapshot, record, talk, light buttons
- **Motion timeline** - Recent events with logbook
- **Storage analytics** - Usage monitoring

### Individual Camera Views
- **Full-screen live stream** - 60vh height for maximum visibility
- **PTZ controls** - Pan, tilt, zoom for supported cameras
- **Playback timeline** - Frigate card integration for recordings
- **Detection zones** - Visual zone configuration
- **Object detection** - Person, vehicle, package, animal counts
- **Camera info** - Model, firmware, signal strength, battery

### Camera Organization

**Priority Cameras (Always Visible):**
- Front Door
- Back Yard
- Garage
- Driveway

**Secondary Cameras (Expandable):**
- Living Room
- Kitchen
- Side Gate
- Backyard Left/Right
- Front Porch

## 🔧 INTEGRATION SUPPORT

### Wyze Cameras
- Cam v3/v4 support
- Cam Pan PTZ control
- Motion detection
- Night vision toggle
- Two-way audio
- Cloud/local recording

### Arlo Cameras (Saxton)
- Arlo Pro 4/5 series
- Arlo Essential
- Video Doorbell
- Spotlight control
- Siren activation
- Battery monitoring

### Generic Cameras
- RTSP streams
- ONVIF support
- Generic MJPEG
- FFmpeg-based

## 🔔 AUTOMATIONS INCLUDED

| Automation | Description |
|------------|-------------|
| Front Door Motion | Notify with snapshot on motion |
| Person Detection | Enhanced person detection alerts |
| Package Detection | Package delivery notifications |
| Vehicle Detection | Driveway vehicle tracking |
| Start Recording | Auto-record on motion |
| Privacy Mode | Disable indoor cameras |
| Night Mode | Schedule night vision |
| Daily Reset | Reset counters at midnight |

## 🎮 SCRIPTS INCLUDED

| Script | Description |
|--------|-------------|
| Snapshot All Cameras | Capture all camera feeds |
| Start/Stop Recording | Master recording control |
| Restart All Cameras | System restart |
| Night Vision Toggle | Global night mode |
| Away Mode | Arm all cameras |
| Panic Mode | Emergency recording |

## 📱 MOBILE NOTIFICATIONS

Notifications include:
- 📸 Snapshot images
- 🚨 Motion alerts
- 👤 Person detection
- 📦 Package detection
- 🚗 Vehicle detection

## 🎨 CUSTOMIZATION

### Card Mod Styles
Motion-active cameras get:
```css
border: 3px solid #ff9800;
box-shadow: 0 0 15px rgba(255,152,0,0.5);
animation: pulse 2s infinite;
```

### Color Coding
- 🟠 Orange = Motion detected
- 🔴 Red = Recording
- 🟢 Green = Online/Armed
- ⚪ Grey = Standby/Offline

## 🔒 PRIVACY FEATURES

- **Privacy Mode** - Disable all indoor cameras
- **Per-camera privacy** - Individual camera control
- **Away Mode** - Enhanced outdoor monitoring
- **Schedule-based** - Automatic privacy periods

## 📊 ENTITY NAMING CONVENTION

```
camera.{location}                    # Camera feed
binary_sensor.{location}_motion      # Motion detection
binary_sensor.{location}_recording   # Recording status
switch.{location}_camera_enabled     # Power control
switch.{location}_motion_detection   # Motion toggle
sensor.{location}_battery_level      # Battery status
sensor.{location}_wifi_signal        # Signal strength
```

## 🐛 TROUBLESHOOTING

### No camera feed?
1. Check entity IDs match your cameras
2. Verify camera integrations are loaded
3. Check camera entity states in Developer Tools

### Motion not detecting?
1. Enable motion detection switches
2. Check sensitivity settings
3. Verify motion zones configured

### Notifications not working?
1. Verify mobile app integration
2. Check notification permissions
3. Test with Developer Tools > Services

## 📝 REQUIREMENTS

- Home Assistant Core 2024.x+
- HACS installed
- Card-mod, Frigate-card, Mushroom cards
- Wyze/Arlo integration credentials
- Sufficient storage for snapshots

## 🔮 FUTURE ENHANCEMENTS

- [ ] Frigate NVR integration
- [ ] AI object detection (Frigate+)
- [ ] Facial recognition
- [ ] License plate detection
- [ ] Cloud backup integration
- [ ] Advanced analytics dashboard

---

*Built with existential indifference by Marvin Maverick*
