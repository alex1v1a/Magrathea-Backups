# ============================================
# LCARS THEME CUSTOMIZATION GUIDE
# How to personalize your LCARS interface
# ============================================

## COLOR CUSTOMIZATION

### Changing Primary Colors

Edit `themes/star_trek_lcars.yaml`:

```yaml
# Current default colors
lcars-orange: "#FF9900"
lcars-purple: "#CC99CC"
lcars-blue: "#9999CC"

# Example: Darker theme
lcars-orange: "#CC7A00"      # Darker orange
lcars-purple: "#996699"      # Darker purple  
lcars-blue: "#666699"        # Darker blue

# Example: TNG Movie theme
lcars-orange: "#FFAA33"      # Brighter orange
lcars-purple: "#DD88DD"      # Brighter purple
lcars-blue: "#8888DD"        # Brighter blue
```

### Department-Specific Colors

| Department | Primary | Secondary | Usage |
|------------|---------|-----------|-------|
| Command | `#FF9900` | `#CC99CC` | Bridge dashboard |
| Engineering | `#9999CC` | `#FFCC66` | Engineering dashboard |
| Science | `#CC6699` | `#CC99CC` | Science dashboard |
| Medical | `#CC6699` | `#FFCC99` | Health sensors |
| Tactical | `#CC6666` | `#FF9900` | Security dashboard |
| Operations | `#FFCC99` | `#FFCC66` | General use |

## FONT CUSTOMIZATION

### Using Local Fonts

1. Download Antonio font:
   ```bash
   wget https://fonts.google.com/download?family=Antonio -O antonio.zip
   unzip antonio.zip -d www/lcars/fonts/
   ```

2. Update `lcars-card-mod.css`:
   ```css
   @font-face {
     font-family: 'Antonio';
     src: url('/local/lcars/fonts/Antonio-Bold.ttf') format('truetype');
     font-weight: bold;
     font-style: normal;
   }
   ```

### Alternative Fonts

```css
/* Eurostile-like alternatives */
--lcars-font: 'Antonio', 'Eurostile', 'Microgramma', 'Bank Gothic', 'Helvetica', sans-serif;

/* More futuristic */
--lcars-font: 'Orbitron', 'Exo 2', 'Rajdhani', sans-serif;

/* Star Trek official (if available) */
--lcars-font: 'Star Trek', 'Starfleet', 'Antonio', sans-serif;
```

## DASHBOARD CUSTOMIZATION

### Adding New Rooms

In `quarters.yaml`, add a new section:

```yaml
# New Room Header
- type: custom:button-card
  template: lcars_header
  name: "OFFICE"
  
# New Room Lights
- type: horizontal-stack
  cards:
    - type: custom:button-card
      template: lcars_light_button
      entity: light.office_main
      name: "Main Lights"
      
    - type: custom:button-card
      template: lcars_light_button
      entity: light.office_desk
      name: "Desk Lamp"
```

### Adding New Scenes

In `quarters.yaml`, add to the scenes section:

```yaml
- type: custom:button-card
  template: lcars_scene_button
  entity: scene.my_custom_scene
  name: "Custom Scene"
  icon: mdi:star
  tap_action:
    action: call-service
    service: scene.turn_on
    target:
      entity_id: scene.my_custom_scene
```

## BUTTON TEMPLATES CUSTOMIZATION

### Creating New Button Styles

Add to `lcars-templates.yaml`:

```yaml
lcars_custom_button:
  template: lcars_base
  styles:
    card:
      - background: "#YOUR_COLOR"
      - border-radius: "0px 20px 20px 0px"
      - height: "50px"
    name:
      - color: "#000000"
      - font-size: "16px"
    icon:
      - color: "#000000"
  state:
    - value: "on"
      styles:
        card:
          - background: "#ACTIVE_COLOR"
```

### Responsive Button Sizes

```yaml
# Small buttons (for many items)
- height: "35px"
- font-size: "12px"
- border-radius: "0px 10px 10px 0px"

# Medium buttons (default)
- height: "45px"
- font-size: "14px"
- border-radius: "0px 15px 15px 0px"

# Large buttons (main actions)
- height: "60px"
- font-size: "18px"
- border-radius: "0px 25px 25px 0px"
```

## ADVANCED CARD MOD STYLING

### Custom Card Borders

```yaml
card_mod:
  style: |
    ha-card {
      border: 3px solid var(--lcars-orange) !important;
      border-radius: 0px 30px 0px 30px !important;
      box-shadow: 0 0 10px var(--lcars-orange) !important;
    }
```

### Animated Elements

```yaml
card_mod:
  style: |
    ha-card {
      animation: lcars-pulse 2s infinite;
    }
    @keyframes lcars-pulse {
      0% { box-shadow: 0 0 5px var(--lcars-orange); }
      50% { box-shadow: 0 0 20px var(--lcars-orange); }
      100% { box-shadow: 0 0 5px var(--lcars-orange); }
    }
```

### Gradient Backgrounds

```yaml
card_mod:
  style: |
    ha-card {
      background: linear-gradient(
        135deg,
        var(--lcars-purple) 0%,
        var(--lcars-orange) 50%,
        var(--lcars-purple) 100%
      ) !important;
    }
```

## ENTITY CUSTOMIZATION

### Custom State Displays

```yaml
- type: custom:button-card
  template: lcars_data_box
  entity: sensor.temperature
  show_state: true
  state_display: |
    [[[ 
      return states['sensor.temperature'].state + '°F';
    ]]]
```

### Conditional Styling

```yaml
- type: custom:button-card
  template: lcars_sensor_value
  entity: sensor.battery_level
  styles:
    card:
      - border-color: |
          [[[ 
            return parseInt(entity.state) < 20 
              ? '#CC6666'  // Red if low
              : '#FF9900'; // Orange if OK
          ]]]
```

## LAYOUT CUSTOMIZATION

### Changing Grid Layout

```yaml
- type: custom:layout-card
  layout_type: custom:grid-layout
  layout:
    grid-template-columns: 1fr 2fr 1fr  # Different column widths
    grid-template-rows: auto auto       # Multiple rows
    gap: 20px                           # Larger gaps
```

### Masonry Layout

```yaml
- type: custom:layout-card
  layout_type: custom:masonry-layout
  layout:
    width: 300    # Card width
    max_cols: 4   # Maximum columns
```

## SOUND CUSTOMIZATION

### Custom Alert Sounds

Edit `scripts.yaml`:

```yaml
lcars_custom_alert:
  alias: LCARS - Custom Alert
  sequence:
    - service: browser_mod/play_audio
      data:
        sound: /local/lcars/sounds/my-custom-sound.mp3
        volume: 0.7
  icon: mdi:bell-alert
```

## MOBILE OPTIMIZATION

### Mobile-Specific Styles

Add to `lcars-card-mod.css`:

```css
@media (max-width: 600px) {
  .lcars-button {
    height: 40px !important;
    font-size: 12px !important;
  }
  
  .lcars-header {
    height: 35px !important;
  }
  
  .lcars-header .card-header {
    font-size: 14px !important;
  }
}
```

## THEME VARIANTS

### Creating a "Dark Mode" Variant

Copy `star_trek_lcars.yaml` to `star_trek_lcars_dark.yaml`:

```yaml
Star Trek LCARS Dark:
  # Dimmed colors
  lcars-orange: "#994400"
  lcars-purple: "#664466"
  lcars-blue: "#444466"
  
  # Reduced brightness for nighttime
  primary-text-color: "#CC7A00"
  secondary-text-color: "#CC9966"
```

### Voyager Theme Variant

```yaml
Star Trek LCARS Voyager:
  # Voyager used slightly different colors
  lcars-orange: "#FFAA00"
  lcars-purple: "#CC88CC"
  lcars-blue: "#8888CC"
  lcars-red: "#CC5555"
```

## PERFORMANCE TIPS

### Reduce Card Count
- Combine multiple lights into one card using `entities` card
- Use `state-switch` to show/hide cards based on conditions

### Optimize Images
- Use WebP format for backgrounds
- Keep images under 500KB
- Use CSS gradients instead of images where possible

### Caching
- Add version strings to CSS: `lcars-card-mod.css?v=2`
- Set long cache headers in your reverse proxy

## DEBUGGING

### View CSS in Browser
1. Press F12 to open developer tools
2. Go to Elements tab
3. Select a card to see applied styles
4. Modify CSS in real-time to test changes

### Check Resources Loaded
1. Go to Network tab in developer tools
2. Refresh page
3. Look for any 404 errors
4. Verify all JS/CSS files load successfully

---

Need more help? Check the Home Assistant community forums for card-mod and button-card support!
