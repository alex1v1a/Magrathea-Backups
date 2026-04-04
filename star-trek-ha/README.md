# Star Trek LCARS Home Assistant Theme

🖖 A complete Star Trek LCARS (Library Computer Access/Retrieval System) theme implementation for Home Assistant with **5 interconnected dashboard views**.

![LCARS Theme Preview](https://raw.githubusercontent.com/th3jesta/ha-lcars/main/images/screenshots/dashboard_example.jpg)

## 🚀 What's Included

This package provides everything needed to implement an authentic LCARS interface in Home Assistant:

### Dashboard Views (5 Connected Stations)
| View | Path | Icon | Purpose | Color |
|------|------|------|---------|-------|
| **Bridge** | `/lcars-bridge` | ⭐ | Main command center, scenes, master controls | Orange (#FF9900) |
| **Engineering** | `/lcars-engineering` | 🔧 | Climate, HVAC, environmental sensors | Blue (#8899FF) |
| **Science** | `/lcars-science` | 🔭 | Data analysis, network stats, graphs | Purple (#CC99FF) |
| **Security** | `/lcars-security` | 🛡️ | Locks, alarms, cameras, motion sensors | Red (#CC4444) |
| **Quarters** | `/lcars-quarters` | 🛏️ | Bedroom, personal space, sleep modes | Peach (#FFAA90) |

### Navigation System
- **Master Navigation Configuration**: `dashboards/lcars-navigation.yaml`
- **Consistent Sidebar**: Every view includes navigation to all other views
- **Current View Highlighting**: Active view button is visually distinct
- **LCARS Styling**: Authentic pill-shaped navigation buttons

### Additional Components
- **Theme Files** - Multiple LCARS color schemes (Default, TNG, Nemesis, Lower Decks, Romulan, Cardassian, Klingon)
- **Helper Entities** - Configuration for sound, textures, and customization controls
- **Quick Start Dashboard** - Tutorial and reference guide
- **Wall Panel Dashboard** - Optimized for touchscreens with sidebar navigation

---

## 📸 Screenshots

### Bridge - Main Command
![Bridge Dashboard](docs/screenshots/bridge-screenshot.png)
*Main command center with scene controls, master switches, and media players*

### Engineering - Systems Control
![Engineering Dashboard](docs/screenshots/engineering-screenshot.png)
*Climate control, zone management, and environmental monitoring*

### Science - Data Analysis
![Science Dashboard](docs/screenshots/science-screenshot.png)
*Sensor data, network analysis, and system statistics*

### Security - Protection Systems
![Security Dashboard](docs/screenshots/security-screenshot.png)
*Alarm controls, door locks, motion sensors, and cameras*

### Quarters - Personal Space
![Quarters Dashboard](docs/screenshots/quarters-screenshot.png)
*Bedroom controls, sleep modes, and personal media*

---

## 📦 Installation

### Prerequisites

```bash
# Install via HACS:
- card-mod (required)
- my-slider-v2 (for advanced controls)
- layout-card (optional, for wall panel)
```

### Step 1: Add Font Resource

Go to **Settings → Dashboards → ⋮ (3 dots) → Resources**

Add as **Stylesheet**:
```
https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap
```

Or for Tungsten font (more authentic):
1. Download from: https://fontdownloader.net/tungsten-font/
2. Place in `/www/community/fonts/`
3. Add resource: `/hacsfiles/fonts/tungsten.css`

### Step 2: Add JavaScript Resource

Add as **JavaScript Module**:
```
https://cdn.jsdelivr.net/gh/th3jesta/ha-lcars@js-main/lcars.js
```

### Step 3: Install Theme

1. Copy `themes/lcars/` folder to your Home Assistant `themes/` directory
2. Restart Home Assistant
3. Go to your **Profile** and select "LCARS Default" theme

### Step 4: Create Helper Entities

Add the contents of `lcars-helpers.yaml` to your configuration, or create them via UI:

**Settings → Devices & Services → Helpers → Create Helper**

Required helpers:
| Name | Type | ID |
|------|------|-----|
| LCARS Sound | Toggle | `input_boolean.lcars_sound` |
| LCARS Texture | Toggle | `input_boolean.lcars_texture` |
| LCARS Horizontal | Number | `input_number.lcars_horizontal` (6-60) |
| LCARS Vertical | Number | `input_number.lcars_vertical` (26-60) |

### Step 5: Install All 5 Dashboard Views

#### Option A: Raw Configuration Editor (Recommended)

1. Go to **Settings → Dashboards → Add Dashboard**
2. Create a new **Panel** dashboard for each view
3. Click the ⋮ menu → **Edit Dashboard** → **Raw configuration editor**
4. Paste the contents of each dashboard file:
   - `dashboards/lcars-bridge.yaml`
   - `dashboards/lcars-engineering.yaml`
   - `dashboards/lcars-science.yaml`
   - `dashboards/lcars-security.yaml`
   - `dashboards/lcars-quarters.yaml`

#### Option B: UI Configuration

1. Create 5 new dashboards with these exact paths:
   - `/lcars-bridge`
   - `/lcars-engineering`
   - `/lcars-science`
   - `/lcars-security`
   - `/lcars-quarters`

2. Set the icons:
   - Bridge: `mdi:star-four-points`
   - Engineering: `mdi:engine`
   - Science: `mdi:telescope`
   - Security: `mdi:shield`
   - Quarters: `mdi:bed`

3. Copy the card configurations from each YAML file

### Step 6: Set Default Dashboard (Optional)

1. Go to **Settings → Dashboards**
2. Find your Bridge dashboard
3. Click the star ⭐ to make it the default

---

## 🧭 Navigation Guide

### Moving Between Views

Each dashboard includes a **left sidebar navigation panel** with buttons for all 5 views:

```
┌─────────────────────────────────────┐
│  NAVIGATION         [Bridge View]   │
│                                     │
│  ⭐ BRIDGE       ← Active (lit)    │
│  🔧 ENGINEERING                     │
│  🔭 SCIENCE                         │
│  🛡️ SECURITY                        │
│  🛏️ QUARTERS                        │
│                                     │
│  ───────────────────────────────    │
│  USS HOME                           │
└─────────────────────────────────────┘
```

### Navigation Features

- **One-Click Navigation**: Tap any button to jump to that view
- **Visual Feedback**: Current view has a **highlighted border** and **lighter background**
- **Consistent Layout**: Navigation is in the same position on every view
- **LCARS Styling**: Authentic pill-shaped buttons with proper colors

### Color Coding by Department

Each view has a unique color scheme following Star Trek LCARS conventions:

| Department | Color | Hex Code | Meaning |
|------------|-------|----------|---------|
| Bridge | Orange | `#FF9900` | Command/Primary |
| Engineering | Blue | `#8899FF` | Technical/Systems |
| Science | Purple | `#CC99FF` | Data/Analysis |
| Security | Red | `#CC4444` | Alert/Protection |
| Quarters | Peach | `#FFAA90` | Comfort/Personal |

---

## 📋 Dashboard Classes Reference

### Header Classes (Blue bars)
- `header-left` - Left-aligned blue header
- `header-right` - Right-aligned blue header
- `header-contained` - Centered header
- `header-open` - Open-ended header

### Middle Classes (Red/purple side bars)
- `middle-left` - Left side bar
- `middle-right` - Right side bar
- `middle-contained` - Centered middle section
- `middle-blank` - No side styling

### Footer Classes (Gray bars)
- `footer-left`, `footer-right`, `footer-contained`, `footer-open`

### Button Classes
- `button-small` - Square button
- `button-large` - Large rounded button
- `button-lozenge-left/right` - Pill-shaped
- `button-bullet-left/right` - Half-rounded
- `button-capped-left/right` - Capped style
- `button-barrel-left/right` - Rectangular
- `button-bar-left/right` - Bar-style with icon/state

---

## 🎨 Available Themes

| Theme | Description | Best For |
|-------|-------------|----------|
| LCARS Default | Classic orange/purple | General use |
| LCARS Next Generation | Brighter colors | TNG fans |
| LCARS Nemesis | Blue/dark theme | Picard era |
| LCARS Lower Decks | Animated series | Cartoon style |
| LCARS Romulus | Green accents | Romulan aesthetic |
| LCARS Cardassia | Brown/amber | DS9 style |
| LCARS Kronos | Red-based | Klingon theme |

---

## 🖼️ Wall Panel Setup

For a dedicated wall-mounted LCARS panel:

### Hardware Recommendations
- **7-10" touchscreen display**
- **Raspberry Pi 4/5** or old Android tablet
- **Wall mount** with integrated power

### Software Configuration
1. Install kiosk-mode: `https://github.com/NemesisRE/kiosk-mode`
2. Add `?kiosk` to your dashboard URL
3. Configure auto-start browser in fullscreen

### Dashboard Optimization
- Use the included `lcars-wall-panel.yaml` for touch-optimized layout
- Use larger buttons for touch
- Limit to essential controls
- Consider custom:layout-card for precise positioning

---

## 🎨 Color Reference

```yaml
# Core Colors
Orange:    #FF9900  # Primary action / Bridge
Peach:     #FFAA90  # Secondary / Quarters
Purple:    #CC99FF  # Accent / Science
Violet:    #9966FF  # Highlight
Blue:      #8899FF  # Information / Engineering
Red:       #CC4444  # Alert/Warning / Security
Yellow:    #FFCC99  # Caution
Green:     #999933  # Success
Black:     #000000  # Background
White:     #F5F6FA  # Text
```

---

## 🔧 Customization

### Modifying Navigation

The navigation configuration is stored in `dashboards/lcars-navigation.yaml`. You can:

1. **Change the order** of navigation buttons
2. **Add new views** by copying the navigation pattern
3. **Modify styling** by editing the `style:` sections
4. **Add icons** using any Material Design Icon (`mdi:icon-name`)

### Adding a New View

1. Create a new dashboard file in `dashboards/`
2. Copy the navigation sidebar from any existing view
3. Update the **active view highlighting** to your new view
4. Add a new button to **all other views** linking to your new view

### Changing the Ship Name

Replace "USS HOME" in the navigation footers with your own ship name:

```yaml
content: '## USS ENTERPRISE'
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Font not loading | Check resource URL in Dashboard > Resources |
| Cards not styled | Ensure card-mod is installed and working |
| Mobile layout broken | Add `grid_options: rows: auto` to buttons |
| CSS not applying | Reload page or restart HA |
| Navigation not working | Verify dashboard paths match exactly |
| Icons not showing | Install Material Design Icons integration |

---

## 📁 File Structure

```
star-trek-ha/
├── dashboards/
│   ├── lcars-bridge.yaml        # Main command center
│   ├── lcars-engineering.yaml   # Climate & systems
│   ├── lcars-science.yaml       # Data & sensors
│   ├── lcars-security.yaml      # Locks & alarms
│   ├── lcars-quarters.yaml      # Bedroom & personal
│   ├── lcars-navigation.yaml    # Master navigation config
│   ├── lcars-main.yaml          # Original main dashboard
│   ├── lcars-quick-start.yaml   # Tutorial dashboard
│   └── lcars-wall-panel.yaml    # Touchscreen optimized
├── themes/
│   └── lcars/
│       └── lcars.yaml           # Theme definitions
├── www/
│   └── community/
│       └── fonts/               # Custom fonts
├── lcars-helpers.yaml           # Helper entities config
├── wall-panel-helpers.yaml      # Wall panel helpers
├── README.md                    # This file
├── IMPLEMENTATION_GUIDE.md      # Detailed setup guide
├── QUICK_REFERENCE.md           # Quick command reference
└── TROUBLESHOOTING.md           # Common issues & fixes
```

---

## 📚 Resources

- **HA-LCARS GitHub**: https://github.com/th3jesta/ha-lcars
- **CB-LCARS (Advanced)**: https://github.com/snootched/cb-lcars
- **LCARS Color Reference**: https://www.thelcars.com
- **Home Assistant Community**: https://community.home-assistant.io/t/star-trek-lcars-theme/511391
- **Material Design Icons**: https://materialdesignicons.com/

---

## 🙏 Credits

- Original HA-LCARS theme by [th3jesta](https://github.com/th3jesta)
- CB-LCARS components by [snootched](https://github.com/snootched)
- Color codes from [TheLCARS.com](https://www.thelcars.com)
- LCARS design inspired by Star Trek: The Next Generation
- Navigation system created for multi-dashboard LCARS interface

---

## 📄 License

This implementation package is provided as-is for personal use.
Star Trek and LCARS are trademarks of CBS Studios Inc.

---

*"Computers make excellent and efficient servants, but I have no wish to serve under them."* — Spock

**Live long and prosper!** 🖖
