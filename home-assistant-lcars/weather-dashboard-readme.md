# Starfleet Weather Command Dashboard

A **weather-focused Star Trek LCARS dashboard** for Home Assistant that transforms your weather monitoring into a Starfleet atmospheric monitoring station.

## Features

### 🌤️ Weather Operations View
- **Atmospheric Monitoring Station** header with LCARS styling
- Current conditions display with weather entity
- Location coordinates display (Sector: Earth/Texas)
- Real-time environmental sensor readings:
  - Temperature
  - Humidity
  - Barometric Pressure
  - Wind Speed
  - UV Index
  - Air Quality Index
- 7-day weather forecast
- Climate control thermostats
- Weather alert status

### 🏠 Indoor Climate View
- Internal Environmental Controls header
- Room temperature gauges (Living Room, Bedroom, Kitchen)
- Indoor Air Quality (IAQ) monitoring
- Humidity gauges

## Design Philosophy

### Visual Style
- **Picard-era** LCARS aesthetic (modern Star Trek)
- **Color scheme**: Orange (`#E7442A`) primary, Blue (`#8899ff`) secondary
- **Dark theme** with deep space black backgrounds
- **Antonio font** for authentic Star Trek typography
- **Rounded pill buttons** and elbow connectors

### Grouping Structure
```
┌─────────────────────────────────────────────┐
│  ATMOSPHERIC MONITORING STATION (Header)   │
├─────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────┐ │
│  │ Current Weather  │ │ Location Data    │ │
│  └──────────────────┘ └──────────────────┘ │
├─────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ TEMP     │ │ HUMIDITY │ │ PRESSURE │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ WIND     │ │ UV INDEX │ │ AIR Q    │    │
│  └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐         │
│  │ THERMOSTAT 1 │ │ THERMOSTAT 2 │         │
│  └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────┤
│  7-DAY FORECAST                             │
├─────────────────────────────────────────────┤
│  WEATHER ALERTS                             │
└─────────────────────────────────────────────┘
```

## Installation

### Prerequisites
1. **Home Assistant** with HACS installed
2. **card-mod** (via HACS)
3. **cb-lcars** cards installed:
   ```bash
   # Add to HACS custom repositories
   https://github.com/snootched/cb-lcars
   ```

### Step 1: Install Required Components

1. **Install card-mod from HACS**
   - HACS → Frontend → Search "card-mod" → Install

2. **Install cb-lcards from HACS**
   - HACS → Frontend → Custom repositories
   - Add: `https://github.com/snootched/cb-lcars`
   - Category: Lovelace
   - Install "CB-LCARS"

3. **Add Google Font (Antonio)**
   - Settings → Dashboards → ⋮ → Resources
   - Add Resource:
     ```
     https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap
     ```
   - Type: Stylesheet

### Step 2: Copy Dashboard Config

1. Copy `weather-command-dashboard.json` to your Home Assistant config directory
2. Rename it to match your existing dashboard file (e.g., `lovelace.yaml`)
3. Or add as a new dashboard:
   - Settings → Dashboards → Add Dashboard
   - Use the YAML/JSON configuration from the file

### Step 3: Configure Entities

Update the dashboard configuration with your actual entity IDs:

**Weather:**
- `weather.home` → Your weather entity

**Sensors:**
- `sensor.outdoor_temperature`
- `sensor.outdoor_humidity`
- `sensor.barometric_pressure`
- `sensor.wind_speed`
- `sensor.uv_index`
- `sensor.air_quality_index`

**Climate:**
- `climate.living_room`
- `climate.bedroom`

**Indoor:**
- `sensor.living_room_temperature`
- `sensor.bedroom_temperature`
- `sensor.kitchen_temperature`
- `sensor.indoor_air_quality`
- `sensor.indoor_humidity`

### Step 4: Apply Theme

1. Copy the cb-lcars theme to your `themes` folder
2. Select the theme in your user profile:
   - Click your profile picture (bottom left)
   - Theme: "cblcars" or "LCARS Default"

## Entity Requirements

### Required Weather Entity
You need a weather provider. Popular options:
- **OpenWeatherMap** (free API)
- **AccuWeather**
- **Met.no** (default HA)
- **Tomorrow.io**

### Sensor Setup

Create template sensors in `configuration.yaml` if needed:

```yaml
sensor:
  - platform: template
    sensors:
      outdoor_temperature:
        friendly_name: "Outdoor Temperature"
        value_template: "{{ state_attr('weather.home', 'temperature') }}"
        unit_of_measurement: "°F"

      outdoor_humidity:
        friendly_name: "Outdoor Humidity"
        value_template: "{{ state_attr('weather.home', 'humidity') }}"
        unit_of_measurement: "%"

      barometric_pressure:
        friendly_name: "Barometric Pressure"
        value_template: "{{ state_attr('weather.home', 'pressure') }}"
        unit_of_measurement: "hPa"

      wind_speed:
        friendly_name: "Wind Speed"
        value_template: "{{ state_attr('weather.home', 'wind_speed') }}"
        unit_of_measurement: "mph"
```

## Customization

### Change Location Text
Edit these labels in the dashboard JSON:
- `"label": "SECTOR: EARTH/TEXAS"`
- `"label": "LAT: 30.2672° N  |  LON: 97.7431° W"`

### Change Colors
The dashboard uses CSS variables:
- `--picard-orange` - Primary accent
- `--picard-blue` - Secondary accent
- `--picard-light-green` - Status OK
- `--picard-yellow` - Caution
- `--picard-red` - Alert

### Add More Sensors
Copy/paste existing button cards and update the entity ID.

## Screenshots

*(Add screenshots of your deployed dashboard here)*

## Troubleshooting

### Cards Not Loading
1. Ensure cb-lcards is installed correctly
2. Check browser console for errors
3. Verify entity IDs exist

### Font Not Applied
1. Check that Antonio font resource is added
2. Clear browser cache (Ctrl+F5)
3. Verify card-mod is installed

### Weather Not Showing
1. Verify weather entity exists: Developer Tools → States
2. Check entity ID matches configuration
3. Ensure weather provider integration is configured

## Credits

- **cb-lcards** by snootched - The LCARS card framework
- **card-mod** by thomasloven - CSS injection for Home Assistant
- **LCARS Design** inspired by Star Trek: The Next Generation and Star Trek: Picard

## License

MIT - Modify and distribute freely. Live long and prosper! 🖖
