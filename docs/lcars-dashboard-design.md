# Star Trek LCARS Home Assistant Dashboard

A complete 5-view LCARS (Library Computer Access/Retrieval System) inspired dashboard configuration for Home Assistant, designed with authentic TNG-era Starfleet visual styling.

---

## Table of Contents
1. [Design System](#design-system)
2. [View 1: BRIDGE](#view-1-bridge)
3. [View 2: ENGINEERING](#view-2-engineering)
4. [View 3: SCIENCE](#view-3-science)
5. [View 4: SECURITY](#view-4-security)
6. [View 5: QUARTERS](#view-5-quarters)
7. [Installation Guide](#installation-guide)

---

## Design System

### LCARS Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Orange** | `#FF9900` | Primary accent, active states, headers |
| **Purple** | `#CC99CC` | Secondary accent, sub-headers |
| **Blue** | `#9999CC` | Tertiary accent, information |
| **Red** | `#CC6666` | Alerts, warnings, critical status |
| **Gold** | `#FFCC66` | Special indicators, achievements |
| **Black** | `#000000` | Background |
| **Light Gray** | `#CCCCCC` | Text, borders |
| **Dark Gray** | `#333333` | Card backgrounds |

### Typography
- **Headers:** LCARS-style rounded sans-serif
- **Data:** Monospace for sensor readings
- **Stardate format:** Use `sensor.stardate` or template

### Card Mod Styling
All cards use `card-mod` for LCARS styling:
```yaml
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 20px solid #FF9900;
      border-radius: 20px 0 0 20px;
      color: #CCCCCC;
    }
```

---

## View 1: BRIDGE

### Purpose
Main command center for household operations. Centralized control of climate, lighting, security status, and quick actions. The BRIDGE serves as the primary interaction point for day-to-day home management.

### Layout Strategy
- **Header:** System status bar with stardate/time
- **Left Column:** Climate controls and environmental data
- **Center Column:** Lighting scenes and quick actions
- **Right Column:** Security summary and alerts

### Cards Configuration

#### 1.1 Header Card (Stardate & System Status)
```yaml
type: horizontal-stack
cards:
  - type: markdown
    content: >
      ### **USS HOMEBASE** 
      NCC-1701-D
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-bottom: 8px solid #FF9900;
          border-radius: 0 0 20px 20px;
          text-align: center;
          font-family: "Arial Rounded MT Bold", sans-serif;
        }
        h3 {
          color: #FF9900 !important;
          margin: 10px 0;
        }
  - type: markdown
    content: >
      **SD** {{ states('sensor.stardate') | default('47455.2') }}
      **LOC** SECTOR 001
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-bottom: 8px solid #CC99CC;
          border-radius: 0 0 20px 20px;
          text-align: center;
          color: #CCCCCC;
        }
```

#### 1.2 Environmental Control (Climate)
```yaml
type: vertical-stack
title: ENVIRONMENTAL CONTROL
cards:
  - type: thermostat
    entity: climate.main_thermostat
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 25px solid #FF9900;
          border-radius: 25px 0 0 25px;
        }
        .title {
          color: #FF9900 !important;
        }
  - type: horizontal-stack
    cards:
      - type: gauge
        entity: sensor.indoor_humidity
        name: HUMIDITY
        min: 0
        max: 100
        severity:
          green: 30
          yellow: 50
          red: 70
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
      - type: gauge
        entity: sensor.indoor_temperature
        name: TEMP
        min: 60
        max: 90
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
            }
```

#### 1.3 Lighting Control Panel
```yaml
type: vertical-stack
title: ILLUMINATION CONTROL
cards:
  - type: horizontal-stack
    cards:
      - type: button
        entity: scene.living_room_relax
        name: RELAX
        icon: mdi:sofa
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #CC99CC;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.living_room_focus
        name: FOCUS
        icon: mdi:book-open
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #FF9900;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.living_room_movie
        name: CINEMA
        icon: mdi:movie-open
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #9999CC;
              border-radius: 12px 0 0 12px;
            }
  - type: horizontal-stack
    cards:
      - type: button
        entity: scene.all_lights_off
        name: DARK MODE
        icon: mdi:weather-night
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #333333;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.all_lights_full
        name: FULL POWER
        icon: mdi:flash
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #FFCC66;
              border-radius: 12px 0 0 12px;
            }
```

#### 1.4 Security Status Panel
```yaml
type: entities
title: SECURITY STATUS
entities:
  - entity: alarm_control_panel.home_alarm
    name: PERIMETER DEFENSE
    icon: mdi:shield-check
  - entity: binary_sensor.front_door_sensor
    name: AIRLOCK 1
    icon: mdi:door
  - entity: binary_sensor.back_door_sensor
    name: AIRLOCK 2
    icon: mdi:door
  - entity: lock.front_door_lock
    name: MAIN HATCH
    icon: mdi:lock
state_color: true
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 25px solid #FF9900;
      border-radius: 25px 0 0 25px;
    }
    .card-header {
      color: #FF9900 !important;
      font-family: "Arial Rounded MT Bold", sans-serif;
    }
```

#### 1.5 Quick Actions Panel
```yaml
type: vertical-stack
title: COMMAND FUNCTIONS
cards:
  - type: horizontal-stack
    cards:
      - type: button
        entity: script.good_morning
        name: MORNING
        icon: mdi:weather-sunset-up
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 15px solid #FFCC66;
              border-radius: 15px 0 0 15px;
            }
      - type: button
        entity: script.good_night
        name: NIGHT
        icon: mdi:weather-night
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
  - type: horizontal-stack
    cards:
      - type: button
        entity: script.leave_home
        name: AWAY
        icon: mdi:exit-run
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
      - type: button
        entity: script.arrive_home
        name: RETURN
        icon: mdi:home-import-outline
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
            }
```

---

## View 2: ENGINEERING

### Purpose
Systems monitoring and diagnostics center. Track power consumption, network infrastructure, server health, battery levels, and HVAC performance. Critical for identifying system anomalies and maintaining operational efficiency.

### Layout Strategy
- **Left Panel:** Power grid and consumption metrics
- **Center Panel:** Network topology and server status
- **Right Panel:** Battery systems and HVAC diagnostics

### Cards Configuration

#### 2.1 Warp Core (Power Monitor)
```yaml
type: vertical-stack
title: WARP CORE (POWER GRID)
cards:
  - type: gauge
    entity: sensor.power_consumption_total
    name: TOTAL OUTPUT
    min: 0
    max: 10000
    unit: W
    needle: true
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 30px solid #FF9900;
          border-radius: 30px 0 0 30px;
        }
  - type: horizontal-stack
    cards:
      - type: entity
        entity: sensor.daily_energy_usage
        name: DAILY CONSUMPTION
        icon: mdi:lightning-bolt
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
              color: #CCCCCC;
            }
      - type: entity
        entity: sensor.monthly_energy_cost
        name: ENERGY COST
        icon: mdi:cash
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
              color: #CCCCCC;
            }
```

#### 2.2 Circuit Breakers (Individual Circuits)
```yaml
type: grid
title: CIRCUIT BREAKERS
columns: 2
square: false
cards:
  - type: entity
    entity: sensor.living_room_power
    name: DECK 1
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #FF9900;
          border-radius: 10px 0 0 10px;
        }
  - type: entity
    entity: sensor.kitchen_power
    name: DECK 2
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #CC99CC;
          border-radius: 10px 0 0 10px;
        }
  - type: entity
    entity: sensor.bedroom_power
    name: DECK 3
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #9999CC;
          border-radius: 10px 0 0 10px;
        }
  - type: entity
    entity: sensor.hvac_power
    name: ENV SYSTEMS
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #FFCC66;
          border-radius: 10px 0 0 10px;
        }
```

#### 2.3 Communications Array (Network Status)
```yaml
type: vertical-stack
title: COMMUNICATIONS ARRAY
cards:
  - type: horizontal-stack
    cards:
      - type: gauge
        entity: sensor.internet_speed_download
        name: DOWNLINK
        min: 0
        max: 1000
        unit: Mbps
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
      - type: gauge
        entity: sensor.internet_speed_upload
        name: UPLINK
        min: 0
        max: 100
        unit: Mbps
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
  - type: entities
    entities:
      - entity: binary_sensor.internet_connectivity
        name: SUBSPACE LINK
        icon: mdi:web
      - entity: sensor.network_latency
        name: SIGNAL DELAY
        icon: mdi:timer-outline
      - entity: sensor.connected_devices_count
        name: ACTIVE TERMINALS
        icon: mdi:access-point-network
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 20px solid #9999CC;
          border-radius: 20px 0 0 20px;
        }
```

#### 2.4 Main Computer (Server Health)
```yaml
type: vertical-stack
title: MAIN COMPUTER CORE
cards:
  - type: horizontal-stack
    cards:
      - type: gauge
        entity: sensor.cpu_percent
        name: PROCESSOR LOAD
        min: 0
        max: 100
        severity:
          green: 0
          yellow: 50
          red: 80
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
            }
      - type: gauge
        entity: sensor.memory_use_percent
        name: MEMORY ALLOCATION
        min: 0
        max: 100
        severity:
          green: 0
          yellow: 60
          red: 85
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
  - type: horizontal-stack
    cards:
      - type: entity
        entity: sensor.disk_use_percent
        name: STORAGE
        icon: mdi:harddisk
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
      - type: entity
        entity: sensor.uptime
        name: UPTIME
        icon: mdi:clock-outline
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FFCC66;
              border-radius: 15px 0 0 15px;
            }
```

#### 2.5 EPS Grid (Battery Systems)
```yaml
type: vertical-stack
title: EPS GRID (BATTERY SYSTEMS)
cards:
  - type: horizontal-stack
    cards:
      - type: gauge
        entity: sensor.ups_battery_level
        name: UPS LEVEL
        min: 0
        max: 100
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
            }
      - type: gauge
        entity: sensor.phone_battery_level
        name: MOBILE UNIT
        min: 0
        max: 100
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
  - type: entities
    entities:
      - entity: binary_sensor.ups_on_battery
        name: AUXILIARY POWER
        icon: mdi:battery-alert
      - entity: sensor.ups_runtime
        name: RESERVE TIME
        icon: mdi:timer
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 20px solid #FF9900;
          border-radius: 20px 0 0 20px;
        }
```

#### 2.6 Life Support (HVAC Systems)
```yaml
type: entities
title: LIFE SUPPORT SYSTEMS
entities:
  - entity: climate.living_room
    name: DECK 1 ENV
    icon: mdi:air-conditioner
  - entity: climate.bedroom
    name: DECK 3 ENV
    icon: mdi:air-conditioner
  - entity: sensor.hvac_filter_life
    name: FILTER STATUS
    icon: mdi:air-filter
  - entity: binary_sensor.hvac_running
    name: SYSTEM ACTIVE
    icon: mdi:fan
state_color: true
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 25px solid #9999CC;
      border-radius: 25px 0 0 25px;
    }
    .card-header {
      color: #9999CC !important;
    }
```

---

## View 3: SCIENCE

### Purpose
Sensor data analysis and environmental monitoring. Displays weather station data, air quality metrics, motion detection, door/window status, and historical trend graphs. Essential for understanding the home environment.

### Layout Strategy
- **Top Row:** Weather and atmospheric conditions
- **Center:** Air quality and environmental sensors
- **Bottom:** Historical graphs and motion tracking

### Cards Configuration

#### 3.1 Stellar Cartography (Weather Station)
```yaml
type: vertical-stack
title: STELLAR CARTOGRAPHY
cards:
  - type: weather-forecast
    entity: weather.home
    show_forecast: true
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 30px solid #FF9900;
          border-radius: 30px 0 0 30px;
        }
  - type: horizontal-stack
    cards:
      - type: entity
        entity: sensor.outdoor_temperature
        name: EXT TEMP
        icon: mdi:thermometer
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
            }
      - type: entity
        entity: sensor.wind_speed
        name: WIND SPD
        icon: mdi:weather-windy
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
      - type: entity
        entity: sensor.humidity_outdoor
        name: HUMIDITY
        icon: mdi:water-percent
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
```

#### 3.2 Atmospheric Analysis (Air Quality)
```yaml
type: vertical-stack
title: ATMOSPHERIC ANALYSIS
cards:
  - type: horizontal-stack
    cards:
      - type: gauge
        entity: sensor.aqi
        name: AIR QUALITY IDX
        min: 0
        max: 300
        severity:
          green: 0
          yellow: 50
          red: 100
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FF9900;
              border-radius: 15px 0 0 15px;
            }
      - type: gauge
        entity: sensor.co2_level
        name: CO2 LEVEL
        min: 400
        max: 2000
        unit: ppm
        severity:
          green: 400
          yellow: 1000
          red: 1500
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
  - type: horizontal-stack
    cards:
      - type: entity
        entity: sensor.pm25
        name: PARTICULATE 2.5
        icon: mdi:blur
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
      - type: entity
        entity: sensor.voc_level
        name: VOC LEVEL
        icon: mdi:molecule
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #FFCC66;
              border-radius: 15px 0 0 15px;
            }
```

#### 3.3 Sensor Array (Motion & Presence)
```yaml
type: grid
title: SENSOR ARRAY
columns: 3
square: false
cards:
  - type: binary_sensor
    entity: binary_sensor.living_room_motion
    name: DECK 1
    icon: mdi:motion-sensor
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #FF9900;
          border-radius: 10px 0 0 10px;
        }
  - type: binary_sensor
    entity: binary_sensor.kitchen_motion
    name: DECK 2
    icon: mdi:motion-sensor
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #CC99CC;
          border-radius: 10px 0 0 10px;
        }
  - type: binary_sensor
    entity: binary_sensor.hallway_motion
    name: CORRIDOR
    icon: mdi:motion-sensor
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #9999CC;
          border-radius: 10px 0 0 10px;
        }
  - type: binary_sensor
    entity: binary_sensor.bedroom_motion
    name: DECK 3
    icon: mdi:motion-sensor
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #FFCC66;
          border-radius: 10px 0 0 10px;
        }
  - type: binary_sensor
    entity: binary_sensor.office_motion
    name: LAB
    icon: mdi:motion-sensor
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #CC6666;
          border-radius: 10px 0 0 10px;
        }
  - type: binary_sensor
    entity: binary_sensor.garage_motion
    name: SHUTTLE BAY
    icon: mdi:motion-sensor
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 10px solid #FF9900;
          border-radius: 10px 0 0 10px;
        }
```

#### 3.4 Hull Integrity (Door/Window Sensors)
```yaml
type: entities
title: HULL INTEGRITY
columns: 2
entities:
  - entity: binary_sensor.front_door
    name: AIRLOCK 1
    icon: mdi:door
  - entity: binary_sensor.back_door
    name: AIRLOCK 2
    icon: mdi:door
  - entity: binary_sensor.garage_door
    name: SHUTTLE BAY DOOR
    icon: mdi:garage
  - entity: binary_sensor.living_room_window
    name: VIEWPORT 1
    icon: mdi:window-open-variant
  - entity: binary_sensor.bedroom_window
    name: VIEWPORT 2
    icon: mdi:window-open-variant
  - entity: binary_sensor.office_window
    name: VIEWPORT 3
    icon: mdi:window-open-variant
state_color: true
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 25px solid #CC99CC;
      border-radius: 25px 0 0 25px;
    }
    .card-header {
      color: #CC99CC !important;
    }
```

#### 3.5 Historical Data Analysis (Graphs)
```yaml
type: vertical-stack
title: TEMPORAL ANALYSIS
cards:
  - type: history-graph
    entities:
      - entity: sensor.indoor_temperature
        name: INT TEMP
      - entity: sensor.outdoor_temperature
        name: EXT TEMP
    hours_to_show: 24
    refresh_interval: 60
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 15px solid #FF9900;
          border-radius: 15px 0 0 15px;
        }
  - type: history-graph
    entities:
      - entity: sensor.humidity_indoor
        name: INT HUM
      - entity: sensor.humidity_outdoor
        name: EXT HUM
    hours_to_show: 24
    refresh_interval: 60
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 15px solid #9999CC;
          border-radius: 15px 0 0 15px;
        }
  - type: history-graph
    entities:
      - entity: sensor.power_consumption_total
        name: PWR CONSUMPTION
    hours_to_show: 24
    refresh_interval: 60
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 15px solid #FFCC66;
          border-radius: 15px 0 0 15px;
        }
```

---

## View 4: SECURITY

### Purpose
Tactical and security operations center. Monitor camera feeds, lock status, alarm controls, presence detection, and perimeter sensors. Provides complete situational awareness of the home's security posture.

### Layout Strategy
- **Main Area:** Camera feed grid (live view)
- **Side Panel:** Lock status and access controls
- **Bottom:** Alarm panel and perimeter status

### Cards Configuration

#### 4.1 Tactical Display (Camera Feeds)
```yaml
type: vertical-stack
title: TACTICAL DISPLAY (VISUAL MONITORING)
cards:
  - type: grid
cards:
  - type: picture-entity
    entity: camera.front_door
    name: AIRLOCK 1 EXT
    show_state: false
    camera_view: live
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 15px solid #FF9900;
          border-radius: 15px 0 0 15px;
        }
  - type: picture-entity
    entity: camera.backyard
    name: STERN SECTION
    show_state: false
    camera_view: live
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 15px solid #CC99CC;
          border-radius: 15px 0 0 15px;
        }
  - type: picture-entity
    entity: camera.living_room
    name: DECK 1 INT
    show_state: false
    camera_view: live
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 15px solid #9999CC;
          border-radius: 15px 0 0 15px;
        }
  - type: picture-entity
    entity: camera.garage
    name: SHUTTLE BAY
    show_state: false
    camera_view: live
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 15px solid #FFCC66;
          border-radius: 15px 0 0 15px;
        }
```

#### 4.2 Access Control (Lock Status)
```yaml
type: vertical-stack
title: ACCESS CONTROL
cards:
  - type: entities
    entities:
      - entity: lock.front_door
        name: MAIN HATCH
        icon: mdi:lock
      - entity: lock.back_door
        name: AFT AIRLOCK
        icon: mdi:lock
      - entity: lock.garage_door
        name: SHUTTLE BAY GATE
        icon: mdi:lock
    state_color: true
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 25px solid #FF9900;
          border-radius: 25px 0 0 25px;
        }
        .card-header {
          color: #FF9900 !important;
        }
  - type: horizontal-stack
    cards:
      - type: button
        entity: lock.front_door
        name: LOCK ALL
        icon: mdi:lock
        tap_action:
          action: call-service
          service: lock.lock
          target:
            entity_id: all
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #CC6666;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: lock.front_door
        name: UNLOCK ALL
        icon: mdi:lock-open
        tap_action:
          action: call-service
          service: lock.unlock
          target:
            entity_id: all
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #FF9900;
              border-radius: 12px 0 0 12px;
            }
```

#### 4.3 Red Alert (Alarm Control Panel)
```yaml
type: alarm-panel
title: RED ALERT (SECURITY PROTOCOL)
entity: alarm_control_panel.home_alarm
states:
  - arm_home
  - arm_away
  - arm_night
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 30px solid #CC6666;
      border-radius: 30px 0 0 30px;
    }
    .card-header {
      color: #CC6666 !important;
      font-weight: bold;
    }
```

#### 4.4 Crew Manifest (Presence Detection)
```yaml
type: entities
title: CREW MANIFEST
columns: 2
entities:
  - entity: person.captain
    name: CAPTAIN
    icon: mdi:account-tie
  - entity: person.first_officer
    name: FIRST OFFICER
    icon: mdi:account
  - entity: device_tracker.phone_captain
    name: COMMS - CAPTAIN
    icon: mdi:cellphone
  - entity: device_tracker.phone_officer
    name: COMMS - OFFICER
    icon: mdi:cellphone
state_color: true
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 25px solid #9999CC;
      border-radius: 25px 0 0 25px;
    }
    .card-header {
      color: #9999CC !important;
    }
```

#### 4.5 Perimeter Defense Status
```yaml
type: grid
title: PERIMETER DEFENSE ARRAY
columns: 2
square: false
cards:
  - type: entity
    entity: binary_sensor.front_door_sensor
    name: FORWARD HULL
    icon: mdi:shield
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 12px solid #FF9900;
          border-radius: 12px 0 0 12px;
        }
  - type: entity
    entity: binary_sensor.back_door_sensor
    name: AFT HULL
    icon: mdi:shield
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 12px solid #CC99CC;
          border-radius: 12px 0 0 12px;
        }
  - type: entity
    entity: binary_sensor.garage_door_sensor
    name: SHUTTLE BAY HULL
    icon: mdi:shield
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 12px solid #9999CC;
          border-radius: 12px 0 0 12px;
        }
  - type: entity
    entity: binary_sensor.window_sensors_group
    name: VIEWPORT ARRAY
    icon: mdi:shield
    card_mod:
      style: |
        ha-card {
          background: #1a1a1a;
          border-left: 12px solid #FFCC66;
          border-radius: 12px 0 0 12px;
        }
```

#### 4.6 Intrusion Log (Recent Events)
```yaml
type: logbook
title: INTRUSION LOG
entities:
  - binary_sensor.front_door_sensor
  - binary_sensor.back_door_sensor
  - binary_sensor.garage_door_sensor
  - alarm_control_panel.home_alarm
  - lock.front_door
  - lock.back_door
hours_to_show: 24
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 20px solid #CC6666;
      border-radius: 20px 0 0 20px;
      max-height: 300px;
    }
    .card-header {
      color: #CC6666 !important;
    }
```

---

## View 5: QUARTERS

### Purpose
Personal living space control center. Manage bedroom environment, media/entertainment systems, ambient lighting, sleep modes, and comfort settings. Designed for relaxation and personalization.

### Layout Strategy
- **Left:** Bedroom climate and comfort
- **Center:** Media controls and entertainment
- **Right:** Lighting and sleep modes

### Cards Configuration

#### 5.1 Quarters Status Header
```yaml
type: markdown
content: >
  **QUARTERS DECK 3** | **OCCUPANCY:** {{ 'OCCUPIED' if is_state('binary_sensor.bedroom_motion', 'on') else 'VACANT' }}
  
  **AMBIENT:** {{ states('sensor.bedroom_temperature') | default('--') }}°F | **HUMIDITY:** {{ states('sensor.bedroom_humidity') | default('--') }}%
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-bottom: 10px solid #CC99CC;
      border-radius: 0 0 25px 25px;
      text-align: center;
      color: #CCCCCC;
      font-family: "Arial Rounded MT Bold", sans-serif;
    }
```

#### 5.2 Sleeping Quarters Climate
```yaml
type: vertical-stack
title: SLEEPING QUARTERS ENV
cards:
  - type: thermostat
    entity: climate.bedroom
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 25px solid #CC99CC;
          border-radius: 25px 0 0 25px;
        }
  - type: horizontal-stack
    cards:
      - type: gauge
        entity: sensor.bedroom_temperature
        name: QUARTERS TEMP
        min: 60
        max: 85
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #CC99CC;
              border-radius: 15px 0 0 15px;
            }
      - type: gauge
        entity: sensor.bedroom_humidity
        name: QUARTERS HUM
        min: 0
        max: 100
        card_mod:
          style: |
            ha-card {
              background: #1a1a1a;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
```

#### 5.3 Holodeck (Media & Entertainment)
```yaml
type: vertical-stack
title: HOLODECK (ENTERTAINMENT)
cards:
  - type: media-control
    entity: media_player.living_room_tv
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 25px solid #9999CC;
          border-radius: 25px 0 0 25px;
        }
  - type: horizontal-stack
    cards:
      - type: button
        entity: media_player.bedroom_speaker
        name: QUARTERS AUDIO
        icon: mdi:speaker
        tap_action:
          action: more-info
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #CC99CC;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: media_player.living_room_speaker
        name: DECK 1 AUDIO
        icon: mdi:speaker
        tap_action:
          action: more-info
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #9999CC;
              border-radius: 12px 0 0 12px;
            }
  - type: horizontal-stack
    cards:
      - type: button
        entity: scene.movie_mode
        name: CINEMA
        icon: mdi:movie-open
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #FF9900;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.music_mode
        name: AMBIENT
        icon: mdi:music
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #CC99CC;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.tv_mode
        name: VIEWSCREEN
        icon: mdi:television
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #9999CC;
              border-radius: 12px 0 0 12px;
            }
```

#### 5.4 Ambient Illumination
```yaml
type: vertical-stack
title: AMBIENT ILLUMINATION
cards:
  - type: light
    entity: light.bedroom_main
    name: MAIN LIGHTS
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 20px solid #CC99CC;
          border-radius: 20px 0 0 20px;
        }
  - type: light
    entity: light.bedroom_accent
    name: ACCENT LIGHTS
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 20px solid #9999CC;
          border-radius: 20px 0 0 20px;
        }
  - type: horizontal-stack
    cards:
      - type: button
        entity: scene.bedroom_relax
        name: RELAX
        icon: mdi:spa
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #CC99CC;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.bedroom_reading
        name: READING
        icon: mdi:book-open-variant
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #FFCC66;
              border-radius: 12px 0 0 12px;
            }
      - type: button
        entity: scene.bedroom_nightlight
        name: NIGHT
        icon: mdi:weather-night
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 12px solid #9999CC;
              border-radius: 12px 0 0 12px;
            }
```

#### 5.5 Regeneration Mode (Sleep Modes)
```yaml
type: vertical-stack
title: REGENERATION MODE
cards:
  - type: horizontal-stack
    cards:
      - type: button
        entity: scene.sleep_mode
        name: INITIATE SLEEP
        icon: mdi:sleep
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 15px solid #9999CC;
              border-radius: 15px 0 0 15px;
            }
      - type: button
        entity: scene.wake_mode
        name: TERMINATE SLEEP
        icon: mdi:alarm
        show_name: true
        card_mod:
          style: |
            ha-card {
              background: #000000;
              border-left: 15px solid #FFCC66;
              border-radius: 15px 0 0 15px;
            }
  - type: entities
    entities:
      - entity: input_boolean.do_not_disturb
        name: DO NOT DISTURB
        icon: mdi:bell-off
      - entity: input_boolean.night_mode
        name: NIGHT SHIFT PROTOCOL
        icon: mdi:moon-waning-crescent
      - entity: sensor.next_alarm
        name: WAKE CYCLE
        icon: mdi:alarm
    card_mod:
      style: |
        ha-card {
          background: #000000;
          border-left: 20px solid #CC99CC;
          border-radius: 20px 0 0 20px;
        }
```

#### 5.6 Personal Comfort Settings
```yaml
type: entities
title: PERSONAL COMFORT
columns: 1
entities:
  - entity: fan.bedroom_ceiling
    name: ATMOSPHERE CIRCULATION
    icon: mdi:fan
  - entity: switch.white_noise
    name: ACOUSTIC MASKING
    icon: mdi:waveform
  - entity: input_number.bedroom_brightness
    name: DEFAULT ILLUMINATION
    icon: mdi:brightness-6
  - entity: input_select.bedroom_color_temp
    name: SPECTRAL PREFERENCE
    icon: mdi:palette
state_color: true
card_mod:
  style: |
    ha-card {
      background: #000000;
      border-left: 25px solid #CC99CC;
      border-radius: 25px 0 0 25px;
    }
    .card-header {
      color: #CC99CC !important;
    }
```

---

## Installation Guide

### Prerequisites

1. **Install Required HACS Components:**
   ```bash
   # Card Mod (required for LCARS styling)
   # Install via HACS → Frontend → Card Mod
   ```

2. **Install Theme:**
   ```yaml
   # themes/lcars.yaml
   LCARS:
     primary-color: '#FF9900'
     accent-color: '#CC99CC'
     secondary-accent-color: '#9999CC'
     alert-color: '#CC6666'
     gold-color: '#FFCC66'
     dark-background-color: '#000000'
     card-background-color: '#1a1a1a'
     text-color: '#CCCCCC'
   ```

### Configuration Steps

1. **Create the Dashboard:**
   - Go to **Settings** → **Dashboards** → **Add Dashboard**
   - Choose **Web page** or **Take control** for a new dashboard
   - Switch to **YAML mode**

2. **Add Views:**
   Copy the YAML from each section above into your dashboard configuration

3. **Customize Entity IDs:**
   Replace placeholder entity IDs with your actual Home Assistant entities:
   - `sensor.indoor_temperature` → Your temperature sensor
   - `climate.main_thermostat` → Your thermostat
   - `alarm_control_panel.home_alarm` → Your alarm panel
   - etc.

4. **Create Required Helpers:**
   ```yaml
   # configuration.yaml
   input_boolean:
     do_not_disturb:
       name: Do Not Disturb
     night_mode:
       name: Night Mode

   input_number:
     bedroom_brightness:
       name: Default Bedroom Brightness
       min: 0
       max: 100
       step: 1

   input_select:
     bedroom_color_temp:
       name: Bedroom Color Temperature
       options:
         - Warm
         - Neutral
         - Cool
   ```

5. **Create Scenes:**
   ```yaml
   # scenes.yaml
   - name: Living Room Relax
     entities:
       light.living_room:
         state: on
         brightness: 180
         color_temp: 350
   
   - name: Sleep Mode
     entities:
       light.bedroom_main:
         state: off
       light.bedroom_accent:
         state: on
         brightness: 10
       climate.bedroom:
         temperature: 68
       input_boolean.do_not_disturb:
         state: on
   ```

### Optional Enhancements

1. **Add Stardate Sensor:**
   ```yaml
   # sensors.yaml
   - platform: template
     sensors:
       stardate:
         friendly_name: "Stardate"
         value_template: >
           {{ 41000 + ((now().timestamp() - 1500000000) / 31557600 * 1000) | int / 10 }}
   ```

2. **LCARS Sound Effects:**
   Use browser_mod or similar to add audio feedback on button presses

3. **Custom Icons:**
   Install `custom-brand-icons` for Star Trek-specific icons

---

## Complete Dashboard YAML

For convenience, here's the complete dashboard structure:

```yaml
title: USS HOMEBASE
views:
  - title: BRIDGE
    path: bridge
    icon: mdi:view-dashboard
    cards:
      # [Insert BRIDGE cards here]
  
  - title: ENGINEERING
    path: engineering
    icon: mdi:cog
    cards:
      # [Insert ENGINEERING cards here]
  
  - title: SCIENCE
    path: science
    icon: mdi:flask
    cards:
      # [Insert SCIENCE cards here]
  
  - title: SECURITY
    path: security
    icon: mdi:shield
    cards:
      # [Insert SECURITY cards here]
  
  - title: QUARTERS
    path: quarters
    icon: mdi:bed
    cards:
      # [Insert QUARTERS cards here]
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Card borders not showing | Ensure `card-mod` is installed and loaded |
| Colors not matching | Verify CSS selectors match your card types |
| Entities showing unavailable | Update entity IDs to match your devices |
| Mobile display issues | Add `panel: true` to view config for better scaling |

---

## Credits

- LCARS Design System: Gene Roddenberry / Michael Okuda
- Home Assistant: Nabu Casa
- Card Mod: Thomas Lovén
- Inspiration: Star Trek: The Next Generation

---

*"Make it so." - Capt. Jean-Luc Picard*
