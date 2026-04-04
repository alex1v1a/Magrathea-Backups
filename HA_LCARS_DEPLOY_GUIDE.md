# HA LCARS Deployment Guide

## Overview
Deploy LCARS (Library Computer Access/Retrieval System) theme to Home Assistant for Star Trek-inspired dashboard interface.

## Prerequisites
- Home Assistant instance running (IP: 10.0.1.90)
- Web UI access: http://10.0.1.90:8123
- Admin access to Home Assistant

## Step 1: Install HACS (Home Assistant Community Store)

### 1.1 Access Home Assistant
1. Open browser: http://10.0.1.90:8123
2. Log in with admin credentials

### 1.2 Install Terminal & SSH Add-on (Optional but recommended)
1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Search for "Terminal & SSH"
3. Click **Install**
4. Start the add-on
5. Enable "Show in sidebar"

### 1.3 Install HACS
1. Go to **Settings** → **Devices & Services** → **Integrations**
2. Click **+ Add Integration**
3. Search for "HACS"
4. If not found, use manual installation:
   - Go to https://hacs.xyz/docs/setup/download
   - Download latest HACS release
   - Extract to `config/custom_components/hacs/`
   - Restart Home Assistant

### 1.4 Configure HACS
1. Go to **Settings** → **Devices & Services** → **Integrations**
2. Click **+ Add Integration**
3. Search for "HACS"
4. Follow configuration wizard
5. Accept GitHub authentication

## Step 2: Install LCARS Theme

### 2.1 Access HACS
1. Go to **HACS** in left sidebar
2. Click **Frontend**
3. Click **+ Explore & Download Repositories**

### 2.2 Search for LCARS
1. Search: "LCARS" or "Star Trek"
2. Select appropriate theme (e.g., "LCARS Home Assistant Theme")
3. Click **Download**
4. Wait for installation

### 2.3 Alternative: Manual Theme Installation
If HACS doesn't have LCARS:
1. Download LCARS theme from GitHub
2. Place in `config/themes/lcars/`
3. Create `lcars.yaml` theme file

## Step 3: Configure Theme

### 3.1 Activate Theme
1. Go to **Settings** → **Dashboards**
2. Click **+ Add Dashboard**
3. Select **Web page** or create new
4. Name: "LCARS"
5. Set theme to LCARS

### 3.2 Configure Lovelace Dashboard
```yaml
title: LCARS
views:
  - title: Main
    cards:
      - type: entities
        title: Systems
        entities:
          - sun.sun
          - sensor.time
```

## Step 4: Customize Cards

### 4.1 LCARS Card Configuration
Use card-mod or custom cards for LCARS styling:
```yaml
type: custom:button-card
name: System Status
styles:
  card:
    - background-color: '#FF9900'
    - border-radius: 20px
```

## Step 5: Verify Installation

1. Navigate to new dashboard
2. Verify LCARS styling applied
3. Check all cards display correctly
4. Test responsive design

## Troubleshooting

### Issue: HACS not appearing
- Restart Home Assistant
- Clear browser cache
- Check logs: Settings → System → Logs

### Issue: Theme not applying
- Verify theme file in correct location
- Check configuration.yaml for theme reference
- Restart Home Assistant

### Issue: Cards not styled
- Install card-mod via HACS
- Verify CSS styling in card configuration

## Files Created
- `/config/custom_components/hacs/` (HACS installation)
- `/config/themes/lcars/` (LCARS theme files)
- `/config/ui-lovelace.yaml` (Dashboard configuration)

## Next Steps
1. Configure additional LCARS cards
2. Set up automation triggers
3. Customize color schemes
4. Add voice control integration

## References
- HACS Documentation: https://hacs.xyz/
- Home Assistant Themes: https://www.home-assistant.io/integrations/frontend/
- LCARS Design Guidelines: Star Trek Technical Manual

---
Generated: 2026-02-27
Task: HA LCARS Deployment
Status: Guide Complete (Pending Execution)
