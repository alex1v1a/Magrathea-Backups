# Star Trek LCARS Theme for Home Assistant

A faithful recreation of the Star Trek: The Next Generation LCARS interface for Home Assistant dashboards.

![LCARS Theme Preview](docs/preview.png)

## 🖖 Features

- **Authentic LCARS Design** - Based on actual Star Trek TNG/LCARS specifications
- **5 Specialized Dashboards** - Bridge, Engineering, Science, Tactical, and Quarters
- **Dynamic Theming** - Automatic color schemes for different system states
- **Sound Effects** - Optional LCARS audio feedback
- **Responsive Layout** - Works on tablets, phones, and wall-mounted displays
- **Highly Customizable** - Easy to adapt to your specific smart home setup

## 📋 Requirements

- Home Assistant 2023.7+ (Core, Container, or OS)
- HACS (Home Assistant Community Store)
- The following HACS integrations:
  - button-card
  - card-mod
  - layout-card
  - state-switch

## 🚀 Installation

### Method 1: HACS (Recommended - when available)

1. Open HACS
2. Go to "Frontend" > "Themes"
3. Search for "Star Trek LCARS"
4. Click "Install"
5. Restart Home Assistant

### Method 2: Manual Installation

#### Step 1: Install HACS Dependencies

1. Open HACS in Home Assistant
2. Install the following integrations:
   - **Frontend > button-card** - `https://github.com/custom-cards/button-card`
   - **Frontend > card-mod** - `https://github.com/thomasloven/lovelace-card-mod`
   - **Frontend > layout-card** - `https://github.com/thomasloven/lovelace-layout-card`
   - **Frontend > state-switch** - `https://github.com/thomasloven/lovelace-state-switch`

#### Step 2: Copy Theme Files

```bash
# Copy theme file
cp themes/star_trek_lcars.yaml /config/themes/

# Create directories
mkdir -p /config/www/lcars/css
mkdir -p /config/www/lcars/fonts
mkdir -p /config/www/lcars/backgrounds
mkdir -p /config/www/lcars/sounds
mkdir -p /config/lovelace/dashboards
mkdir -p /config/packages/lcars_theme

# Copy assets
cp -r www/lcars/* /config/www/lcars/
cp lovelace/dashboards/*.yaml /config/lovelace/dashboards/
cp packages/lcars_theme/*.yaml /config/packages/lcars_theme/
```

#### Step 3: Configure Lovelace Resources

Add to your Lovelace configuration (Configuration > Lovelace Dashboards > Resources):

```yaml
# Card Mod
url: /hacsfiles/lovelace-card-mod/card-mod.js
type: module

# Button Card
url: /hacsfiles/button-card/button-card.js
type: module

# Layout Card
url: /hacsfiles/lovelace-layout-card/layout-card.js
type: module

# State Switch
url: /hacsfiles/lovelace-state-switch/state-switch.js
type: module

# LCARS Custom CSS
url: /local/lcars/css/lcars-card-mod.css
type: css
```

#### Step 4: Enable the Theme

**Per User:**
1. Click your user profile (bottom left)
2. Select "Star Trek LCARS" from the Theme dropdown

**System Default:**
Add to `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Or set via automation:

```yaml
automation:
  - alias: "Set LCARS Theme on Startup"
    trigger:
      - platform: homeassistant
        event: start
    action:
      - service: frontend.set_theme
        data:
          name: "Star Trek LCARS"
```

#### Step 5: Configure Dashboards

Add to `configuration.yaml`:

```yaml
lovelace:
  mode: storage
  dashboards:
    lcars-bridge:
      mode: yaml
      title: Bridge
      icon: mdi:view-dashboard
      show_in_sidebar: true
      filename: lovelace/dashboards/bridge.yaml
    lcars-engineering:
      mode: yaml
      title: Engineering
      icon: mdi:engine
      show_in_sidebar: true
      filename: lovelace/dashboards/engineering.yaml
    lcars-science:
      mode: yaml
      title: Science
      icon: mdi:flask
      show_in_sidebar: true
      filename: lovelace/dashboards/science.yaml
    lcars-tactical:
      mode: yaml
      title: Tactical
      icon: mdi:shield
      show_in_sidebar: true
      filename: lovelace/dashboards/tactical.yaml
    lcars-quarters:
      mode: yaml
      title: Quarters
      icon: mdi:bed
      show_in_sidebar: true
      filename: lovelace/dashboards/quarters.yaml
```

Restart Home Assistant after making these changes.

## 🎨 Customization

### Changing Entity IDs

Each dashboard uses placeholder entity IDs. Replace them with your actual entities:

- `light.living_room` → Your actual light entities
- `sensor.temperature` → Your temperature sensors
- `binary_sensor.motion` → Your motion detectors
- etc.

### Custom Colors

Edit `themes/star_trek_lcars.yaml` to adjust colors:

```yaml
lcars-orange: "#FF9900"  # Change to your preferred orange
lcars-purple: "#CC99CC"  # Change to your preferred purple
```

### Adding Sound Effects

1. Place sound files in `www/lcars/sounds/`
2. Create automations using `browser_mod` or `media_player`:

```yaml
automation:
  - alias: "LCARS Button Sound"
    trigger:
      - platform: event
        event_type: state_changed
    condition:
      - condition: template
        value_template: "{{ trigger.entity_id.startswith('light.') }}"
    action:
      - service: browser_mod/play_audio
        data:
          sound: /local/lcars/sounds/lcars-beep.mp3
```

## 📱 Dashboard Descriptions

### Bridge (Main Control)
The primary dashboard for everyday use. Includes:
- Welcome/status header
- Quick scene controls
- Climate overview
- Lighting quick actions
- Media player

### Engineering (Systems)
System monitoring and energy management:
- Power consumption graphs
- Battery levels
- Network status
- Server health
- Environmental sensors

### Science (Data Analysis)
Environmental and data displays:
- Weather forecast
- Indoor climate trends
- Air quality sensors
- Historical data graphs
- Sunrise/sunset times

### Tactical (Security)
Security and access control:
- Camera feeds
- Lock status
- Alarm controls
- Motion sensors
- Entry history

### Quarters (Comfort)
Lighting and comfort controls:
- Room-by-room lighting
- Scene selectors
- Blind/shade controls
- Sleep mode
- Wake-up routines

## 🔧 Troubleshooting

### Theme Not Appearing
1. Check that themes are enabled in `configuration.yaml`
2. Verify the file is in `config/themes/`
3. Restart Home Assistant

### Cards Look Wrong
1. Ensure card-mod is installed and loaded
2. Check browser console for CSS errors
3. Clear browser cache (Ctrl+F5)

### Fonts Not Loading
1. Verify fonts are in `www/lcars/fonts/`
2. Check that `www` folder is accessible
3. Test direct URL: `http://ha-ip:8123/local/lcars/fonts/Antonio-Bold.ttf`

### Dashboard 404 Error
1. Check file paths in `configuration.yaml`
2. Verify YAML files exist in correct locations
3. Restart Home Assistant

## 📚 Resources

- [LCARS Standard](https://lcars.computer/) - LCARS design specifications
- [LCARS Font](https://fonts.google.com/specimen/Antonio) - Antonio font family
- [Home Assistant Themes](https://www.home-assistant.io/integrations/frontend/#defining-themes)
- [Button Card Docs](https://github.com/custom-cards/button-card/blob/master/README.md)

## 📝 License

This project is released under the MIT License. Star Trek and LCARS are trademarks of CBS Studios Inc. This is a fan-made project with no affiliation to CBS or Paramount.

## 🙏 Credits

- LCARS design inspired by Michael Okuda's work on Star Trek: The Next Generation
- Antonio font by Vernon Adams
- Home Assistant community for amazing custom components

---

**Live long and prosper.** 🖖
