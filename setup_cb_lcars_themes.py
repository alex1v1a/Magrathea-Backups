#!/usr/bin/env python3
import os

themes_content = """# CB-LCARS Alert Themes for Home Assistant
# https://github.com/snootched/cb-lcars

CB-LCARS Green Alert:
  primary-color: "#33cc99"
  primary-background-color: "#0c2a15"
  secondary-background-color: "#083717"
  text-primary-color: "#f3f4f7"
  text-color: "#f3f4f7"
  card-background-color: "#0c2a15"
  app-header-background-color: "#0c2a15"
  app-header-text-color: "#f3f4f7"
  success-color: "#33cc99"
  warning-color: "#ffcc33"
  error-color: "#ff2200"

CB-LCARS Red Alert:
  primary-color: "#ff2200"
  primary-background-color: "#1a1a1a"
  secondary-background-color: "#2b2b2b"
  text-primary-color: "#ffdddd"
  text-color: "#ffdddd"
  card-background-color: "#1a1a1a"
  app-header-background-color: "#1a1a1a"
  app-header-text-color: "#ffdddd"
  success-color: "#ff6347"
  warning-color: "#ffa07a"
  error-color: "#ff0000"

CB-LCARS Blue Alert:
  primary-color: "#4455ff"
  primary-background-color: "#1c1c3c"
  secondary-background-color: "#2a2a5a"
  text-primary-color: "#ddeeff"
  text-color: "#ddeeff"
  card-background-color: "#1c1c3c"
  app-header-background-color: "#1c1c3c"
  app-header-text-color: "#ddeeff"
  success-color: "#5f9ea0"
  warning-color: "#b0e0e6"
  error-color: "#ff2200"

CB-LCARS Yellow Alert:
  primary-color: "#ffcc33"
  primary-background-color: "#4b4b00"
  secondary-background-color: "#6b6b00"
  text-primary-color: "#fffacd"
  text-color: "#fffacd"
  card-background-color: "#4b4b00"
  app-header-background-color: "#4b4b00"
  app-header-text-color: "#fffacd"
  success-color: "#ffec8b"
  warning-color: "#ffd700"
  error-color: "#ff2200"

CB-LCARS Black Alert:
  primary-color: "#999999"
  primary-background-color: "#0d0d0d"
  secondary-background-color: "#1a1a1a"
  text-primary-color: "#cccccc"
  text-color: "#cccccc"
  card-background-color: "#0d0d0d"
  app-header-background-color: "#0d0d0d"
  app-header-text-color: "#cccccc"
  success-color: "#808080"
  warning-color: "#999999"
  error-color: "#ff0000"

CB-LCARS Gray Alert:
  primary-color: "#6b6b6b"
  primary-background-color: "#2b2b2b"
  secondary-background-color: "#3b3b3b"
  text-primary-color: "#d0d0d0"
  text-color: "#d0d0d0"
  card-background-color: "#2b2b2b"
  app-header-background-color: "#2b2b2b"
  app-header-text-color: "#d0d0d0"
  success-color: "#7b7b7b"
  warning-color: "#8b8b8b"
  error-color: "#ff0000"
"""

# Write the themes file
themes_path = '/opt/homeassistant/config/themes/cb-lcars-themes.yaml'
os.makedirs(os.path.dirname(themes_path), exist_ok=True)
with open(themes_path, 'w') as f:
    f.write(themes_content)
print(f"Created: {themes_path}")

# Create a README file
readme_content = """# CB-LCARS Control Board Themes for Home Assistant

## Overview
CB-LCARS (Control Board LCARS) is a Star Trek-inspired card set and theme collection for Home Assistant.

## Available Alert Themes
1. **CB-LCARS Green Alert** - Normal operations
2. **CB-LCARS Red Alert** - Emergency/Action mode  
3. **CB-LCARS Blue Alert** - Standby/Scientific mode
4. **CB-LCARS Yellow Alert** - Caution/Warning mode
5. **CB-LCARS Black Alert** - Stealth/Dark mode
6. **CB-LCARS Gray Alert** - Neutral/Maintenance mode

## How to Use
1. Go to your user profile (bottom left)
2. Under "Theme", select any "CB-LCARS" theme
3. Or use the automation: `frontend.set_theme` with theme name

## Resources
- CB-LCARS Repository: https://github.com/snootched/cb-lcars
- LCARS Color Reference: https://www.thelcars.com
"""

readme_path = '/opt/homeassistant/config/www/CB-LCARS-README.md'
with open(readme_path, 'w') as f:
    f.write(readme_content)
print(f"Created: {readme_path}")

print("\\nCB-LCARS themes setup complete!")
print("Restart Home Assistant to load the new themes.")
"""

# Write and execute the script
script_path = '/tmp/setup_cb_lcars_themes.py'
with open(script_path, 'w') as f:
    f.write(script_content)
os.chmod(script_path, 0o755)
exec(open(script_path).read())
