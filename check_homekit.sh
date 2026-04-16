#!/bin/bash
# Check HomeKit bridge status

echo "=== Home Assistant HomeKit Bridge Status ==="
echo ""
echo "Checking HomeKit configuration..."
docker exec homeassistant bash -c 'cat /config/homekit.yaml | grep -E "^\s*-\s*name:|port:" | head -20'

echo ""
echo "=== Recent HomeKit logs ==="
docker logs homeassistant 2>&1 | grep -i homekit | tail -20

echo ""
echo "=== Checking if all bridges are loading ==="
docker logs homeassistant 2>&1 | grep -iE "(bridge.*starting|homekit.*setup)" | tail -20

echo ""
echo "Done!"
