# ============================================
# LCARS DASHBOARD LAYOUT REFERENCE
# Visual guide to each dashboard structure
# ============================================

## BRIDGE DASHBOARD (Main Control)

```
┌─────────────────────────────────────────────────────────────────┐
│  [ LCARS HEADER: USS HOME ASSISTANT - BRIDGE ]                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┐  ┌─────────────────────────────────┐  ┌──────────┐  │
│ │ NAV    │  │                                 │  │ STATUS   │  │
│ │        │  │    STATUS ROW                   │  │          │  │
│ │ [Nav   │  │    [Date] [Time] [Weather]      │  │ [System] │  │
│ │  Buttons│  │                                 │  │ [CPU]    │  │
│ │        │  ├─────────────────────────────────┤  │ [Memory] │  │
│ │ [Red   │  │                                 │  │ [Disk]   │  │
│ │  Alert]│  │    QUICK SCENES                 │  │          │  │
│ │        │  │    [Morning] [Night] [Away]     │  │ [Restart]│  │
│ │        │  │    [Movie]                      │  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    ENVIRONMENTAL CONTROLS       │  │          │  │
│ │        │  │    [Living Room] [Bedroom]      │  │          │  │
│ │        │  │    [Humidity]                   │  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    ILLUMINATION                 │  │          │  │
│ │        │  │    [LR] [Kitchen] [Bed] [Hall]  │  │          │  │
│ │        │  │    [Bath] [Office] [Out] [All]  │  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    COMMUNICATIONS               │  │          │  │
│ │        │  │    [Media Player]               │  │          │  │
│ │        │  │                                 │  │          │  │
│ └────────┘  └─────────────────────────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ LCARS FOOTER ]                                               │
└─────────────────────────────────────────────────────────────────┘
```

## ENGINEERING DASHBOARD (Systems)

```
┌─────────────────────────────────────────────────────────────────┐
│  [ LCARS HEADER: USS HOME ASSISTANT - ENGINEERING ]             │
│       [Blue/Gold gradient theme]                                │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┐  ┌─────────────────────────────────┐  ┌──────────┐  │
│ │ NAV    │  │                                 │  │ QUICK    │  │
│ │ [Blue  │  │    POWER MANAGEMENT             │  │ ACTIONS  │  │
│ │  theme]│  │                                 │  │          │  │
│ │        │  │    [Energy Graph - 24h]         │  │ [Updates]│  │
│ │        │  │                                 │  │ [Reload  │  │
│ │        │  │    [Daily] [Monthly] [Cost]     │  │  Scripts]│  │
│ │        │  │                                 │  │ [Reload  │  │
│ │        │  ├─────────────────────────────────┤  │  Autom.] │  │
│ │        │  │                                 │  │ [Safe    │  │
│ │        │  │    SYSTEM DIAGNOSTICS           │  │  Mode]   │  │
│ │        │  │                                 │  │ [E-Stop] │  │
│ │        │  │    [CPU Gauge] [Mem Gauge]      │  │          │  │
│ │        │  │    [Disk Gauge]                 │  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    NETWORK STATUS               │  │          │  │
│ │        │  │    [Download] [Upload]          │  │          │  │
│ │        │  │    [Devices]                    │  │          │  │
│ │        │  │                                 │  │          │  │
│ └────────┘  └─────────────────────────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ LCARS FOOTER - Blue theme ]                                  │
└─────────────────────────────────────────────────────────────────┘
```

## SCIENCE DASHBOARD (Environmental)

```
┌─────────────────────────────────────────────────────────────────┐
│  [ LCARS HEADER: USS HOME ASSISTANT - SCIENCE LAB ]             │
│       [Pink/Purple gradient theme]                              │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┐  ┌─────────────────────────────────┐  ┌──────────┐  │
│ │ NAV    │  │                                 │  │ SENSORS  │  │
│ │ [Pink  │  │    PLANETARY CONDITIONS         │  │          │  │
│ │  theme]│  │                                 │  │ [Living  │  │
│ │        │  │    [Weather Card]               │  │  Room]   │  │
│ │        │  │    [Forecast]                   │  │ [Bedroom]│  │
│ │        │  │                                 │  │ [Kitchen]│  │
│ │        │  ├─────────────────────────────────┤  │ [Outdoor]│  │
│ │        │  │                                 │  │          │  │
│ │        │  │    TEMPERATURE ANALYSIS         │  │ [Pressure│  │
│ │        │  │                                 │  │ ]        │  │
│ │        │  │    [History Graph - 48h]        │  │ [UV]     │  │
│ │        │  │    [Inside vs Outside]          │  │ [Rain]   │  │
│ │        │  │                                 │  │          │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    [Sunrise] [Sunset] [Moon]    │  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    ATMOSPHERIC QUALITY          │  │          │  │
│ │        │  │    [AQI] [CO2] [VOC]            │  │          │  │
│ │        │  │                                 │  │          │  │
│ └────────┘  └─────────────────────────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ LCARS FOOTER - Pink theme ]                                  │
└─────────────────────────────────────────────────────────────────┘
```

## TACTICAL DASHBOARD (Security)

```
┌─────────────────────────────────────────────────────────────────┐
│  [ LCARS HEADER: USS HOME ASSISTANT - TACTICAL ]                │
│       [Red/Orange gradient theme]                               │
├─────────────────────────────────────────────────────────────────┤
│ [RED ALERT] [YELLOW ALERT] [ALL CLEAR]                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┐  ┌─────────────────────────────────┐  ┌──────────┐  │
│ │ NAV    │  │                                 │  │ ALARM    │  │
│ │ [Red   │  │    VISUAL SURVEILLANCE          │  │ [Panel]  │  │
│ │  theme]│  │                                 │  │          │  │
│ │        │  │    [Front Door Cam] [Back Cam]  │  │ LOCKS    │  │
│ │        │  │                                 │  │ [Front]  │  │
│ │        │  │    [Garage Cam] [Living Cam]    │  │ [Back]   │  │
│ │        │  │                                 │  │ [Garage] │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │ SENSORS  │  │
│ │        │  │    SECURITY LOG                 │  │ [Front   │  │
│ │        │  │    [Recent Events - 24h]        │  │  Motion] │  │
│ │        │  │                                 │  │ [Back    │  │
│ │        │  │                                 │  │  Motion] │  │
│ │        │  │                                 │  │ [Garage  │  │
│ │        │  │                                 │  │  Motion] │  │
│ └────────┘  └─────────────────────────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ LCARS FOOTER - Red theme ]                                   │
└─────────────────────────────────────────────────────────────────┘
```

## QUARTERS DASHBOARD (Comfort)

```
┌─────────────────────────────────────────────────────────────────┐
│  [ LCARS HEADER: USS HOME ASSISTANT - CREW QUARTERS ]           │
│       [Tan/Gold gradient theme]                                 │
├─────────────────────────────────────────────────────────────────┤
│ [WAKE UP] [SLEEP MODE] [DO NOT DISTURB]                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┐  ┌─────────────────────────────────┐  ┌──────────┐  │
│ │ NAV    │  │                                 │  │ SCENES   │  │
│ │ [Tan   │  │    LIVING QUARTERS              │  │          │  │
│ │  theme]│  │    [Main] [Ambient] [Accent]    │  │ [Relax]  │  │
│ │        │  │    [Brightness Slider]          │  │ [Read]   │  │
│ │        │  │                                 │  │ [Romance]│  │
│ │        │  ├─────────────────────────────────┤  │ [Energ]  │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    SLEEPING QUARTERS            │  │ MEDIA    │  │
│ │        │  │    [Main] [Nightstand] [Closet] │  │ [Movie]  │  │
│ │        │  │    [Brightness Slider]          │  │ [Music]  │  │
│ │        │  │                                 │  │ [Party]  │  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │ QUICK    │  │
│ │        │  │    WINDOW TREATMENTS            │  │ [All Off]│  │
│ │        │  │    [Living] [Bedroom] [Kitchen] │  │ [Reset   │  │
│ │        │  │                                 │  │  Climate]│  │
│ │        │  ├─────────────────────────────────┤  │          │  │
│ │        │  │                                 │  │          │  │
│ │        │  │    THERMAL REGULATION           │  │          │  │
│ │        │  │    [Thermostat Card]            │  │          │  │
│ │        │  │                                 │  │          │  │
│ └────────┘  └─────────────────────────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ LCARS FOOTER - Tan theme ]                                   │
└─────────────────────────────────────────────────────────────────┘
```

## COLOR LEGEND

```
[ Header ]      = Colored bar with text (varies by dashboard)
[ Button ]      = Rounded pill button (right or left curve)
[ Data Box ]    = Tan colored box with black text
[ Sensor ]      = Bordered box with icon and value
[ Gauge ]       = Circular progress indicator
[ Graph ]       = History/line chart
[ Camera ]      = Picture entity card
[ Card ]        = Standard HA card with LCARS styling
[ Slider ]      = Range input for dimming
[ Nav ]         = Navigation sidebar
[ Footer ]      = Bottom colored bar
```

## RESPONSIVE BREAKPOINTS

### Desktop (1200px+)
- 3-column layout: Nav | Main | Sidebar
- Full cards visible
- All gauges and graphs at full size

### Tablet (768px - 1199px)
- 2-column layout: Nav | Main
- Sidebar cards move below main content
- Gauges may resize

### Mobile (< 768px)
- 1-column layout
- Navigation becomes top horizontal bar
- Cards stack vertically
- Simplified gauges or hidden

## COMMON CARD SIZES

| Card Type | Width | Height | Notes |
|-----------|-------|--------|-------|
| Header | 100% | 40px | Full width bar |
| Pill Button | Auto | 50px | Left or right curved |
| Data Box | 1/3 | Auto | Tan background |
| Sensor | 1/3 | 80px | Bordered box |
| Camera | 1/2 | 200px | Grid layout |
| Gauge | 1/3 | 200px | Circular |
| Graph | 100% | 300px | Full width |
