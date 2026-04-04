# Star Trek LCARS Home Assistant Implementation Package

## Executive Summary

This package provides a complete solution for implementing a Star Trek LCARS-themed Home Assistant dashboard. LCARS (Library Computer Access/Retrieval System) is the computer interface seen in Star Trek: The Next Generation, Voyager, and Deep Space Nine.

## Best Examples Found

### 1. HA-LCARS Theme (Primary Recommendation)
**Repository:** https://github.com/th3jesta/ha-lcars

**Features:**
- The definitive LCARS theme for Home Assistant
- Built using card-mod (CSS/JS, no extra assets required besides font)
- Multiple color themes included:
  - Classic (TNG era)
  - 25th Century
  - Next Generation
  - Lower Decks
  - Romulus
  - Cardassia
  - Kronos
  - Nemesis
- LCARS-style sidebar menu
- Themed stacks (vertical/horizontal)
- Button classes: lozenge, bullet, capped, barrel, bar styles
- Header, middle, and footer section classes
- Mobile responsive
- Sound effects toggle
- Texture/grain pattern toggle
- Customizable border widths

### 2. CB-LCARS (Advanced Components)
**Repository:** https://github.com/snootched/cb-lcars

**Features:**
- Built on custom-button-card with enhanced features
- Designed to work with HA-LCARS theme
- LCARS elbows, buttons, sliders/gauges
- LCARS labels and DPAD controls
- Animations: Alert, Data Cascade, Pulsewave, Grid, Geo Array
- Symbiont mode (encapsulate other cards)
- Color-matching to light entities
- State-responsive styling

### 3. TheLCARS.com (Color Reference)
**Website:** https://www.thelcars.com

**Official LCARS Color Codes:**
- **Orange:** #ff9900, #ff8800, #ff9966
- **Peach:** #ffaa90, #ffbbaa
- **Purple/Violet:** #cc99ff, #9966ff, #cc55ff
- **Blue:** #5566ff, #8899ff, #99ccff
- **Red:** #cc4444, #ff5555
- **Black:** #000000 (background)
- **Space White:** #f5f6fa (text)

## Required Dependencies

### Required HACS Components:
1. **lovelace-card-mod** - Essential for theme styling
2. **HA-LCARS theme** - Base theme files
3. **my-slider-v2** (for CB-LCARS multimeter controls)

### Optional but Recommended:
4. **lovelace-layout-card** - Enhanced layout options
5. **kiosk-mode** - Hide header/sidebar for wall panels
6. **CB-LCARS** - Advanced LCARS components

## LCARS Color Palette Reference

```yaml
# Core LCARS Colors (TNG/DS9/Voyager)
lcars-orange: "#FF9900"        # Primary interface orange
lcars-orange-light: "#FFAA90"  # Lighter peach/orange
lcars-orange-dark: "#CC6600"   # Darker orange
lcars-purple: "#CC99FF"        # Purple accent
lcars-violet: "#9966FF"        # Violet accent
lcars-blue: "#8899FF"          # Blue accent
lcars-red: "#CC4444"           # Alert/Warning red
lcars-yellow: "#FFCC99"        # Gold/sand yellow
lcars-green: "#999933"         # Olive green
lcars-black: "#000000"         # Background
lcars-gray: "#666688"          # UI gray
lcars-white: "#F5F6FA"         # Text white

# Nemesis/Picard Era Colors
picard-blue: "#6699FF"
picard-midnight: "#2233FF"
picard-ghost: "#88BBFF"
picard-tangerine: "#FF8833"
picard-pumpkin: "#FF7744"
```

## Font Requirements

**Primary Font Options:**
1. **Tungsten** - Actual font used in Picard (closest to authentic LCARS)
   - Download: https://fontdownloader.net/tungsten-font/
   - Files needed: Tungsten-Medium.woff2, Tungsten-Bold.woff2

2. **Antonio** - Free Google Fonts alternative
   - URL: https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap

**Secondary Fonts (included in CB-LCARS):**
- Microgramma
- Jeffries

## File Structure

```
config/
├── themes/
│   └── lcars/
│       ├── lcars.yaml          # Main theme file
│       └── cb-lcars-lcars.yaml # CB-LCARS color scheme
├── www/
│   ├── community/
│   │   └── fonts/
│   │       ├── Tungsten-Medium.woff2
│   │       ├── Tungsten-Bold.woff2
│   │       └── tungsten.css
│   └── lcars/
│       ├── backgrounds/
│       │   └── lcars-bg.jpg
│       └── icons/
└── dashboards/
    └── lcars-main.yaml
```

## Dashboard Layout Philosophy

### LCARS Layout Structure:
```
┌─────────────────────────────────────────────────────┐
│ [HEADER LEFT] Title                    [HEADER RIGHT]│
├─────────────────────────────────────────────────────┤
│ [MIDDLE]                                            │
│  ┌─────────────────────────────────────────────┐    │
│  │ Content Area                                │    │
│  │ - Entity cards                             │    │
│  │ - Buttons                                  │    │
│  │ - Gauges                                   │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│ [FOOTER]                                    [RIGHT] │
└─────────────────────────────────────────────────────┘
```

### Section Types:
1. **Header** - Blue bar with title
2. **Middle** - Red/purple side bars with content
3. **Footer** - Gray bar at bottom

### Button Styles:
- **Lozenge** - Pill-shaped (most common)
- **Bullet** - Rounded on one side, square on other
- **Capped** - Similar to bullet but capped end
- **Barrel** - Rectangular with rounded ends
- **Small** - Square buttons for grids

## Sound Effects

The HA-LCARS theme supports audio feedback:
- Button press sounds
- Interface sounds
- Requires input_boolean.lcars_sound helper

## Implementation Checklist

### Phase 1: Prerequisites
- [ ] Install HACS (Home Assistant Community Store)
- [ ] Install card-mod via HACS
- [ ] Enable themes in configuration.yaml
- [ ] Create themes folder

### Phase 2: Theme Installation
- [ ] Download HA-LCARS theme
- [ ] Add to themes folder
- [ ] Add font resources (Tungsten or Antonio)
- [ ] Add LCARS JavaScript file
- [ ] Restart Home Assistant

### Phase 3: Helper Entities
- [ ] Create input_boolean.lcars_sound
- [ ] Create input_boolean.lcars_texture
- [ ] Create input_number.lcars_vertical (26-60)
- [ ] Create input_number.lcars_horizontal (6-60)
- [ ] Create sensor.time (Time & Date integration)
- [ ] Optional: input_number.lcars_menu_font
- [ ] Optional: sensor.lcars_header

### Phase 4: Dashboard Creation
- [ ] Create dedicated LCARS dashboard
- [ ] Configure theme in profile
- [ ] Build sections with header/middle/footer
- [ ] Add buttons with appropriate classes
- [ ] Test on mobile and desktop

### Phase 5: Advanced Features (Optional)
- [ ] Install CB-LCARS for advanced components
- [ ] Add animations (Alert, Data Cascade)
- [ ] Configure kiosk mode for wall panels
- [ ] Add custom background images
- [ ] Configure sound effects

## Common Card Classes Reference

### Headers:
- `header-left` - Left-aligned header bar
- `header-right` - Right-aligned header bar
- `header-contained` - Centered header
- `header-open` - Open-ended header

### Middle Sections:
- `middle-left` - Left side bar
- `middle-right` - Right side bar
- `middle-contained` - Centered middle
- `middle-blank` - No side bars

### Footers:
- `footer-left`, `footer-right`, `footer-contained`, `footer-open`

### Buttons:
- `button-small` - Square button
- `button-large` - Large rounded button
- `button-lozenge-left/right` - Pill button
- `button-bullet-left/right` - Half-rounded
- `button-capped-left/right` - Capped style
- `button-barrel-left/right` - Full rectangle
- `button-bar-left/right` - Bar-style button

### Bars (for markdown/heading cards):
- `bar-left`, `bar-right`, `bar-large-left`, `bar-large-right`

## Example Dashboard Layouts

### 1. Main Control Panel
- Header: "USS HOME - Main Controls"
- Middle: Room controls (lights, climate)
- Footer: System status

### 2. Environmental Controls
- Header: "Environmental Systems"
- Middle: Thermostats, humidity sensors
- Footer: Energy monitoring

### 3. Security Station
- Header: "Security Station"
- Middle: Cameras, door locks, sensors
- Footer: Alarm controls

## Hardware Recommendations

### Wall Panel Setup:
- **Screen:** 7-10 inch touchscreen (Samsung Tab A9, old tablet, or Raspberry Pi touchscreen)
- **Compute:** Raspberry Pi 4/5, Banana Pi M4 Zero
- **Mount:** Custom wood frame or 3D printed mount
- **Power:** In-wall USB outlet

### Mobile/Tablet:
- Any tablet running Home Assistant app
- Works well with older Android tablets

## Troubleshooting

### Common Issues:
1. **Font not loading** - Check resource URL in Dashboard > Resources
2. **Cards not themed** - Ensure card-mod is installed and working
3. **Mobile layout issues** - Use grid_options with rows: auto
4. **CSS not loading** - Reload page or check extra_module_url in config

### Performance Tips:
- Limit dashboard to essential cards for wall panels
- Use grid layout for better organization
- Consider custom:layout-card for complex layouts
- Enable caching for fonts and JS

## Resources

- **HA-LCARS GitHub:** https://github.com/th3jesta/ha-lcars
- **CB-LCARS GitHub:** https://github.com/snootched/cb-lcars
- **TheLCARS.com:** https://www.thelcars.com
- **Home Assistant Community:** https://community.home-assistant.io/t/star-trek-lcars-theme/511391
- **Card-Mod:** https://github.com/thomasloven/lovelace-card-mod
- **LCARS Builder Reference:** https://www.mewho.com/titan

---

*Live long and prosper! 🖖*
