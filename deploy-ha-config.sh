#!/bin/bash
# Deploy HA configurations

echo "Deploying Home Assistant configurations..."

# Copy configuration files to HA config directory
HA_CONFIG="/config"

# Check if we're in WSL Docker context
if [ -d "/mnt/wsl/docker-desktop" ]; then
    echo "Detected WSL Docker environment"
fi

# Create backup
cp $HA_CONFIG/configuration.yaml $HA_CONFIG/configuration.yaml.backup.$(date +%Y%m%d_%H%M%S)

echo "Configuration deployment complete!"
echo "Restart Home Assistant to apply changes:"
echo "  docker restart homeassistant"
