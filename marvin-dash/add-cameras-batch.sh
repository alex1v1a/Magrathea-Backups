#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"
WYZE_IP="172.17.0.2"

add_camera() {
  local cam_id="$1"
  
  echo -n "Adding $cam_id... "
  
  # Start flow
  FLOW=$(curl -s --max-time 10 -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"handler":"generic"}' \
    http://localhost:8123/api/config/config_entries/flow 2>/dev/null)
  
  FLOW_ID=$(echo "$FLOW" | python3 -c "import sys,json; print(json.load(sys.stdin)['flow_id'])" 2>/dev/null)
  
  if [ -z "$FLOW_ID" ]; then
    echo "✗ (no flow)"
    return
  fi
  
  # Submit config
  curl -s --max-time 15 -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"still_image_url\":\"http://$WYZE_IP:5000/thumb/$cam_id.jpg\",\"stream_source\":\"\",\"username\":\"\",\"password\":\"\",\"advanced\":{\"framerate\":2,\"verify_ssl\":false}}" \
    "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID" >/dev/null 2>&1
  
  # Confirm
  RESULT=$(curl -s --max-time 10 -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"confirmed_ok":true}' \
    "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID" 2>/dev/null)
  
  if echo "$RESULT" | grep -q '"type":"create_entry"'; then
    echo "✓"
  else
    echo "✗"
  fi
}

echo "Adding remaining Wyze cameras..."
echo ""

add_camera "toolbox"
add_camera "garden-tools"
add_camera "saxton"
add_camera "bedroom-backyard"
add_camera "print-mill"

echo ""
echo "Done!"
