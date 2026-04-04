# ============================================
# QUICK SETUP GUIDE
# Minimal steps to get LCARS running
# ============================================

## 1. INSTALL HACS COMPONENTS

Open HACS and install:
- button-card
- card-mod
- layout-card
- state-switch
- (Optional) browser_mod for sounds
- (Optional) slider-entity-row

## 2. COPY FILES

```bash
# Create directory structure
mkdir -p /config/themes
mkdir -p /config/www/lcars/css
mkdir -p /config/lovelace/dashboards
mkdir -p /config/packages/lcars_theme

# Copy files
cp themes/star_trek_lcars.yaml /config/themes/
cp www/lcars/css/lcars-card-mod.css /config/www/lcars/css/
cp lovelace/dashboards/*.yaml /config/lovelace/dashboards/
cp packages/lcars_theme/*.yaml /config/packages/lcars_theme/
```

## 3. ADD TO configuration.yaml

```yaml
# Enable themes
frontend:
  themes: !include_dir_merge_named themes

# Include packages
homeassistant:
  packages: !include_dir_named packages

# Enable Lovelace dashboards
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

## 4. ADD RESOURCES

In Configuration > Lovelace Dashboards > Resources, add:

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

## 5. SET THEME

Option A - User Profile:
1. Click user icon (bottom left)
2. Select "Star Trek LCARS" from Theme dropdown

Option B - Automation (add to automations.yaml):
```yaml
- alias: "Set LCARS Theme on Startup"
  trigger:
    - platform: homeassistant
      event: start
  action:
    - service: frontend.set_theme
      data:
        name: "Star Trek LCARS"
```

## 6. RESTART HOME ASSISTANT

Configuration > Server Controls > Restart

## 7. CUSTOMIZE ENTITIES

Edit each dashboard YAML file and replace placeholder entity IDs:
- `light.living_room` → Your actual lights
- `sensor.temperature` → Your actual sensors
- `camera.front_door` → Your actual cameras

## 8. ENJOY! 🖖

Navigate to any LCARS dashboard from the sidebar.

---

## TROUBLESHOOTING

### Theme not showing in dropdown:
- Check themes folder path
- Restart Home Assistant
- Verify YAML syntax

### Cards not styled:
- Ensure card-mod is installed
- Check resources are loaded
- Clear browser cache

### Fonts not loading:
- Check internet connection (Antonio loads from Google Fonts)
- Or download Antonio and place in www/lcars/fonts/

### Dashboard 404:
- Verify file paths in configuration.yaml
- Check files exist in lovelace/dashboards/

---

## ENTITY MAPPING TEMPLATE

Replace these in dashboard files:

| Placeholder | Your Entity |
|-------------|-------------|
| `light.living_room` | Your living room light |
| `light.kitchen` | Your kitchen light |
| `light.bedroom` | Your bedroom light |
| `climate.living_room` | Your thermostat |
| `weather.home` | Your weather entity |
| `sensor.temperature` | Your temp sensor |
| `camera.front_door` | Your camera |
| `lock.front_door` | Your lock |
| `alarm_control_panel.home` | Your alarm panel |
| `media_player.living_room_speaker` | Your media player |
| `scene.good_morning` | Your scenes |

---

## COLOR QUICK REFERENCE

| Purpose | Color Code |
|---------|------------|
| Primary (Orange) | `#FF9900` |
| Secondary (Purple) | `#CC99CC` |
| Tertiary (Blue) | `#9999CC` |
| Alert (Red) | `#CC6666` |
| Medical (Pink) | `#CC6699` |
| Data (Tan) | `#FFCC99` |
| Warning (Gold) | `#FFCC66` |
