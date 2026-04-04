# LCARS Multi-House Dashboard System

**Version:** 2.0  
**Created:** February 15, 2026  
**For:** Alexander (2 houses, room-based organization)

---

## 🏗️ Architecture Overview

This is a complete redesign of the Star Trek LCARS Home Assistant theme with support for **2 houses**, **room-based navigation**, and **device-type dashboards** organized in graphical grids.

### Navigation Hierarchy

```
Fleet Overview (lcars-overview)
├── House 1 — Prime Residence (lcars-house1)
│   ├── Living Room (lcars-h1-living)
│   ├── Kitchen (lcars-h1-kitchen)
│   ├── Primary Bedroom (lcars-h1-bedroom)
│   ├── Office (lcars-h1-office)
│   ├── Garage (lcars-h1-garage)
│   └── Outdoor (lcars-h1-outdoor)
├── House 2 — Auxiliary (lcars-house2)
│   ├── Living Room (lcars-h2-living)
│   ├── Kitchen (lcars-h2-kitchen)
│   ├── Primary Bedroom (lcars-h2-bedroom)
│   ├── Office (lcars-h2-office)
│   ├── Garage (lcars-h2-garage)
│   └── Outdoor (lcars-h2-outdoor)
└── Device Type Dashboards
    ├── Weather (lcars-devices-weather)
    ├── Cameras (lcars-devices-cameras)
    ├── Thermostats (lcars-devices-thermostats)
    └── Security (lcars-devices-security)
```

---

## 📁 Dashboard Files

| Dashboard | File | Purpose |
|-----------|------|---------|
| **Overview** | `lcars-overview.yaml` | Fleet command center with both house summaries |
| **House 1** | `lcars-house1.yaml` | Main house control with room navigation |
| **House 2** | `lcars-house2.yaml` | Second house control with room navigation |
| **H1 Living** | `lcars-h1-living.yaml` | Living room device grid (template for other rooms) |
| **Weather** | `lcars-devices-weather.yaml` | Both houses weather conditions + forecasts |
| **Cameras** | `lcars-devices-cameras.yaml` | 6-camera grid per house with live feeds |
| **Thermostats** | `lcars-devices-thermostats.yaml` | All zone controls + temperature/humidity grids |
| **Security** | `lcars-devices-security.yaml` | Alarms, locks, motion sensors for both houses |

---

## 🎨 Design Features

### Graphical Grids
- **4-column grids** for device controls
- **3-column grids** for cameras and thermostats
- **2-column grids** for summaries and split views
- Square buttons for toggles, rectangular for navigation

### LCARS Styling
- Header/footer bars on all cards
- Color-coded sections (orange/purple/blue)
- Lozenge and pill button shapes
- Contained cards with proper spacing

### Navigation
- Horizontal button stacks for room/device switching
- Consistent iconography throughout
- Sidebar-visible dashboards for main views
- Hidden room dashboards (navigate via buttons)

---

## 🚀 Installation

### Step 1: Copy Dashboards
Copy all files from `dashboards-new/` to your HA config directory:
```bash
# WSL path
cp -r dashboards-new/* /home/marvin/homeassistant/config/dashboards/

# Or Windows path
copy dashboards-new\* \\wsl$\Ubuntu\home\marvin\homeassistant\config\dashboards\
```

### Step 2: Add Configuration
Add the contents of `configuration-addition.yaml` to your `configuration.yaml` under the `lovelace:` section.

### Step 3: Restart Home Assistant
```
Settings → System → Restart
```

### Step 4: Access Dashboards
Navigate to: `http://localhost:8123/lcars-overview`

---

## 📝 Entity Naming Convention

All dashboards use this entity naming pattern:

**House 1:** `domain.h1_*`  
**House 2:** `domain.h2_*`

### Example Entities
```yaml
# Climate
climate.h1_main
climate.h1_living
climate.h2_main

# Lights
light.h1_living_overhead
light.h2_kitchen

# Sensors
sensor.h1_outdoor_temperature
binary_sensor.h2_front_door_motion

# Cameras
camera.h1_front_door
camera.h2_garage

# Locks
lock.h1_front_door
lock.h2_back_door

# Alarms
alarm_control_panel.h1_alarm
alarm_control_panel.h2_alarm
```

---

## 🎯 Room Dashboard Template

Each room dashboard includes:
1. **Header** with house/room name
2. **Room navigation bar** (all rooms in house)
3. **4-column device grid:**
   - Lighting controls
   - Climate/thermostat
   - Media systems
   - Sensor displays
4. **Scene buttons** (Morning, Day, Evening, Night, Movie)
5. **Footer** with room identifier

---

## ✅ Validation

All dashboard files have been validated for:
- ✅ YAML syntax correctness
- ✅ LCARS card-mod class compatibility
- ✅ Navigation path consistency
- ✅ Entity naming conventions
- ✅ Grid layout specifications

---

## 🐛 Troubleshooting

### Dashboards not showing in sidebar
- Verify `show_in_sidebar: true` in configuration
- Check that file paths are correct
- Restart Home Assistant

### Cards not styled correctly
- Ensure `card-mod` is installed via HACS
- Verify LCARS theme is active
- Hard refresh browser (Ctrl+F5)

### Navigation buttons not working
- Check that target paths match dashboard IDs
- Verify dashboard YAML files are in correct location

---

## 📊 Dashboard URLs

| Dashboard | URL |
|-----------|-----|
| Overview | `/lcars-overview` |
| House 1 | `/lcars-house1` |
| House 2 | `/lcars-house2` |
| H1 Living | `/lcars-h1-living` |
| Weather | `/lcars-devices-weather` |
| Cameras | `/lcars-devices-cameras` |
| Thermostats | `/lcars-devices-thermostats` |
| Security | `/lcars-devices-security` |

---

## 🎨 LCARS Theme Requirements

This system requires:
1. **LCARS theme** (7 variants available)
2. **card-mod** (via HACS)
3. **Antonio font** (loaded as resource)
4. **lcars.js** (loaded as resource)

See `../SETUP-GUIDE.md` for theme installation instructions.

---

**Created by:** Marvin (OpenClaw)  
**Status:** ✅ Ready for deployment
