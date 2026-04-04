#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

# Start HomeKit config flow
echo "Starting HomeKit Bridge config flow..."
FLOW=$(curl -s -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"handler":"homekit"}' \
  http://localhost:8123/api/config/config_entries/flow)

echo "Flow response: $FLOW"

FLOW_ID=$(echo "$FLOW" | grep -o '"flow_id":"[^"]*"' | cut -d'"' -f4)
echo "Flow ID: $FLOW_ID"

if [ -z "$FLOW_ID" ]; then
  echo "Failed to get flow ID"
  exit 1
fi

# Submit domain selection (lights, switches, cameras, sensors)
echo "Submitting domain selection..."
RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"include_domains":["light","switch","camera","sensor","binary_sensor","climate","cover","fan","lock"]}' \
  "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")

echo "Result: $RESULT"

# Check if we need another step
TYPE=$(echo "$RESULT" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
echo "Response type: $TYPE"

if [ "$TYPE" = "form" ]; then
  NEW_FLOW_ID=$(echo "$RESULT" | grep -o '"flow_id":"[^"]*"' | cut -d'"' -f4)
  STEP=$(echo "$RESULT" | grep -o '"step_id":"[^"]*"' | cut -d'"' -f4)
  echo "Next step: $STEP, Flow ID: $NEW_FLOW_ID"
  
  # Submit empty for pairing step (uses defaults)
  echo "Completing with defaults..."
  FINAL=$(curl -s -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "http://localhost:8123/api/config/config_entries/flow/$NEW_FLOW_ID")
  echo "Final: $FINAL"
fi
