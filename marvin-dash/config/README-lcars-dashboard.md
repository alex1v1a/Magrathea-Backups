# Star Trek LCARS Mission Pad for Home Assistant

A complete Star Trek-inspired dashboard for Home Assistant with LCARS styling, weather focus, and organized tabs for devices and locations.

## Features

### 🌟 LCARS Styling
- Authentic Star Trek LCARS color scheme (orange, purple, blue, green)
- Rounded corners and pill-shaped buttons
- Left navigation rail with LCARS-style buttons
- "Antonio" font styling throughout

### 🌤️ Weather-Focused Mission Pad
- Large current conditions display
- Hourly forecast graph
- 7-day daily forecast
- Weather alerts with LCARS alert styling
- Outdoor sensors (temp, wind, rain, UV)
- Quick actions for rain mode and irrigation

### 🏠 Organized Navigation
- **Mission Pad** (Weather focus - main view)
- **Devices** (by type: Sensors, Lights, Climate, Security, Media)
- **Locations** (by physical location: Home, Downstairs, Upstairs, Garage/Exterior)

## Files Included

```
marvin-dash/config/
├── lcars-mission-pad.yaml    # Main dashboard with all views
├── mission-pad-weather.yaml  # Weather-focused main view
├── devices-main.yaml         # Device control overview
├── locations-main.yaml       # Location-based overview
└── README.md                 # This file
```

## Installation

### 1. Install LCARS Theme

**Option A: Manual Theme**
Add to your `themes.yaml` or create `lcars.yaml` in `themes/`:

```yaml
LCARS:
  # Colors
  primary-color: "#FF9900"
  light-primary-color: "#FFCC99"
  accent-color: "#CC6699"
  
  # Background
  background-color: "#000000"
  card-background-color: "#000000"
  
  # Text
  primary-text-color: "#FFFFFF"
  secondary-text-color: "#AAAAAA"
  
  # LCARS-specific colors
  lcars-orange: "#FF9900"
  lcars-purple: "#CC6699"
  lcars-blue: "#9999CC"
  lcars-green: "#99CC99"
  lcars-red: "#FF0000"
  lcars-tan: "#FFCC99"
  
  # UI Elements
  app-header-background-color: "#000000"
  app-header-text-color: "#FF9900"
  divider-color: "#FF9900"
  
  # Roundness (LCARS style)
  border-radius: "20px"
  ha-card-border-radius: "20px"
```

**Option B: HACS Theme**
Install via HACS:
1. Go to HACS → Frontend → Themes
2. Search for "LCARS" or "Star Trek"
3. Install a theme like "LCARS" or "ha-lcars"

### 2. Install Required Font

Add Antonio font to Home Assistant:

```yaml
# configuration.yaml
frontend:
  extra_module_url:
    - /local/fonts/fonts.js
```

Or add to your theme:
```yaml
LCARS:
  primary-font-family: "Antonio, sans-serif"
```

### 3. Add Dashboard

1. Go to **Settings → Dashboards**
2. Click **Add Dashboard**
3. Select **Web page** or **Raw configuration editor**
4. Paste the contents of `lcars-mission-pad.yaml`
5. Save and set as default (optional)

### 4. Update Entity Names

Replace example entities with your actual Home Assistant entities:
- `weather.home` → Your weather entity
- `sensor.outdoor_temperature` → Your outdoor temp sensor
- `light.living_room` → Your light entities
- `climate.main` → Your thermostat
- etc.

## Dashboard Structure

### Main Views

| View | Path | Description |
|------|------|-------------|
| Mission Pad | `/mission-pad` | Weather-focused main dashboard |
| Devices | `/devices` | Device type overview |
| Sensors | `/devices-sensors` | All sensor readings |
| Lights | `/devices-lights` | Lighting control |
| Climate | `/devices-climate` | HVAC control |
| Security | `/devices-security` | Cameras and sensors |
| Media | `/devices-media` | Media players |
| Locations | `/locations` | Location overview |
| Downstairs | `/location-downstairs` | Downstairs devices |
| Upstairs | `/location-upstairs` | Upstairs devices |
| Garage/Ext | `/location-garage` | Garage and exterior |

### Key Components

**Weather Cards:**
- `weather-forecast` - Main weather display
- `history-graph` - Temperature trends
- `sensor` cards - Wind, UV, humidity

**Device Cards:**
- `light` - Light controls
- `thermostat` - Climate control
- `alarm-panel` - Security panel
- `camera` - Camera feeds
- `media-control` - Media players

**Navigation:**
- `button` cards with LCARS styling
- Horizontal and vertical stacks
- Markdown headers with LCARS colors

## Customization

### Change Colors
Edit the theme colors in your theme file:
```yaml
lcars-orange: "#FF9900"  # Command
lcars-purple: "#CC6699"  # Operations
lcars-blue: "#9999CC"    # Science
lcars-green: "#99CC99"   # Systems
```

### Add More Locations
Copy an existing location view and modify:
1. Duplicate the view in `lcars-mission-pad.yaml`
2. Change the `path` and `title`
3. Update entity names
4. Add navigation button in `locations-main.yaml`

### Add Custom Cards

**Recommended HACS Cards:**
- `button-card` - Better LCARS buttons
- `mini-graph-card` - Compact graphs
- `apexcharts-card` - Advanced charts
- `layout-card` - Better grid control

## Screenshots

### Mission Pad (Weather)
- Large weather card with current conditions
- Hourly forecast graph
- Daily forecast tiles
- Weather alerts bar
- Outdoor sensors
- Quick action buttons

### Device Views
- Grid of lights with scene buttons
- Thermostat with history graphs
- Camera grid with sensor list
- Media players with volume controls

### Location Views
- Room-specific device groups
- Temperature sensors per room
- Camera feeds per area
- Quick scene buttons

## Troubleshooting

### Missing Entities
Update entity names in the YAML to match your Home Assistant entities.

### Theme Not Applied
Make sure the theme is set:
1. User profile (bottom left) → Theme
2. Select "LCARS"

### Font Not Loading
Install Antonio font or replace with system font:
```yaml
font-family: 'Arial, sans-serif'  # Replace Antonio
```

### Navigation Not Working
Ensure paths match exactly:
- `/lovelace/mission-pad`
- `/lovelace/devices`
- `/lovelace/locations`

## Credits

- LCARS design inspired by Star Trek: The Next Generation
- Home Assistant community themes and examples
- Structure based on dashboard best practices

## License

MIT License - Free to use and modify for personal use.
