#!/bin/bash
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNDc4ZTA1MzlmNDM2MDk3MDVjMWEyZDM2ZDBjYzVhYiIsImlhdCI6MTc3MDA1Mjc0MiwiZXhwIjoyMDgyNzU4NDAwfQ.UtveXN7m7O-jZYpkR6Cdug6hjRGDNQL8Xe7PxIupdXY"

try_password() {
  local pw="$1"
  echo -n "Trying password '$pw'... "
  
  FLOW=$(curl -s --max-time 10 -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"handler":"powerwall"}' \
    http://localhost:8123/api/config/config_entries/flow)
  
  FLOW_ID=$(echo "$FLOW" | python3 -c "import sys,json; print(json.load(sys.stdin)['flow_id'])" 2>/dev/null)
  
  RESULT=$(curl -s --max-time 30 -X POST \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"ip_address\":\"10.0.1.70\",\"password\":\"$pw\"}" \
    "http://localhost:8123/api/config/config_entries/flow/$FLOW_ID")
  
  if echo "$RESULT" | grep -q '"type":"create_entry"'; then
    echo "✓ SUCCESS!"
    echo "$RESULT" | python3 -m json.tool
    exit 0
  elif echo "$RESULT" | grep -q 'invalid_auth'; then
    echo "✗ wrong password"
  else
    echo "?"
    echo "$RESULT"
  fi
}

echo "Trying common Powerwall passwords..."
try_password "customer"
try_password "S+00F5F"
try_password "ST00F5F" 
try_password ""

echo ""
echo "None worked. Check the password label inside your Gateway."
