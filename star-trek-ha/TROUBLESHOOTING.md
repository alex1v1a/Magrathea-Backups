# Troubleshooting Guide for LCARS Home Assistant Theme

## Common Issues and Solutions

### Issue: Theme not showing in profile dropdown

**Cause:** Theme files not loaded properly

**Solutions:**
1. Verify themes folder exists: `config/themes/lcars/`
2. Check configuration.yaml has:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```
3. Restart Home Assistant
4. Check **Developer Tools → Logs** for errors

---

### Issue: Font not loading / displaying incorrectly

**Cause:** Font resource not added or incorrect path

**Solutions:**
1. Go to **Settings → Dashboards → ⋮ → Resources**
2. Verify resource exists:
   - URL: `https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap`
   - Type: **Stylesheet**
3. For local Tungsten font:
   - Verify files exist in `/www/community/fonts/`
   - Check resource path: `/hacsfiles/fonts/tungsten.css`
4. Hard refresh browser (Ctrl+F5)

---

### Issue: Cards not styled / no LCARS appearance

**Cause:** card-mod not installed or not working

**Solutions:**
1. Verify card-mod is installed via HACS
2. Check configuration.yaml has:
   ```yaml
   frontend:
     extra_module_url:
       - /www/community/lovelace-card-mod/card-mod.js
   ```
3. Add JavaScript resource:
   - URL: `https://cdn.jsdelivr.net/gh/th3jesta/ha-lcars@js-main/lcars.js`
   - Type: **JavaScript Module**
4. Restart Home Assistant
5. Check browser console (F12) for errors

---

### Issue: Mobile layout broken / buttons too large

**Cause:** Default grid sizing in Sections layout

**Solutions:**
1. Add `grid_options` to button cards:
   ```yaml
   type: button
   grid_options:
     columns: full
     rows: auto
   card_mod:
     class: button-lozenge-left
   ```
2. Use vertical-stack cards for mobile
3. Create separate mobile dashboard with simpler layout

---

### Issue: Sound effects not working

**Cause:** Missing helper or browser restrictions

**Solutions:**
1. Verify helpers exist:
   - `input_boolean.lcars_sound`
   - Check in **Developer Tools → States**
2. Enable sound helper
3. Browser may block autoplay - click on dashboard first
4. Check browser console for audio errors

---

### Issue: Texture/FX toggle not working

**Cause:** Missing helper or CSS not applied

**Solutions:**
1. Verify helper exists: `input_boolean.lcars_texture`
2. Reload browser after enabling
3. Check that JavaScript resource is loaded

---

### Issue: Border size sliders not working

**Cause:** Missing input_number helpers

**Solutions:**
1. Create helpers:
   - `input_number.lcars_horizontal` (min: 6, max: 60)
   - `input_number.lcars_vertical` (min: 26, max: 60)
2. Reload theme or restart HA

---

### Issue: Dashboard looks different than screenshots

**Cause:** Missing classes or wrong card types

**Solutions:**
1. Ensure all cards have `card_mod:` section
2. Use exact class names from documentation
3. Use markdown cards for headers/footers
4. Use button cards (not entity cards) for buttons
5. Apply classes to container stacks when needed

---

### Issue: Wall panel won't stay on dashboard

**Cause:** Browser/screensaver settings

**Solutions:**
1. Install kiosk-mode from HACS
2. Add `?kiosk` to URL
3. Disable screensaver on device
4. Use browser extension to prevent sleep

---

### Issue: Performance is slow

**Cause:** Too many cards or complex layouts

**Solutions:**
1. Limit cards per dashboard (15-20 max for wall panels)
2. Use conditional cards to show/hide sections
3. Simplify animations
4. Disable texture effect
5. Use Grid layout instead of Masonry

---

### Issue: Sidebar not styled

**Cause:** CSS not applied to sidebar

**Solutions:**
1. This is a known limitation
2. Sidebar styling only applies after loading a dashboard first
3. Navigate to dashboard, then to other pages
4. Consider using kiosk-mode to hide sidebar

---

### Issue: Edit mode looks broken

**Cause:** Normal behavior - edit mode shows raw cards

**Solutions:**
1. This is expected - cards show editing interface
2. Exit edit mode to see styled cards
3. Use "Preview" feature if available

---

## Getting Help

### Check These First:
1. Browser console (F12) for JavaScript errors
2. Home Assistant logs (**Settings → System → Logs**)
3. Card-mod is working on non-LCARS cards
4. Theme is selected in profile

### Provide This Info When Asking for Help:
1. Home Assistant version
2. card-mod version
3. Browser type and version
4. Screenshot of issue
5. Relevant YAML code
6. Any error messages from logs

### Resources:
- GitHub Issues: https://github.com/th3jesta/ha-lcars/issues
- Community Forum: https://community.home-assistant.io/t/star-trek-lcars-theme/511391
- Discord: https://discord.gg/gGxud6Y6WJ

---

## Debug Mode

To debug issues, add this to your dashboard temporarily:

```yaml
type: markdown
content: |
  Debug Info:
  - Theme: {{ state_attr('frontend', 'theme') }}
  - Card Mod: {{ 'OK' if states('sensor.time') else 'Not Working' }}
  - Helpers: {{ states('input_boolean.lcars_sound', with_group=False) }}
```

This will show if theme and helpers are accessible.
