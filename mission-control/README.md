# Vectarr Mission Control

A comprehensive dashboard for managing Vectarr operations including machine shop outreach, customer projects, content calendar, and automated cron jobs.

## Features

### 1. Overview Dashboard
- Real-time statistics on machine shop outreach
- Active project counts
- Email activity tracking
- Response rate metrics

### 2. Kanban Boards
**Machine Shop Outreach Pipeline:**
- Prospects → Contacted → Responded → In Discussion → Onboarding → Active → Paused → Declined

**Customer Project Tracking:**
- New Inquiries → Quoted → In Production → Completed → Review Pending → Issues

**Content Calendar:**
- Ideas → In Progress → Review → Scheduled → Published → Promoted

### 3. Calendar
- Visual calendar with past and future events
- Cron job schedules displayed
- Email activity tracking
- Color-coded event types

### 4. Scheduler
- Daily time-based view
- Automated task scheduling
- Manual task management

### 5. Cron Jobs Monitor
- Active job listing
- Schedule display
- Job history and status
- Automatic updates from OpenClaw cron system

## Current Cron Jobs

| Job Name | Schedule | Status |
|----------|----------|--------|
| Daily Machine Shop Outreach | 5:00 AM daily | Active |
| Daily Email Summary | 2:00 PM daily | Active |

## Access

**Local URL:** http://localhost:8080/

**LAN URL:** http://10.0.1.99:8080/ (accessible from any device on your network)

### Firewall Configuration

If you cannot access the dashboard from other devices, you may need to allow the port through Windows Firewall:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Vectarr Mission Control" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

## Starting the Server

### Option 1: Batch File (Windows)
Double-click `start.bat`

### Option 2: PowerShell
```powershell
cd C:\Users\admin\.openclaw\workspace\mission-control
.\server.ps1
```

### Option 3: Auto-start on Boot
Create a shortcut to `start.bat` in your Startup folder:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```

## File Structure

```
mission-control/
├── index.html          # Main dashboard interface
├── server.ps1          # PowerShell HTTP server
├── start.bat           # Windows startup script
└── README.md           # This file
```

## Data Sources

The dashboard integrates with:
- **Machine Shops CSV:** `OneDrive - Vectarr/Communication site - Company Files/Vectarr/Marketing Research/Outreach/Machine Shops.csv`
- **Outlook:** Drafts and Sent folders for email tracking
- **OpenClaw Cron:** Automatic job status updates

## Future Enhancements

- [ ] Real-time data sync from CSV
- [ ] Email reply tracking
- [ ] Automated card movement in Kanban
- [ ] Response rate analytics
- [ ] Integration with Vectarr platform API

## Support

For issues or feature requests, contact the Vectarr operations team.

---
*Powered by OpenClaw | Vectarr Operations*
