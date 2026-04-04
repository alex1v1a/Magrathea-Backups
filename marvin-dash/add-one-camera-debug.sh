#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"
WYZE_IP="172.17.0.2"

echo "=== Step 1: Start flow ==="
RESULT=$(curl -s --max-time 10 -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"handler":"generic"}' \
  http://localhost:8123/api/config/config_entries/flow)
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
FLOW_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['flow_id'])" 2>/dev/null)
echo "Flow ID: $FLOW_ID"

echo ""
echo "=== Step 2: Submit config ==="
RESULT=$(curl -s --max-time 15 -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"still_image_url\":\"http://$WYZE_IP:5000/thumb/driveway.jpg\",\"stream_source\":\"\",\"username\":\"\",\"password\":\"\",\"advanced\":{\"framerate\":2,\"verify_ssl\":false}}" \
  "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
STEP=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('step_id',''))" 2>/dev/null)
echo "Next step: $STEP"

echo ""
echo "=== Step 3: Confirm ==="
RESULT=$(curl -s --max-time 10 -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmed_ok":true}' \
  "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
STEP=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('step_id',''))" 2>/dev/null)
echo "Next step: $STEP"

echo ""
echo "=== Step 4: Name ==="
RESULT=$(curl -s --max-time 10 -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Driveway"}' \
  "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
