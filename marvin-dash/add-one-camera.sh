#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

# Wyze bridge Docker IP
WYZE_IP="172.17.0.2"

echo "Starting generic camera flow..."
FLOW=$(curl -s --max-time 10 -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"handler":"generic"}' \
  http://localhost:8123/api/config/config_entries/flow)

FLOW_ID=$(echo "$FLOW" | grep -o '"flow_id":"[^"]*"' | cut -d'"' -f4)
echo "Flow ID: $FLOW_ID"

# Use thumb URL (cached from Wyze cloud, always available)
echo "Submitting config (thumb URL)..."
RESULT=$(curl -s --max-time 30 -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"still_image_url\":\"http://$WYZE_IP:5000/thumb/driveway.jpg\",\"stream_source\":\"\",\"username\":\"\",\"password\":\"\",\"advanced\":{\"framerate\":2,\"verify_ssl\":false,\"rtsp_transport\":\"tcp\",\"authentication\":\"basic\"}}" \
  "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")

echo "Result: $RESULT"

# Check for next step
TYPE=$(echo "$RESULT" | grep -o '"type":"[^"]*"' | head -1 | cut -d'"' -f4)
STEP=$(echo "$RESULT" | grep -o '"step_id":"[^"]*"' | head -1 | cut -d'"' -f4)
NEW_FLOW_ID=$(echo "$RESULT" | grep -o '"flow_id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Type: $TYPE, Step: $STEP"

if [ "$TYPE" = "form" ] && [ "$STEP" = "user_confirm_still" ]; then
  echo "Submitting name..."
  FINAL=$(curl -s --max-time 10 -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Driveway"}' \
    "http://localhost:8123/api/config/config_entries/flow/$NEW_FLOW_ID")
  echo "Final: $FINAL"
fi
