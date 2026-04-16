#!/bin/bash
# Team Health Monitor & Auto-Recovery Script
# Runs every 5 minutes via cron

LOG_FILE="/tmp/team-health-monitor.log"
TEAM_MEMBERS=(
  "trillian:10.0.1.199:hanka"
  "bistromath:10.0.1.9:anouk"
  "marvin:10.0.1.90:admin"
)

echo "$(date): Starting team health check" >> $LOG_FILE

for member in "${TEAM_MEMBERS[@]}"; do
  IFS=':' read -r name ip user <<< "$member"
  
  echo "$(date): Checking $name ($ip)..." >> $LOG_FILE
  
  # Check if machine is reachable
  if ! ping -c 1 -W 3 "$ip" > /dev/null 2>&1; then
    echo "$(date): ❌ $name ($ip) - OFFLINE (ping failed)" >> $LOG_FILE
    continue
  fi
  
  # Check SSH connectivity
  if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$user@$ip" "echo 'OK'" > /dev/null 2>&1; then
    echo "$(date): ⚠️ $name ($ip) - SSH failed, skipping recovery" >> $LOG_FILE
    continue
  fi
  
  # Check if OpenClaw gateway is running
  if [ "$name" == "bistromath" ]; then
    # Windows check
    process_count=$(ssh -o ConnectTimeout=5 "$user@$ip" 'tasklist | findstr -i openclaw | wc -l' 2>/dev/null)
    if [ "$process_count" -eq 0 ]; then
      echo "$(date): 🔄 $name - No OpenClaw processes, attempting restart..." >> $LOG_FILE
      ssh -o ConnectTimeout=5 "$user@$ip" 'cd C:\openclaw && npx openclaw gateway --port 18789 > gateway.log 2>&1 &' 2>/dev/null
      echo "$(date): ✅ $name - Restart initiated" >> $LOG_FILE
    else
      echo "$(date): ✅ $name - Gateway running ($process_count processes)" >> $LOG_FILE
    fi
  else
    # macOS/Linux check
    process_count=$(ssh -o ConnectTimeout=5 "$user@$ip" 'ps aux | grep openclaw-gateway | grep -v grep | wc -l' 2>/dev/null)
    if [ "$process_count" -eq 0 ]; then
      echo "$(date): 🔄 $name - No OpenClaw gateway, attempting restart..." >> $LOG_FILE
      ssh -o ConnectTimeout=5 "$user@$ip" 'export NVM_DIR=$HOME/.nvm && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22.16.0 > /dev/null 2>&1; nohup openclaw gateway --port 18789 > /tmp/openclaw-gateway.log 2>&1 &' 2>/dev/null
      echo "$(date): ✅ $name - Restart initiated" >> $LOG_FILE
    else
      # Check for zombie processes (high CPU or stuck)
      zombie_check=$(ssh -o ConnectTimeout=5 "$user@$ip" 'ps aux | grep openclaw-gateway | grep -v grep | awk "{print \$3}" | grep -E "^9[0-9]" | wc -l' 2>/dev/null)
      if [ "$zombie_check" -gt 0 ]; then
        echo "$(date): 🔄 $name - Zombie process detected (high CPU), restarting..." >> $LOG_FILE
        ssh -o ConnectTimeout=5 "$user@$ip" 'pkill -9 -f openclaw; sleep 3; export NVM_DIR=$HOME/.nvm && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22.16.0 > /dev/null 2>&1; nohup openclaw gateway --port 18789 > /tmp/openclaw-gateway.log 2>&1 &' 2>/dev/null
        echo "$(date): ✅ $name - Zombie cleared and restarted" >> $LOG_FILE
      else
        echo "$(date): ✅ $name - Gateway running normally" >> $LOG_FILE
      fi
    fi
  fi
done

echo "$(date): Health check complete" >> $LOG_FILE
echo "---" >> $LOG_FILE
