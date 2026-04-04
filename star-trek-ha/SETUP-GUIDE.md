# LCARS Setup Completion Guide

## Current Status: 🟡 DEPLOYED — PENDING USER ACTION

**Last Updated:** 2026-02-13  
**Home Assistant Status:** ✅ Running on http://localhost:8123

---

## ✅ What's Already Done

All files have been deployed to `/home/marvin/homeassistant/config/`:

| Component | Status | Location |
|-----------|--------|----------|
| LCARS Theme (7 variants) | ✅ Deployed | `themes/lcars/lcars.yaml` |
| Bridge Dashboard | ✅ Deployed | `dashboards/lcars-bridge.yaml` |
| Engineering Dashboard | ✅ Deployed | `dashboards/lcars-engineering.yaml` |
| Science Dashboard | ✅ Deployed | `dashboards/lcars-science.yaml` |
| Security Dashboard | ✅ Deployed | `dashboards/lcars-security.yaml` |
| Quarters Dashboard | ✅ Deployed | `dashboards/lcars-quarters.yaml` |
| Configuration | ✅ Updated | `configuration.yaml` includes dashboards |

---

## ⏳ What You Need To Do

### Step 1: Log into Home Assistant
Navigate to: http://localhost:8123

### Step 2: Add Resources
1. Go to **Settings → Dashboards → ⋮ (3 dots) → Resources**
2. Click **Add Resource**
3. Add as **Stylesheet**:
   ```
   https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap
   ```
4. Click **Add Resource** again
5. Add as **JavaScript Module**:
   ```
   https://cdn.jsdelivr.net/gh/th3jesta/ha-lcars@js-main/lcars.js
   ```

### Step 3: Install card-mod (REQUIRED)
1. Go to **HACS → Frontend**
2. Click **Explore & Download Repositories**
3. Search for **card-mod**
4. Click **Download**
5. Restart Home Assistant (**Settings → System → Restart**)

### Step 4: Create Helper Entities
1. Go to **Settings → Devices & Services → Helpers**
2. Click **Create Helper**
3. Create these 4 helpers:

| Name | Type | Entity ID | Settings |
|------|------|-----------|----------|
| LCARS Sound | Toggle | `input_boolean.lcars_sound` | — |
| LCARS Texture | Toggle | `input_boolean.lcars_texture` | — |
| LCARS Horizontal | Number | `input_number.lcars_horizontal` | Min: 6, Max: 60, Step: 1 |
| LCARS Vertical | Number | `input_number.lcars_vertical` | Min: 26, Max: 60, Step: 1 |

### Step 5: Set the Theme
1. Click your **profile name** (bottom left of sidebar)
2. Find the **Theme** dropdown
3. Select **LCARS Default**

### Step 6: Hard Refresh
Press **Ctrl+F5** to clear cache and reload

---

## 📊 Dashboard URLs

Once setup is complete, access your LCARS dashboards at:

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Bridge | http://localhost:8123/lcars-bridge | Main command center |
| Engineering | http://localhost:8123/lcars-engineering | Climate & systems |
| Science | http://localhost:8123/lcars-science | Sensors & data |
| Security | http://localhost:8123/lcars-security | Locks & alarms |
| Quarters | http://localhost:8123/lcars-quarters | Bedroom controls |

---

## 🎨 Available LCARS Themes

- **LCARS Default** — Classic orange/purple TNG style
- **LCARS Next Generation** — Brighter colors
- **LCARS Nemesis** — Blue/dark theme
- **LCARS Lower Decks** — Animated series style
- **LCARS Romulus** — Green accents
- **LCARS Cardassia** — Brown/amber
- **LCARS Kronos** — Red-based

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Dashboards not showing | Check that `configuration.yaml` has the lovelace dashboards config |
| Theme not loading | Verify `frontend: themes: !include_dir_merge_named themes` in config |
| Cards not styled | Install card-mod via HACS |
| Fonts wrong | Check that Antonio font resource is loaded |
| Navigation buttons not working | Hard refresh (Ctrl+F5) |

---

## 📁 File Locations

**WSL Path:**
```
/home/marvin/homeassistant/config/
```

**Windows Access:**
```
\\wsl$\Ubuntu\home\marvin\homeassistant\config
```

**Key Files:**
- Dashboards: `config/dashboards/`
- Themes: `config/themes/lcars/`
- Configuration: `config/configuration.yaml`

---

## Verification Script

Run this to check LCARS status:
```bash
node check-lcars-status.js
```

Run this to see completion instructions:
```bash
node complete-lcars-setup.js
```
