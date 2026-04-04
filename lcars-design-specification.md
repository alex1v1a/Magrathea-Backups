# LCARS Design Specification for Home Assistant

## Research Summary: Star Trek LCARS UI Design Patterns for Home Assistant Themes

---

## 1. Color Schemes (TNG Era)

### Official LCARS Colors (from TheLCARS.com)

#### Classic Theme Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| African Violet | `#cc99ff` | Accent/Decorative |
| Almond | `#ffaa90` | Secondary button |
| Almond Creme | `#ffbbaa` | Light accent |
| Blue | `#5566ff` | Information/Header |
| Bluey | `#8899ff` | Secondary blue |
| Butterscotch | `#ff9966` | Warning indicators |
| Gold | `#ffaa00` | Primary accent |
| Golden Orange | `#ff9900` | Active states |
| Gray | `#666688` | Disabled/Inactive |
| Green | `#999933` | Success states |
| Ice | `#99ccff` | Cool accent |
| Lilac | `#cc55ff` | Decorative |
| Lima Bean | `#cccc66` | Muted accent |
| Magenta | `#cc5599` | Alert/Danger |
| Mars | `#ff2200` | Critical alert |
| Moonlit Violet | `#9966ff` | Purple accent |
| Orange | `#ff8800` | Primary button |
| Peach | `#ff8866` | Warm accent |
| Red | `#cc4444` | Error/Stop |
| Sky | `#aaaaff` | Light blue |
| Space White | `#f5f6fa` | Text/Content |
| Sunflower | `#ffcc99` | Highlight |
| Tomato | `#ff5555` | Warning |
| Violet Creme | `#ddbbff` | Soft accent |

#### Nemesis Blue Theme (Film Era)
| Color Name | Hex Code |
|------------|----------|
| Cardinal | `#cc2233` |
| Cool | `#6699ff` |
| Evening | `#2266ff` |
| Galaxy Gray | `#52526a` |
| Ghost | `#88bbff` |
| Grape | `#9966cc` |
| Honey | `#ffcc99` |
| Lawn | `#99aa22` |
| Martian | `#99cc33` |
| Midnight | `#2233ff` |
| Moonbeam | `#ebf0ff` |
| Pumpkinshade | `#ff7744` |
| Roseblush | `#cc6666` |
| Tangerine | `#ff8833` |
| Wheat | `#ccaa88` |

#### Star Trek: Picard Season 1 Palette
| Hex Code | Usage |
|----------|-------|
| `#E7442A` | Primary accent (red-orange) |
| `#9EA5BA` | Secondary gray-blue |
| `#6D748C` | Medium gray |
| `#2F3749` | Dark background |
| `#111419` | Deepest black |

#### TNG Core Palette (Memory Alpha)
| Hex Code | Description |
|----------|-------------|
| `#c1c730` | Chartreuse/Green-yellow |
| `#a71313` | Dark Red (alert) |
| `#2b53a7` | Federation Blue |
| `#000000` | Deep space black |
| `#d6a444` | Gold/Tan |

### CSS Color Variables for HA Themes
```yaml
# Primary LCARS Palette
lcars-orange: '#ff9900'
lcars-gold: '#ffaa00'
lcars-red: '#cc4444'
lcars-blue: '#5566ff'
lcars-purple: '#cc99ff'
lcars-tan: '#ddbb99'
lcars-peach: '#ffbb99'

# Backgrounds
lcars-black: '#000000'
lcars-dark-gray: '#111419'
lcars-med-gray: '#2f3749'
```

---

## 2. Typography and Font Recommendations

### Official LCARS Fonts

#### Primary Font: Helvetica Ultra Compressed
- **Used by**: Michael Okuda (LCARS designer) for most TNG displays
- **Usage**: Headers, labels, button text
- **Characteristics**: Extremely condensed, uppercase-heavy

#### Alternative Options

| Font Name | Source | Best For | Notes |
|-----------|--------|----------|-------|
| **Antonio** | Google Fonts | Modern LCARS | Recommended by TheLCARS.com; weights 100-700 |
| **Tungsten** | Font Downloader | Star Trek: Picard | Actual font from Picard series |
| **Swiss 911 Ultra Compressed** | Bitstream | Accurate TNG replica | Clone of Helvetica Ultra Compressed |
| **Compacta Light** | Letraset | Early TNG LCARS | Used in "Encounter at Farpoint" |
| **Microgramma** | Linotype | Film-era LCARS | Used in Star Trek II-VI |
| **Eurostile** | Various | Alternative to Microgramma | Similar characteristics |

### Font Implementation for Home Assistant

#### Google Fonts (Antonio) - Easiest Method
```yaml
# Add to Dashboard Resources
https://fonts.googleapis.com/css2?family=Antonio:wght@100;200;300;400;500;600;700&display=swap
```

#### Self-Hosted Tungsten (Most Authentic)
```yaml
# Download from Font Downloader
# Place in: /www/community/fonts/
# Files needed:
# - Tungsten-Medium.woff2
# - Tungsten-Bold.woff2
# - Tungsten.css
```

### Typography Guidelines

| Element | Font Weight | Size | Transform |
|---------|-------------|------|-----------|
| Headers | 700 (Bold) | 2em+ | UPPERCASE |
| Labels | 400 (Regular) | 1em | UPPERCASE |
| Buttons | 400-500 | 0.9-1.1em | UPPERCASE |
| Data/Status | 300 (Light) | 0.8em | Mixed case ok |
| Small labels | 200-300 | 0.7em | UPPERCASE |

---

## 3. Layout Patterns and Button Styles

### Core Layout Components

#### 1. The "Elbow"
The iconic curved corner piece that connects horizontal and vertical bars.
- **Styles**: Left-top, right-top, left-bottom, right-bottom
- **Usage**: Frame corners of content areas
- **Colors**: Usually matches header or accent color

#### 2. Header Bars
- **Purpose**: Section titles, navigation headers
- **Height**: 1/3 of standard unit (approx 30-40px)
- **Shape**: Full-width with rounded ends (left-end, right-end classes)
- **Decoration**: Optional stripe on rounded end

#### 3. Vertical Side Bars
- **Purpose**: Navigation, decorative framing
- **Width**: 26-60px (configurable)
- **Position**: Left or right side of content area

#### 4. Footer Bars
- Similar to headers but typically different color
- Often gray or muted tone
- Used to close/complete a section

### Button Style Patterns

| Button Type | Description | CSS border-radius |
|-------------|-------------|-------------------|
| **Lozenge** | Full pill shape (both ends rounded) | `999px` or `50%` |
| **Bullet** | One rounded end, one flat | `50% 0 0 50%` (left) |
| **Capped** | Flat side has small end cap | Custom clip-path or SVG |
| **Barrel** | Rectangular, no rounding | `0` |
| **Small Button** | Square/minimal rounding | `4px` or `0` |

### LCARS Grid System

```
Unit-based sizing (multiples of base unit):
- Standard unit: ~30-40px
- Horizontal bars: 1/3 unit height (~10-13px)
- Vertical bars: 1 unit width (~30-40px)
- Spacing: Base unit or half unit
```

### Section Layout Pattern
```
[HEADER BAR]        [ELBOW]
    |
[VERTICAL BAR] + [CONTENT AREA]
    |
[FOOTER BAR]        [ELBOW]
```

---

## 4. Existing Home Assistant LCARS Themes

### Primary: ha-lcars by th3jesta
**Repository**: https://github.com/th3jesta/ha-lcars

#### Features
- Complete LCARS theme with 10+ color variants
- Built on card-mod for CSS injection
- Custom JavaScript for sidebar/header theming
- Configurable border widths via helpers
- Sound toggle support
- Texture/grain effect option

#### Included Themes
1. **LCARS Default** - Classic TNG orange/tan/purple
2. **LCARS 25th Century** - Modern blue accent
3. **LCARS Next Generation** - Classic TNG
4. **LCARS Lower Decks** - Animated series colors
5. **LCARS Romulus** - Green Romulan theme
6. **LCARS Cardassia** - Teal/blue Cardassian
7. **LCARS Kronos** - Red Klingon theme
8. **LCARS Nemesis** - Blue film-era
9. **LCARS Picard** - Modern Picard series

#### Card Classes Available
| Class | Purpose |
|-------|---------|
| `header-left` / `header-right` | Top section headers |
| `header-contained` / `header-open` | Header variants |
| `middle-left` / `middle-right` | Side bars |
| `middle-contained` / `middle-blank` | Middle section variants |
| `footer-left` / `footer-right` | Bottom section |
| `footer-contained` / `footer-open` | Footer variants |
| `button-small` | Compact buttons |
| `button-large` | Standalone rounded buttons |
| `button-lozenge-left` / `right` | Full pill buttons |
| `button-bullet-left` / `right` | Half-pill buttons |
| `button-capped-left` / `right` | Pill with cap |
| `button-barrel-left` / `right` | Rectangular buttons |
| `button-bar-left` / `right` | Header-style buttons |
| `bar-left` / `bar-right` | Decorative bars |

### Secondary: cb-lcars by snootched
**Repository**: https://github.com/snootched/cb-lcars

#### Features
- Custom button cards built on custom-button-card
- LCARS elbows, buttons, multimeters (sliders)
- Symbiont mode (encapsulate other cards)
- Animations: Alert, Data Cascade, Pulsewave
- Built-in D-pad control
- State-responsive styling

#### Card Types
- `cb-lcars-elbow-card` - Corner pieces
- `cb-lcars-button-card` - Various button styles
- `cb-lcars-multimeter-card` - Sliders/gauges
- `cb-lcars-label-card` - Text labels
- `cb-lcars-dpad-card` - Directional pad

---

## 5. CSS/Card-Mod Styling Approaches

### Base CSS Structure for LCARS

```css
/* LCARS Base Variables */
:root {
  /* Colors */
  --lcars-orange: #ff9900;
  --lcars-gold: #ffaa00;
  --lcars-red: #cc4444;
  --lcars-blue: #5566ff;
  --lcars-purple: #cc99ff;
  --lcars-tan: #ddbb99;
  --lcars-peach: #ffbb99;
  --lcars-gray: #666688;
  --lcars-black: #000000;
  --lcars-space-white: #f5f6fa;
  
  /* Sizing */
  --lcars-unit: 40px;
  --lcars-border-width: 30px;
  --lcars-border-height: 8px;
  
  /* Font */
  --lcars-font: 'Antonio', 'Helvetica Ultra Compressed', sans-serif;
}

/* Pill Button Base */
.lcars-pill {
  border-radius: 999px;
  background-color: var(--lcars-orange);
  color: var(--lcars-black);
  font-family: var(--lcars-font);
  text-transform: uppercase;
  padding: 8px 20px;
  border: none;
}

/* Bullet Button (half-pill) */
.lcars-bullet-left {
  border-radius: 999px 0 0 999px;
  background-color: var(--lcars-orange);
}

.lcars-bullet-right {
  border-radius: 0 999px 999px 0;
  background-color: var(--lcars-orange);
}

/* Header Bar */
.lcars-header {
  height: calc(var(--lcars-unit) / 3);
  background-color: var(--lcars-blue);
  border-radius: 999px 0 0 0;
}

.lcars-header-right {
  border-radius: 0 999px 0 0;
}
```

### Card-Mod Implementation for HA

#### Applying LCARS to Cards
```yaml
type: markdown
card_mod:
  class: header-left
  style: |
    ha-card {
      font-family: Antonio;
      text-transform: uppercase;
    }
content: '# SECTION TITLE'
```

#### Button with LCARS Styling
```yaml
type: button
card_mod:
  class: button-lozenge-left
  style: |
    ha-card {
      background-color: var(--lcars-orange) !important;
      color: black !important;
      border-radius: 999px 0 0 999px !important;
    }
entity: light.living_room
name: Living Room
```

#### Vertical Stack Layout
```yaml
type: vertical-stack
cards:
  - type: markdown
    card_mod:
      class: header-left
    content: '# CLIMATE'
  
  - type: thermostat
    entity: climate.living_room
    card_mod:
      class: middle-left
  
  - type: markdown
    card_mod:
      class: footer-left
    content: '## '
```

### CSS for Pill Shapes

```css
/* Full pill (lozenge) */
.lcars-lozenge {
  border-radius: 999px; /* or 50% for perfect circle ends */
}

/* Left pill */
.lcars-pill-left {
  border-radius: 999px 0 0 999px;
}

/* Right pill */
.lcars-pill-right {
  border-radius: 0 999px 999px 0;
}

/* Alternative using clip-path for exact LCARS shape */
.lcars-exact {
  clip-path: path('M 20,0 L 100,0 A 20,20 0 0 1 100,40 L 20,40 A 20,20 0 0 1 20,0 Z');
}
```

### Grid-Based Sizing

```css
/* LCARS Grid System */
.lcars-grid {
  display: grid;
  gap: var(--lcars-unit);
}

.lcars-u-1 { width: calc(var(--lcars-unit) * 1); }
.lcars-u-2 { width: calc(var(--lcars-unit) * 2); }
.lcars-u-3 { width: calc(var(--lcars-unit) * 3); }
.lcars-u-4 { width: calc(var(--lcars-unit) * 4); }
/* ... up to u-16 */
```

### Header/Sidebar Theming

```yaml
# configuration.yaml
frontend:
  themes: !include_dir_merge_named themes
  extra_module_url:
    - /www/community/lovelace-card-mod/card-mod.js
```

```javascript
// lcars.js - Custom JS for sidebar/header theming
// Required for ha-lcars theme
```

---

## 6. Installation Quick Reference

### ha-lcars Theme Setup

1. **Install card-mod** from HACS
2. **Add to configuration.yaml**:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
     extra_module_url:
       - /www/community/lovelace-card-mod/card-mod.js
   ```
3. **Create themes folder** under config
4. **Add font resource**:
   - Antonio: `https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap`
   - Or self-host Tungsten
5. **Add JavaScript**:
   - `https://cdn.jsdelivr.net/gh/th3jesta/ha-lcars@js-main/lcars.js`
6. **Install theme** via HACS or manual download
7. **Create helper entities** for customization
8. **Restart Home Assistant**

### Required Helper Entities
- `input_boolean.lcars_sound` - Toggle button sounds
- `input_boolean.lcars_texture` - Toggle grain effect
- `input_number.lcars_vertical` - Vertical border width (26-60)
- `input_number.lcars_horizontal` - Horizontal border width (6-60)
- `input_number.lcars_menu_font` - Sidebar font size
- `sensor.lcars_header` - Optional header text

---

## 7. Resources and References

### Official Sources
- **TheLCARS.com**: https://www.thelcars.com - Official color guide
- **Memory Alpha LCARS**: https://memory-alpha.fandom.com/wiki/Library_Computer_Access_and_Retrieval_System
- **Memory Alpha Fonts**: https://memory-alpha.fandom.com/wiki/Star_Trek_fonts

### Home Assistant Projects
- **ha-lcars**: https://github.com/th3jesta/ha-lcars
- **cb-lcars**: https://github.com/snootched/cb-lcars
- **LCARS CSS Framework**: https://joernweissenborn.github.io/lcars/

### Font Sources
- **Antonio (Google Fonts)**: https://fonts.google.com/specimen/Antonio
- **Tungsten**: https://fontdownloader.net/tungsten-font/
- **Trek Font Collection**: https://leonawicz.github.io/trekfont/
- **Star Trek Minutiae Fonts**: https://www.st-minutiae.com/resources/fonts/index.html

### Tools
- **Color-hex TNG Palette**: https://www.color-hex.com/color-palette/40315
- **R trekcolors Package**: https://cran.r-project.org/web/packages/trekcolors/

---

*Document compiled from research on LCARS design patterns, official Star Trek resources, and Home Assistant community projects.*
