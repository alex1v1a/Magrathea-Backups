#!/bin/bash
# Restart Home Assistant

echo "Restarting Home Assistant..."

# Try to restart using docker
if command -v docker &> /dev/null; then
    echo "Using Docker..."
    sudo docker restart homeassistant
else
    echo "Docker not found, trying alternative methods..."
    
    # Check if HA is running as a service
    if systemctl is-active --quiet homeassistant; then
        echo "Restarting HA service..."
        sudo systemctl restart homeassistant
    else
        echo "Please restart HA manually via the UI:"
        echo "Developer Tools -> YAML -> Restart"
    fi
fi

echo "Done!"
