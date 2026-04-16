#!/usr/bin/env python3
"""
Add mDNS advertising configuration to homekit.yaml
"""

yaml_path = '/home/marvin/homeassistant/config/homekit.yaml'

# Read the file
with open(yaml_path, 'r') as f:
    lines = f.readlines()

# New content
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Check for bridge definitions
    if 'name: "Austin Lights"' in line:
        new_lines.append(line)
        i += 1
        # Add ip_address and advertise_ip after port
        new_lines.append(lines[i])  # port line
        new_lines.append('    ip_address: 10.0.1.90\n')
        new_lines.append('    advertise_ip:\n')
        new_lines.append('      - 10.0.1.90\n')
        i += 1
    elif 'name: "Austin Sensors"' in line:
        new_lines.append(line)
        i += 1
        new_lines.append(lines[i])  # port line
        new_lines.append('    ip_address: 10.0.1.90\n')
        new_lines.append('    advertise_ip:\n')
        new_lines.append('      - 10.0.1.90\n')
        i += 1
    elif 'name: "Sayville Lights"' in line:
        new_lines.append(line)
        i += 1
        new_lines.append(lines[i])  # port line
        new_lines.append('    ip_address: 10.0.1.90\n')
        new_lines.append('    advertise_ip:\n')
        new_lines.append('      - 10.0.1.90\n')
        new_lines.append('      - 10.1.1.90\n')
        i += 1
    elif 'name: "Sayville Switches"' in line:
        new_lines.append(line)
        i += 1
        new_lines.append(lines[i])  # port line
        new_lines.append('    ip_address: 10.0.1.90\n')
        new_lines.append('    advertise_ip:\n')
        new_lines.append('      - 10.0.1.90\n')
        new_lines.append('      - 10.1.1.90\n')
        i += 1
    elif 'name: "Parnell Lights"' in line:
        new_lines.append(line)
        i += 1
        new_lines.append(lines[i])  # port line
        new_lines.append('    ip_address: 10.0.1.90\n')
        new_lines.append('    advertise_ip:\n')
        new_lines.append('      - 10.0.1.90\n')
        new_lines.append('      - 10.2.1.90\n')
        i += 1
    elif 'name: "Parnell Switches"' in line:
        new_lines.append(line)
        i += 1
        new_lines.append(lines[i])  # port line
        new_lines.append('    ip_address: 10.0.1.90\n')
        new_lines.append('    advertise_ip:\n')
        new_lines.append('      - 10.0.1.90\n')
        new_lines.append('      - 10.2.1.90\n')
        i += 1
    else:
        new_lines.append(line)
        i += 1

# Write updated file
with open(yaml_path, 'w') as f:
    f.writelines(new_lines)

print("✓ Added mDNS advertising configuration to all bridges")
