# ==========================================
# LCARS Dashboard Resources Configuration
# ==========================================
# Add these resources through HA UI:
# Settings → Dashboards → ⋮ (3 dots) → Resources
# ==========================================

# REQUIRED Resources for LCARS Theme:

# 1. Card Mod (JS Module)
# URL: /local/community/lovelace-card-mod/card-mod.js
# Type: JavaScript Module

# 2. LCARS Styling (JS Module)  
# URL: /local/community/ha-lcars/lcars.js
# Type: JavaScript Module

# 3. Google Fonts - Antonio (Stylesheet)
# URL: https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap
# Type: Stylesheet

# ==========================================
# Alternative: Add via configuration.yaml
# ==========================================

frontend:
  themes: !include_dir_merge_named themes
  extra_module_url:
    - /local/community/lovelace-card-mod/card-mod.js
    - /local/community/ha-lcars/lcars.js
  extra_html_url:
    - https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap

# ==========================================
# Step-by-Step Setup Instructions:
# ==========================================

# 1. Restart Home Assistant after updating configuration.yaml

# 2. Clear browser cache (Ctrl+F5)

# 3. Set Theme:
#    - Click your profile name (bottom left)
#    - Select "LCARS Default" from theme dropdown

# 4. Add Resources (if not using configuration.yaml method):
#    - Settings → Dashboards → ⋮ → Resources
#    - Add each resource above with correct type

# 5. Navigate to dashboard:
#    - http://localhost:8123/lcars-bridge
#    - Check that buttons show LCARS styling (rounded, orange)

# ==========================================
# Troubleshooting:
# ==========================================

# If buttons still look default:
# - Check browser console (F12) for 404 errors on resources
# - Verify card-mod is installed: Check HACS → Frontend
# - Try hard refresh: Ctrl+Shift+R
# - Check that theme is set in profile (not just default)

# If layout is broken:
# - Check that all three resources are loaded
# - Verify no conflicting themes are active
# - Try incognito/private browsing window
