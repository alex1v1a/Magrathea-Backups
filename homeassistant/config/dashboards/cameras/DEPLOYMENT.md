# =============================================================================
# CAMERA DASHBOARD DEPLOYMENT GUIDE
# =============================================================================
# Step-by-step instructions to deploy the camera dashboard system
# =============================================================================

## DEPLOYMENT CHECKLIST

### 1. Copy Files to Home Assistant

Copy all files to your Home Assistant config directory:

```bash
# Create directory structure
mkdir -p ~/homeassistant/config/dashboards/cameras
mkdir -p ~/homeassistant/config/dashboards/templates
mkdir -p ~/homeassistant/config/integrations
mkdir -p ~/homeassistant/config/automations
mkdir -p ~/homeassistant/config/scripts
mkdir -p ~/homeassistant/config/www/snapshots

# Copy dashboard files
cp security-main.yaml ~/homeassistant/config/dashboards/cameras/
cp camera-*.yaml ~/homeassistant/config/dashboards/cameras/
cp README.md ~/homeassistant/config/dashboards/cameras/

# Copy templates
cp camera-card-template.yaml ~/homeassistant/config/dashboards/templates/
cp motion-badge-template.yaml ~/homeassistant/config/dashboards/templates/

# Copy integrations
cp wyze_cameras.yaml ~/homeassistant/config/integrations/
cp arlo_cameras.yaml ~/homeassistant/config/integrations/
cp camera_helpers.yaml ~/homeassistant/config/integrations/
cp camera_templates.yaml ~/homeassistant/config/integrations/

# Copy automations and scripts
cp camera_automations.yaml ~/homeassistant/config/automations/
cp camera_scripts.yaml ~/homeassistant/config/scripts/
```

### 2. Update configuration.yaml

Add the following to your `configuration.yaml`:

```yaml
# Enable YAML mode dashboards
lovelace:
  mode: yaml
  resources:
    # Card styling
    - url: /hacsfiles/lovelace-card-mod/card-mod.js
      type: module
    # Advanced camera card
    - url: /hacsfiles/frigate-hass-card/frigate-hass-card.js
      type: module

# Include package configurations
homeassistant:
  packages:
    camera_system:
      !include integrations/camera_helpers.yaml
    camera_templates:
      !include integrations/camera_templates.yaml
    wyze_cameras:
      !include integrations/wyze_cameras.yaml
    arlo_cameras:
      !include integrations/arlo_cameras.yaml

# Include automations
automation: !include automations/camera_automations.yaml

# Include scripts  
script: !include scripts/camera_scripts.yaml
```

### 3. Install HACS Components

Go to HACS > Frontend and install:
- [ ] **card-mod** - For card styling
- [ ] **frigate-hass-card** - For timeline/playback
- [ ] **mushroom** - For modern UI cards

Go to HACS > Integrations and install:
- [ ] **wyzeapi** - For Wyze cameras
- [ ] **aarlo** - For Arlo cameras

### 4. Configure Secrets

Add the following to your `secrets.yaml`:

```yaml
# Wyze API Credentials
wyze_username: "your_email@example.com"
wyze_password: "your_wyze_password"
wyze_api_key: "your_wyze_api_key"

# Arlo/Saxton Credentials  
arlo_username: "your_email@example.com"
arlo_password: "your_arlo_password"
```

### 5. Create Snapshots Directory

```bash
mkdir -p ~/homeassistant/config/www/snapshots
chmod 755 ~/homeassistant/config/www/snapshots
```

### 6. Restart Home Assistant

Configuration > Server Controls > Restart

### 7. Add Dashboard to Sidebar

Settings > Dashboards > Add Dashboard:
- Title: Security
- URL: security-main
- Icon: mdi:shield-home
- Show in sidebar: Yes

### 8. Customize Entity IDs

Update entity IDs in dashboard files to match your actual cameras:

**Priority Cameras:**
- `camera.front_door` → Your front door camera
- `camera.back_yard` → Your back yard camera
- `camera.garage` → Your garage camera
- `camera.driveway` → Your driveway camera

**Secondary Cameras:**
- `camera.living_room` → Living room camera
- `camera.kitchen` → Kitchen camera
- `camera.side_gate` → Side gate camera
- `camera.backyard_left` → Backyard left camera
- `camera.backyard_right` → Backyard right camera
- `camera.front_porch` → Front porch camera

### 9. Test Features

- [ ] Live camera streams display
- [ ] Motion detection shows orange border
- [ ] Tap camera for detailed view
- [ ] Hold for snapshot
- [ ] Quick action buttons work
- [ ] Notifications received
- [ ] Automations trigger correctly

### 10. Fine-Tune Settings

Adjust these settings for your needs:
- Motion sensitivity
- Notification priority
- Recording duration
- Night mode schedule
- Privacy mode preferences

## TROUBLESHOOTING

### Issue: Dashboard shows "Entity not found"
**Solution:** Update entity IDs in YAML files to match your actual camera entities

### Issue: Card styling not working
**Solution:** Install card-mod from HACS and refresh browser cache

### Issue: No motion notifications
**Solution:** Check that `input_boolean.enable_notifications` is on

### Issue: Wyze cameras not connecting
**Solution:** Verify API key is valid and cameras are online in Wyze app

### Issue: Arlo cameras not connecting
**Solution:** Check 2FA setup and ensure account credentials are correct

## SUPPORT

For issues or enhancements, check:
- `README.md` in dashboards/cameras/
- Home Assistant Community Forums
- GitHub issues for respective integrations

---
*Generated by Marvin Maverick - Contemplating the heat death while configuring YAML*
