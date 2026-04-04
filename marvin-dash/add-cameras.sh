#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

# Function to add a camera
add_camera() {
  local name="$1"
  local stream="$2"
  local still="$3"
  
  echo "Adding camera: $name"
  
  # Start config flow
  FLOW=$(curl -s -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"handler":"generic"}' \
    http://localhost:8123/api/config/config_entries/flow)
  
  FLOW_ID=$(echo "$FLOW" | grep -o '"flow_id":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$FLOW_ID" ]; then
    echo "  Failed to start flow for $name"
    return 1
  fi
  
  # Submit camera config with correct schema
  RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"stream_source\":\"$stream\",\"still_image_url\":\"$still\",\"username\":\"\",\"password\":\"\",\"advanced\":{\"framerate\":2,\"verify_ssl\":true,\"rtsp_transport\":\"tcp\",\"authentication\":\"basic\"}}" \
    "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")
  
  # Check for second step (preview/confirm)
  TYPE=$(echo "$RESULT" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
  if [ "$TYPE" = "form" ]; then
    NEW_FLOW_ID=$(echo "$RESULT" | grep -o '"flow_id":"[^"]*"' | cut -d'"' -f4)
    STEP=$(echo "$RESULT" | grep -o '"step_id":"[^"]*"' | cut -d'"' -f4)
    echo "  Next step: $STEP"
    
    # Submit name and confirm
    RESULT=$(curl -s -X POST \
      -H "Authorization: Bearer $HA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"$name\"}" \
      "http://localhost:8123/api/config/config_entries/flow/$NEW_FLOW_ID")
  fi
  
  if echo "$RESULT" | grep -q '"type":"create_entry"'; then
    echo "  ✓ Added $name"
  else
    echo "  ✗ Result: $(echo "$RESULT" | head -c 200)"
  fi
}

# Add key cameras
add_camera "Driveway" "rtsp://localhost:8554/driveway" "http://localhost:5000/snapshot/driveway.jpg"
add_camera "Front Yard West" "rtsp://localhost:8554/front-yard-west" "http://localhost:5000/snapshot/front-yard-west.jpg"
add_camera "Front Yard East" "rtsp://localhost:8554/front-yard-east" "http://localhost:5000/snapshot/front-yard-east.jpg"
add_camera "Garage" "rtsp://localhost:8554/garage" "http://localhost:5000/snapshot/garage.jpg"
add_camera "Backyard" "rtsp://localhost:8554/backyard" "http://localhost:5000/snapshot/backyard.jpg"
add_camera "Back Patio" "rtsp://localhost:8554/back-patio" "http://localhost:5000/snapshot/back-patio.jpg"

echo ""
echo "Done! More cameras can be added via HA UI."
