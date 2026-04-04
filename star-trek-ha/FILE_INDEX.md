# Star Trek LCARS Home Assistant - File Index

## Package Contents

### 📚 Documentation
| File | Description |
|------|-------------|
| `README.md` | Main readme with quick start, navigation guide, and installation |
| `IMPLEMENTATION_GUIDE.md` | Comprehensive implementation guide |
| `TROUBLESHOOTING.md` | Common issues and solutions |
| `QUICK_REFERENCE.md` | Quick command reference |
| `FILE_INDEX.md` | This file - complete package index |

### ⚙️ Configuration Files
| File | Description |
|------|-------------|
| `lcars-helpers.yaml` | Helper entities configuration |
| `wall-panel-helpers.yaml` | Additional helpers for wall panel |

### 🎨 Theme Files
| File | Description |
|------|-------------|
| `themes/lcars/lcars.yaml` | Main theme file with 7 variants (Default, TNG, Nemesis, Lower Decks, Romulan, Cardassian, Klingon) |

### 🖼️ Asset Files
| File | Description |
|------|-------------|
| `www/community/fonts/tungsten.css` | Tungsten font CSS (optional) |
| `docs/screenshots/` | Screenshot placeholder directory |

### 📊 Dashboard Views (5-View Navigation System)
| File | Description | Path | Color |
|------|-------------|------|-------|
| `dashboards/lcars-navigation.yaml` | Master navigation configuration | - | - |
| `dashboards/lcars-bridge.yaml` | Main command center | `/lcars-bridge` | Orange |
| `dashboards/lcars-engineering.yaml` | Climate & environmental systems | `/lcars-engineering` | Blue |
| `dashboards/lcars-science.yaml` | Data analysis & sensors | `/lcars-science` | Purple |
| `dashboards/lcars-security.yaml` | Locks, alarms & cameras | `/lcars-security` | Red |
| `dashboards/lcars-quarters.yaml` | Bedroom & personal space | `/lcars-quarters` | Peach |

### 📊 Additional Dashboards
| File | Description |
|------|-------------|
| `dashboards/lcars-main.yaml` | Original main control dashboard |
| `dashboards/lcars-wall-panel.yaml` | Wall-mounted panel dashboard with sidebar |
| `dashboards/lcars-quick-start.yaml` | Quick start guide dashboard |

---

## 🚀 Quick Installation (5-View System)

### Step 1: Prerequisites
- Install HACS (if not already installed)
- Install **card-mod** via HACS (required)
- Install **layout-card** via HACS (optional, for wall panel)
- Enable themes in configuration.yaml

### Step 2: Install Theme
```bash
# Copy theme files
cp -r themes/lcars /config/themes/

# Or manually copy lcars.yaml to config/themes/lcars/
```

### Step 3: Add Resources
1. Go to **Settings → Dashboards → ⋮ → Resources**
2. Add Font (Stylesheet):
   ```
   https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap
   ```
3. Add JavaScript (Module):
   ```
   https://cdn.jsdelivr.net/gh/th3jesta/ha-lcars@js-main/lcars.js
   ```

### Step 4: Configure
1. Add helpers from `lcars-helpers.yaml` to your configuration
2. Restart Home Assistant

### Step 5: Create Dashboards
Create 5 dashboards with these exact paths:

| Dashboard Title | Path | File to Copy |
|-----------------|------|--------------|
| LCARS Bridge | `/lcars-bridge` | `dashboards/lcars-bridge.yaml` |
| LCARS Engineering | `/lcars-engineering` | `dashboards/lcars-engineering.yaml` |
| LCARS Science | `/lcars-science` | `dashboards/lcars-science.yaml` |
| LCARS Security | `/lcars-security` | `dashboards/lcars-security.yaml` |
| LCARS Quarters | `/lcars-quarters` | `dashboards/lcars-quarters.yaml` |

### Step 6: Activate
1. Go to your **Profile**
2. Select **LCARS Default** theme
3. Navigate to any dashboard and use the sidebar to move between views

---

## 🧭 Navigation System

### Master Navigation File
The `lcars-navigation.yaml` file contains reusable navigation components:
- `navigation_sidebar_bridge` - Navigation with Bridge highlighted
- `navigation_sidebar_engineering` - Navigation with Engineering highlighted
- `navigation_sidebar_science` - Navigation with Science highlighted
- `navigation_sidebar_security` - Navigation with Security highlighted
- `navigation_sidebar_quarters` - Navigation with Quarters highlighted
- `top_navigation_bar` - Horizontal navigation alternative

### Current View Highlighting
Each view has a highlighted button indicating the current location:
```yaml
style: |
  ha-card {
    background: #FFCC99 !important;
    border-left: 8px solid #FF9900 !important;
  }
```

### Color Coding
| Department | Color | Hex | Meaning |
|------------|-------|-----|---------|
| Bridge | Orange | #FF9900 | Command |
| Engineering | Blue | #8899FF | Technical |
| Science | Purple | #CC99FF | Data |
| Security | Red | #CC4444 | Alert |
| Quarters | Peach | #FFAA90 | Comfort |

---

## 📋 Quick Reference

### LCARS Color Codes
```
Orange:    #FF9900  Primary action color / Bridge
Peach:     #FFAA90  Secondary accent / Quarters
Purple:    #CC99FF  Accent / Science
Violet:    #9966FF  Highlight
Blue:      #8899FF  Headers / Engineering
Red:       #CC4444  Alerts / Security
Yellow:    #FFCC99  Caution
Green:     #999933  Success
Black:     #000000  Background
White:     #F5F6FA  Text
```

### Required Helpers
- `input_boolean.lcars_sound` - Toggle sound effects
- `input_boolean.lcars_texture` - Toggle texture effect
- `input_number.lcars_horizontal` - Horizontal border width (6-60)
- `input_number.lcars_vertical` - Vertical border width (26-60)
- `sensor.time` - Time sensor for clock

### Popular Card Classes
**Headers:** `header-left`, `header-right`, `header-contained`
**Buttons:** `button-lozenge-left`, `button-lozenge-right`, `button-small`, `button-bullet-left`, `button-bullet-right`
**Middle:** `middle-left`, `middle-right`, `middle-contained`
**Footers:** `footer-left`, `footer-right`, `footer-contained`

### Material Design Icons Used
- `mdi:star-four-points` - Bridge
- `mdi:engine` - Engineering
- `mdi:telescope` - Science
- `mdi:shield` - Security
- `mdi:bed` - Quarters
- `mdi:lightbulb` - Lighting
- `mdi:lock` - Locks
- `mdi:thermometer` - Climate

---

## 📚 External Resources

- **HA-LCARS GitHub:** https://github.com/th3jesta/ha-lcars
- **CB-LCARS (Advanced):** https://github.com/snootched/cb-lcars
- **Color Reference:** https://www.thelcars.com/colors.php
- **Community Forum:** https://community.home-assistant.io/t/star-trek-lcars-theme/511391
- **Material Design Icons:** https://materialdesignicons.com/

---

*Package Version: 2.0 - Multi-View Navigation System*
*Created for Home Assistant LCARS Implementation*
