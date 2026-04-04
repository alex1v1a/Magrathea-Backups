# Kanban & WSL Setup - Complete

*Setup completed: February 3, 2026*

---

## ✅ Completed Tasks

### 1. Kanban Board Cleanup
- **Consolidated 16+ duplicate Home Assistant tasks** into 5 focused items
- **Organized columns:**
  - **To Do (6):** Tax Prep 2025, Vectarr Outreach, Grocery System, Email Triage, Amazon SNS Audit, Portfolio Review
  - **In Progress (5):** F-150 Sale, HA Govee Integration, HA HomeKit Bridge, HA Wyze Cameras, HA Voice Control
  - **Review (0):** Empty (all items completed)
  - **Completed (8):** OpenClaw Service, Docker WSL, HA Deployed, HA Port Forward, HA Onboarding, F-150 Posts, Kanban Auto-Refresh, WSL 24/7

### 2. Kanban Auto-Refresh Service
**Scheduled Task:** `Kanban-AutoRefresh`
- **Runs:** Every 30 minutes
- **Script:** `C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\kanban-refresh.js`
- **Log:** `C:\Users\Admin\.openclaw\workspace\marvin-dash\data\kanban-refresh.log`
- **Features:**
  - Detects task changes (new, completed, moved)
  - Reports status summary
  - Attempts Discord notification (if webhook configured)
  - Falls back to OpenClaw webhook
  - Saves state for change detection

**To Configure Discord:**
Set environment variable `KANBAN_DISCORD_WEBHOOK` to your Discord webhook URL

### 3. WSL 24/7 Service
**Scheduled Task:** `WSL-24x7-Monitor`
- **Runs:** Every 5 minutes
- **Script:** `C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\wsl-monitor.bat`
- **Log:** `C:\Users\Admin\.openclaw\workspace\marvin-dash\data\wsl-monitor.log`
- **Features:**
  - Starts WSL Ubuntu if not running
  - Launches keep-alive script inside WSL
  - Auto-restarts on failure (3 retry attempts)
  - Monitors Docker and container health
  - Runs whether user is logged on or not

**Inside WSL Keep-Alive:**
- Path: `/mnt/c/Users/Admin/.openclaw/workspace/marvin-dash/scripts/wsl-keepalive.sh`
- Touches `/tmp/wsl-alive` every minute
- Restarts Docker if stopped
- Restarts Home Assistant container if stopped
- Restarts Wyze Bridge if stopped

---

## 📋 Management Commands

### View Scheduled Tasks
```powershell
Get-ScheduledTask -TaskName "WSL-24x7-Monitor", "Kanban-AutoRefresh" | Select-Object TaskName, State, NextRunTime
```

### Run Kanban Refresh Manually
```powershell
cd C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts
node kanban-refresh.js
```

### View Logs
```powershell
# Kanban refresh log
Get-Content C:\Users\Admin\.openclaw\workspace\marvin-dash\data\kanban-refresh.log -Tail 20

# WSL monitor log
Get-Content C:\Users\Admin\.openclaw\workspace\marvin-dash\data\wsl-monitor.log -Tail 20
```

### Disable/Enable Services
```powershell
# Disable
Disable-ScheduledTask -TaskName "Kanban-AutoRefresh"
Disable-ScheduledTask -TaskName "WSL-24x7-Monitor"

# Enable
Enable-ScheduledTask -TaskName "Kanban-AutoRefresh"
Enable-ScheduledTask -TaskName "WSL-24x7-Monitor"
```

### Uninstall Services
```powershell
# Run as Administrator
C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\setup-kanban-service.ps1 -Uninstall
C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\setup-wsl-service.ps1 -Uninstall
```

---

## 🔧 Files Created

```
marvin-dash/
├── data/
│   └── tasks.json (updated - consolidated tasks)
├── scripts/
│   ├── kanban-refresh.js (auto-refresh logic)
│   ├── kanban-refresh.bat (Windows wrapper)
│   ├── wsl-keepalive.sh (WSL keep-alive script)
│   ├── wsl-monitor.bat (Windows monitor wrapper)
│   ├── setup-kanban-service.ps1 (installer)
│   └── setup-wsl-service.ps1 (installer)
└── KANBAN_SETUP.md (this file)
```

---

## 📊 Current Kanban Status

| Column | Count | Highlights |
|--------|-------|------------|
| To Do | 6 | Tax prep (high priority), Vectarr outreach |
| In Progress | 5 | Home Assistant integrations ongoing |
| Review | 0 | All items completed |
| Completed | 8 | All setup tasks done |

---

## 🔔 Notifications

The kanban refresh will notify when:
- New tasks are added
- Tasks are moved to completed
- Every 30 minutes with current status

**Current notification method:** Logs to file + attempts OpenClaw webhook

**To add Discord:** Set the `KANBAN_DISCORD_WEBHOOK` environment variable with your Discord webhook URL, or edit `kanban-refresh.js` to add the webhook URL directly.
