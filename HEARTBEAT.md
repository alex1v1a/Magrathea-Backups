# HEARTBEAT.md

# Heartbeat Tasks - Checked periodically by the agent

## Kanban Board Check
- Check Marvin's Dashboard at http://localhost:3001
- Run: node ~/.openclaw/workspace/marvin-dash/scripts/kanban-sync.js
- Report any stale tasks or issues

## WSL Status Check
- Verify WSL Ubuntu is running: wsl --list --running
- Check responsiveness: wsl echo "ping"
- Report if issues found

## General System Health
- Check if dashboard server is responding
- Verify cron jobs are running: openclaw cron list

## Auto-Recovery Check
- Check recovery log: cat marvin-dash/data/recovery.log | tail -20
- Verify Windows Task "Marvin Auto Recovery" is running: schtasks /Query /TN "Marvin Auto Recovery"
- Report any failed recoveries

## Task Log Review
- Read marvin-dash/data/task-log.md
- Check for tasks marked "waiting" or "blocked" that need follow-up
- Report any actions needed without user prompting
- Update task status if progress made
