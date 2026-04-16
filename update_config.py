#!/usr/bin/env python3
"""
Update configuration.yaml to include homekit.yaml
Removes old homekit section and adds include directive
"""

import re

config_path = '/home/marvin/homeassistant/config/configuration.yaml'

# Read current configuration
with open(config_path, 'r') as f:
    content = f.read()

# Find and remove the old homekit section
# Pattern matches the homekit: section with all its content until the next top-level key
pattern = r'# ============================================\s*\n# HOMEKIT BRIDGE\s*\n# ============================================\s*\nhomekit:.*?\n(http:|# ============================================|$)'

# Remove old homekit section
new_content = re.sub(pattern, r'\1', content, flags=re.DOTALL)

# If pattern didn't match, try simpler approach - find homekit: block
if 'homekit:' in new_content and 'homekit.yaml' not in new_content:
    lines = new_content.split('\n')
    new_lines = []
    in_homekit = False
    homekit_indent = None
    
    for line in lines:
        # Check if we're at the start of homekit section
        if line.strip().startswith('homekit:') and not line.strip().startswith('#'):
            in_homekit = True
            homekit_indent = len(line) - len(line.lstrip())
            continue
        
        # Check if we've exited the homekit section (new top-level key or comment block)
        if in_homekit:
            if line.strip() and not line.strip().startswith('#'):
                current_indent = len(line) - len(line.lstrip())
                if current_indent <= homekit_indent:
                    in_homekit = False
            # Skip lines in homekit section
            if in_homekit:
                continue
        
        new_lines.append(line)
    
    new_content = '\n'.join(new_lines)

# Find a good place to add the include directive
# Add it after the last !include line or at the end of basic config
include_pattern = r'(script: !include scripts\.yaml\s*\n)'
if re.search(include_pattern, new_content):
    new_content = re.sub(include_pattern, r'\1\n# HomeKit Bridge Configuration\nhomekit: !include homekit.yaml\n', new_content)
else:
    # Add before http: section
    new_content = re.sub(r'(\nhttp:)', r'\n# HomeKit Bridge Configuration\nhomekit: !include homekit.yaml\n\1', new_content)

# Clean up multiple blank lines
new_content = re.sub(r'\n{3,}', '\n\n', new_content)

# Write updated configuration
with open(config_path, 'w') as f:
    f.write(new_content)

print("✓ Updated configuration.yaml")
print("  - Backed up to: configuration.yaml.backup.pre_homekit")
print("  - Removed old homekit section")
print("  - Added: homekit: !include homekit.yaml")
