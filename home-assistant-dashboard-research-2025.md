# Home Assistant Dashboard Best Practices Research
## 2024-2025 Professional Design Guide

---

## Executive Summary

Home Assistant dashboards have undergone significant evolution with **Project Grace** (2024), introducing the new **Sections view**, **drag-and-drop functionality**, **grid system**, and **redesigned badges**. The focus has shifted from YAML-heavy customization to UI-first design while maintaining flexibility for advanced users.

---

## 1. Latest Core Features (2024-2025)

### Sections View (Released March 2024)
- **Drag-and-drop** arrangement for both cards AND sections
- **Grid-based layout** with standardized row heights (56px per row)
- **Responsive design** - sections reflow based on screen width
- **Dynamic card resizing** via slider interface (July 2024)
- Section-based organization replaces Masonry layout's unpredictable card placement

### New Badges (August 2024)
- Complete redesign inspired by Mushroom Chip cards
- Compact, configurable badges sitting at top of views
- Per-badge configuration: show/hide icon, name, state
- **Visibility options** based on user, screen size, entity state
- Drag-and-drop reordering with copy/paste/duplicate
- Work in both Sections and Masonry views
- Support for custom badges (template-based)

### Card Features System
- Modular widgets placed inside cards
- Available for Tile, Thermostat, and other cards
- Examples: light brightness slider, climate temperature, cover position
- Extensible by custom card developers

### Visibility Controls (2024.6+)
- Show/hide cards and sections based on:
  - Current user viewing
  - Screen size/display context
  - Entity state conditions
  - Time of day

### Dashboard Backgrounds (2024.6)
- Custom background images/colors per dashboard
- Enables sophisticated visual designs

---

## 2. Professional Dashboard Design Principles

### Core Design Philosophy (from Home Assistant Research)
1. **Monitor First**: Display information clearly and boldly
2. **Contextual**: Adapt to environment (room, device, user)
3. **Information First**: Focus on data, not ornaments
4. **Clear Primary Actions**: Every control card has one obvious action
5. **Affordance**: Interactive elements must look clickable
6. **Don't Clutter**: Features > icon buttons; clean layouts

### The Grid System Standards
- **Row Height**: 56px (reduced from 66px for better density)
- **Gutter**: 8px between cards
- **Icon Size**: 36px
- **Feature Height**: 42px
- Cards snap to grid multiples for predictable layouts

### Material Design 3 Direction
- Home Assistant is gradually adopting Material 3
- Design tokens for typography, iconography, shapes
- Consistent elevation shadows and border radius (12px standard)

---

## 3. Room-Based Organization Best Practices

### Hub-and-Spoke Navigation Pattern
```
Main Dashboard (Room Grid) → Room Detail View
```

**Implementation:**
- Main view: Grid of "room cards" - each showing room name, active device count, temperature
- Room cards use `button-card` with `navigate` action to sub-views
- Each room has dedicated sub-view with full controls

### Room Card Template Structure
```yaml
- Room name/icon (large tap target)
- Active devices count (secondary info)
- Current temperature (contextual)
- Visual indicator when devices are ON
- Border accent in primary color when active
```

### Benefits of Room-Based Organization
- **Intuitive** - matches how people think about their home
- **Family-friendly** - non-technical users understand room concepts
- **Scalable** - easy to add new rooms without reorganizing
- **Maintainable** - each room view is self-contained

### Alternative: Floor Plan Navigation
- Picture-elements card with SVG floor plan
- Rooms are interactive zones
- Device icons positioned on floor plan
- Lights glow when ON, doors show state
- More impressive visually, higher maintenance

---

## 4. Category-Based Navigation Systems

### Common Category Patterns

**By Function:**
```
Lighting | Climate | Security | Media | Energy
```

**By Time/Activity:**
```
Morning | Away | Evening | Night | Vacation
```

**By System:**
```
Network | Servers | Cameras | Sensors | Automations
```

### Tab-Based Implementation
- Each category = separate view tab
- Use meaningful icons for quick recognition
- Keep to 5-7 tabs maximum (cognitive load)

### Chip-Based Quick Navigation
- Mushroom chips at top of dashboard
- Filter views by tapping chips
- Show dynamic counts (e.g., "Lights On: 5")

### Bottom Navigation (Mobile-First)
- Bubble Card creates app-like bottom nav
- Pop-up panels for detailed controls
- Native mobile app feel
- Best for phone and tablet dashboards

---

## 5. Dashboard Layout Styles

### Style 1: The Control Panel (Maximalist)
**For:** Power users, wall-mounted tablets
- Dense information display
- Multiple cards per section
- Data visualizations prominent
- Real-time stats always visible

**Key Cards:**
- mini-graph-card for trends
- apexcharts-card for detailed data
- Custom button-card for controls
- Entities card for status lists

### Style 2: The Status Board (Minimalist)
**For:** Quick glances, ambient displays
- One screen, no scrolling
- Room chips for filtering
- Large status indicators
- Conditional visibility

**Key Cards:**
- Mushroom chips for room filter
- Mushroom light/climate cards
- Weather card
- Conditional cards for alerts only

### Style 3: Room Hub
**For:** Family-friendly control
- Main dashboard = room selection grid
- Each room has dedicated sub-view
- Consistent layout across rooms
- Large touch targets

**Key Cards:**
- button-card for room navigation
- Tile cards for devices
- Section headers with room names

### Style 4: Security Operations
**For:** Security-focused setups
- Camera grid front and center
- Alarm panel (Alarmo)
- Door/window sensor status
- Motion detection timeline

**Key Cards:**
- Frigate card for camera feeds
- Alarmo card for alarm control
- Picture entity card for cameras
- Conditional cards for alerts

---

## 6. Essential Cards & Tools (HACS)

### Must-Have Cards

| Card | Purpose | Best For |
|------|---------|----------|
| **Mushroom Cards** | Clean, modern entity cards | Quick wins, family dashboards |
| **button-card** | Ultimate customization | Custom layouts, complex templates |
| **card-mod** | CSS injection | Visual polish, theme overrides |
| **layout-card** | CSS Grid layouts | Precise positioning |
| **mini-graph-card** | Sparkline graphs | Data visualization |
| **apexcharts-card** | Advanced charts | Time-series data |
| **Bubble Card** | Mobile navigation | Phone/tablet dashboards |
| **stack-in-card** | Grouping cards | Seamless compound layouts |

### Theme Recommendations (2025)

| Theme | Style | Best For |
|-------|-------|----------|
| **Catppuccin** | Pastel, soft | Eye comfort, modern look |
| **Graphite** | Dark, cohesive | Consistent UI across all panels |
| **Metrology** | Metro/Fluent | Information density, bold design |
| **visionOS** | Glassmorphism | iOS ecosystem users |
| **Material Rounded** | Material 3 | Google Home app aesthetic |
| **iOS Themes** | Apple-style | iPhone/iPad users |
| **Caule Pack** | 40 variants | Finding the perfect color |

---

## 7. Enterprise/Professional Setups

### Characteristics of Professional Dashboards

**From Madelena's Reference Architecture (Home Assistant UX Designer):**

1. **Responsive Grid Systems**
   - CSS Grid-based layouts
   - Breakpoints for mobile/tablet/desktop
   - Consistent spacing (8px grid)

2. **Consistent Theming**
   - Custom CSS variables
   - Light/dark mode support
   - Font standardization (Inter recommended)

3. **Information Hierarchy**
   - Primary actions prominent
   - Secondary info subtle
   - Alerts visually distinct

4. **Performance Optimized**
   - Entity groups for calculated values
   - Limit Jinja2 template complexity
   - Server-side template sensors
   - ~60-80 complex cards per view maximum

5. **Maintainable Structure**
   ```
   config/
   ├── ui-lovelace.yaml (main entry)
   ├── themes/
   ├── lovelace/
   │   ├── views/ (per-view YAML)
   │   └── templates/ (reusable)
   └── www/fonts/ (custom fonts)
   ```

### Professional Layout Example (Michael Sleen 2025)
- **Base**: Sections view (no YAML required)
- **Cards**: Mushroom Cards throughout
- **Visual Design**: Consistent theme, card-mod polish
- **Navigation**: Room-based with sub-views
- **Conditional Display**: Cards appear based on state
- **Maintenance**: Drag-and-drop edits, minimal code

### Advanced: CSS Grid Custom Layouts
For pixel-perfect control:
```yaml
# Using layout-card with CSS Grid
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
grid-template-areas:
  "camera camera sensors-a sensors-b"
  "camera camera sensors-c sensors-d"
```

---

## 8. Mobile & Tablet Optimization

### Tablet Wall Mount Best Practices
1. **Screen burn-in prevention**: Dark themes, dimming at night
2. **Large touch targets**: Minimum 44×44px (Apple HIG)
3. **Safe area insets**: `env(safe-area-inset-bottom)` for iPhone
4. **Resolution optimization**: Design for specific tablet resolution
5. **Fully Kiosk Browser**: For dedicated displays

### Mobile-First Patterns
- **Bubble Card** for bottom navigation
- **Pop-up panels** instead of sub-views
- **Swipe gestures** where appropriate
- **Minimal scrolling** on primary views

---

## 9. Data Visualization Best Practices

### Graphs & Charts
- **mini-graph-card**: Quick sparklines, compact
- **apexcharts-card**: Detailed analysis, multiple series
- **Grafana iframe**: Professional time-series (requires separate Grafana)

### Dashboard Tips
- Show trends, not just current values
- Use consistent colors for same entity types
- Limit to 3-4 graphs per view (performance)
- Consider e-ink displays for always-on stats

---

## 10. Recommended Architecture for New Builds

### 2025 Recommended Stack

**Foundation:**
- Home Assistant 2024.8+ (Sections view stable)
- HACS installed
- Mushroom Cards + card-mod

**Layout Strategy:**
1. Create dashboard with **Sections view**
2. Create sections by **room** (Living Room, Kitchen, etc.)
3. Add **badges** for home-wide status (temp, who's home, alerts)
4. Use **Tile cards** for most entities
5. Add **card features** for extended controls
6. Enable **conditional visibility** for context-aware display

**Navigation Options:**
- Simple: Section headers as visual dividers
- Medium: Room cards → sub-views
- Advanced: Bubble Card bottom nav

**Theming:**
- Start with Catppuccin or Graphite
- Customize via card-mod for polish
- Consistent 12px border-radius
- 8px/16px spacing scale

---

## Key Takeaways

1. **Sections view is the future** - Drag-and-drop, responsive, maintainable
2. **Badges are now powerful** - Use them for at-a-glance status
3. **Room-based organization** - Most intuitive for all users
4. **Mushroom + Tile cards** - Modern look without custom CSS
5. **Conditional visibility** - Show relevant info only
6. **YAML is optional** - Most dashboards can be built entirely in UI now
7. **Performance matters** - Use template sensors, limit complex cards

---

## Resources

- [Home Assistant Dashboard Documentation](https://www.home-assistant.io/dashboards/)
- [Dashboard Chapter 1: Sections](https://www.home-assistant.io/blog/2024/03/04/dashboard-chapter-1/)
- [Dashboard Chapter 2: Cards](https://www.home-assistant.io/blog/2024/07/26/dashboard-chapter-2/)
- [Madelena's Public Config](https://github.com/Madelena/hass-config-public) (Reference architecture)
- [Mushroom Cards](https://github.com/piitaya/lovelace-mushroom)
- [HACS](https://hacs.xyz/)
