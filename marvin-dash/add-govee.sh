#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"
GOVEE_API_KEY="a58b8033-ae31-460e-aa5c-c9f5f231f510"

# Step 1: Initialize config flow
echo "Starting Govee config flow..."
FLOW=$(curl -s -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"handler":"goveelife"}' \
  http://localhost:8123/api/config/config_entries/flow)

echo "Flow response: $FLOW"

FLOW_ID=$(echo "$FLOW" | grep -o '"flow_id":"[^"]*"' | cut -d'"' -f4)
echo "Flow ID: $FLOW_ID"

if [ -z "$FLOW_ID" ]; then
  echo "Failed to get flow ID"
  exit 1
fi

# Step 2: Submit config with all required fields
echo "Submitting configuration..."
RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"friendly_name\":\"Govee\",\"api_key\":\"$GOVEE_API_KEY\",\"scan_interval\":60,\"timeout\":10}" \
  "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")

echo "Result: $RESULT"
