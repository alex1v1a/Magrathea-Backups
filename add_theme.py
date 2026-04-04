#!/usr/bin/env python3
import os
import sys

theme_content = '''
# ======================================================= #
#        LCARS Picard [cb-lcars] Theme Definition         #
# ======================================================= #
LCARS Picard [cb-lcars]:
  card-mod-theme: LCARS Picard [cb-lcars]
  # Colors have been sourced and combined from HA-LCARS, thelcars.com, augmented with mewho.com/titan

  #oranges
  picard-darkest-orange: "#d91604"
  picard-dark-orange: "#ef1d10"
  picard-medium-dark-orange: "#e7442a"
  picard-orange: "#ff6753"
  picard-medium-light-orange: "#ff8470"
  picard-light-orange: "#ff977b"
  picard-lightest-orange: "#ffb399"

  #grays
  picard-darkest-gray: "#1e2229"
  picard-dark-gray: "#2f3749"
  picard-medium-dark-gray: "#52596e"
  picard-gray: "#6d748c"
  picard-medium-light-gray: "#9ea5ba"
  picard-light-gray: "#d2d5df"
  picard-lightest-gray: "#f3f4f7"

  picard-moonlight: "#dfe1e8"

  #blues
  picard-darkest-blue: "#002241"
  picard-dark-blue: "#1c3c55"
  picard-medium-dark-blue: "#2a7193"
  picard-blue: "#37a6d1"
  picard-medium-light-blue: "#67caf0"
  picard-light-blue: "#93e1ff"
  picard-lightest-blue: "#00eeee"

  #greens
  picard-darkest-green: "#0c2a15"
  picard-dark-green: "#083717"
  picard-medium-dark-green: "#095320"
  picard-green: "#266239"
  picard-medium-light-green: "#458359"
  picard-light-green: "#80bb93"
  picard-lightest-green: "#b8e0c1"

  #yellows
  picard-darkest-yellow: "#70602c"
  picard-dark-yellow: "#ac943b"
  picard-medium-dark-yellow: "#d2bf50"
  picard-yellow: "#f9ef97"
  picard-medium-light-yellow: "#fffac9"
  picard-light-yellow: "#e7e6de"
  picard-lightest-yellow: "#f5f5dc"

  #one-offs
  picard-black-cherry: "#8c6d7c"
  picard-font-color: "#828ba6"
  lcars-modern-light-gray: "#9996BA"
  lcars-text-gray: var(--picard-font-color)

  mdc-theme-text-primary-on-background: var(--lcars-text-gray)
  mdc-theme-text-secondary-on-background: var(--lcars-text-gray)
  code-editor-background-color: var(--black-color)

  <<: *lcars-variables
  <<: *base
  <<: *card-mod-css

  # Sidebar Menu
  sidebar-background-color: var(--lcars-ui-primary)
  sidebar-icon-color: black
  sidebar-text-color: black
  sidebar-selected-background-color: var(--picard-light-gray)
  sidebar-selected-icon-color: black
  sidebar-selected-text-color: black

  font-family: "cb-lcars_antonio, Antonio, Segoe UI Variable Static Text, Segoe UI, SegoeUI, -apple-system,BlinkMacSystemFont, system-ui, sans-serif"

  # Primary colors
  lcars-ui-primary: var(--picard-gray)
  lcars-ui-secondary: var(--picard-medium-light-gray)
  lcars-ui-tertiary: var(--picard-medium-dark-orange)
  lcars-ui-quaternary: var(--picard-dark-gray)
  lcars-alert-color: var(--picard-dark-orange)

  # Header colors
  lcars-ui-app-header-background-color: "#272727"
  lcars-ui-app-header-text-color: var(--picard-lightest-gray)
  lcars-ui-app-header-clock: var(--picard-light-orange)

  # Card colors
  lcars-card-top-color: var(--picard-dark-gray)
  lcars-card-mid-left-color: var(--picard-gray)
  lcars-card-button: var(--picard-medium-light-gray)
  lcars-card-button-off: var(--picard-gray)
  lcars-card-button-unavailable: var(--picard-dark-gray)
  lcars-card-button-bar: var(--picard-dark-gray)
  lcars-card-bottom-color: var(--picard-dark-gray)
  lcars-card-background: var(--picard-gray)
  
  # Misc
  success-color: var(--picard-green)
  warning-color: var(--picard-orange)
  error-color: var(--picard-dark-orange)
'''

theme_file = '/opt/homeassistant/config/themes/lcars/lcars.yaml'

try:
    with open(theme_file, 'a') as f:
        f.write(theme_content)
    print(f"Successfully appended CB-LCARS theme to {theme_file}")
except PermissionError:
    print(f"Permission denied: {theme_file}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
