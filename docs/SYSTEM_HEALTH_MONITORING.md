# System Health Monitoring

Comprehensive health monitoring solution for Marvin's automation system.

## Overview

This health monitoring system provides:
- Real-time checks of all automation components
- Historical tracking of system health
- Email alerts when issues are detected
- Dashboard integration for visual monitoring
- CLI tool for manual checks and CI/CD integration

## Components

### 1. Health Monitor Module (`lib/health-monitor.js`)

A reusable Node.js module that provides comprehensive health checks:

**Checks performed:**
| Check | Description | Status |
|-------|-------------|--------|
| `browser-status` | Chrome/Edge running on port 9222 | ✅ Working |
| `disk-space` | Disk usage with warning/critical thresholds | ✅ Working |
| `memory-usage` | RAM usage percentage | ✅ Working |
| `cron-jobs` | Scheduled task status (Windows Task Scheduler) | ✅ Working |
| `email-connectivity` | SMTP/IMAP connectivity to iCloud | ✅ Working |
| `key-files` | Critical file existence and JSON validity | ✅ Working |
| `dashboard` | Marvin Dashboard on port 3001 | ✅ Working |
| `gateway` | OpenClaw Gateway on port 18789 | ✅ Working |
| `recipe-database` | Recipe database validity and structure | ✅ Working |
| `system-processes` | Node.js, Chrome, Edge, Python processes | ✅ Working |

### 2. CLI Tool (`scripts/system-health-check.js`)

Command-line interface for running health checks.

**Usage:**
```bash
# Run all checks with formatted output
node scripts/system-health-check.js

# Output JSON (for automation)
node scripts/system-health-check.js --json

# Send email if issues found
node scripts/system-health-check.js --email

# Update dashboard health status
node scripts/system-health-check.js --dashboard

# Minimal output (CI/CD friendly)
node scripts/system-health-check.js --quiet

# Write to log file
node scripts/system-health-check.js --log

# Combine options
node scripts/system-health-check.js --email --log --dashboard
```

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | All systems healthy |
| 1 | Warnings detected |
| 2 | Critical issues detected |
| 3 | Error running checks |

### 3. Log Files (`logs/health-YYYY-MM-DD.log`)

Health check history stored in JSON format:
```json
[
  {
    "timestamp": "2026-02-16T05:12:23.770Z",
    "status": "warning",
    "score": 95,
    "checks": [
      {
        "name": "browser-status",
        "status": "healthy",
        "message": "Chrome: not running, Edge: running",
        "duration": 3428
      }
      // ... more checks
    ]
  }
]
```

### 4. Dashboard Integration

Health monitoring is integrated with marvin-dash:

**API Endpoints:**
- `GET /api/health/status` - Current health status
- `POST /api/health/check` - Run health check now
- `GET /api/health/history` - Get health check history
- `GET /api/health/checks/:name` - Get specific check details
- `POST /api/health/alert` - Trigger email alert

**Scheduled Checks:**
- Runs every 15 minutes via node-cron
- Results saved to `marvin-dash/data/health-status.json`
- Real-time updates via WebSocket

## Configuration

Default thresholds (can be customized):
```javascript
{
  disk: {
    warningThreshold: 80,   // 80% full
    criticalThreshold: 90   // 90% full
  },
  memory: {
    warningThreshold: 85,   // 85% used
    criticalThreshold: 95   // 95% used
  },
  ports: {
    chrome: 9222,
    dashboard: 3001,
    gateway: 18789
  },
  cron: {
    tasks: [
      'Marvin Auto Recovery',
      'Marvin Email Monitor',
      'Marvin Backup',
      // ... etc
    ]
  }
}
```

## Programmatic Usage

```javascript
const { HealthMonitor, checkHealth } = require('./lib/health-monitor');

// Quick check
const report = await checkHealth();
console.log(`Health Score: ${report.overall.score}/100`);

// Custom configuration
const monitor = new HealthMonitor({
  disk: { warningThreshold: 75, criticalThreshold: 85 }
});
const report = await monitor.runAllChecks();

// Get individual results
const memory = report.checks.find(c => c.name === 'memory-usage');
console.log(`Memory: ${memory.data.usedPercent}%`);
```

## Email Alerts

Configure environment variables for email notifications:
```bash
ICLOUD_EMAIL=MarvinMartian9@icloud.com
ICLOUD_APP_PASSWORD=your-app-specific-password
```

Email is sent automatically when:
- Running with `--email` flag
- Critical issues are detected
- Dashboard POST /api/health/alert is called

## Integration Plan

### Phase 1: Core Monitoring (✅ Complete)
- [x] Create lib/health-monitor.js module
- [x] Create CLI tool scripts/system-health-check.js
- [x] Implement all 10 health checks
- [x] Add log file generation
- [x] Fix PowerShell compatibility (replaced wmic)

### Phase 2: Dashboard Integration (✅ Complete)
- [x] Add health API endpoints to marvin-dash/server.js
- [x] Add scheduled health checks (every 15 min)
- [x] Create health-status.json data file
- [x] WebSocket broadcast for real-time updates

### Phase 3: Alerting (✅ Complete)
- [x] Email notification functionality
- [x] HTML and plain text email templates
- [x] Automatic alerting on critical issues

### Phase 4: Future Enhancements (📋 Planned)
- [ ] Web dashboard health visualization widget
- [ ] Historical trend charts
- [ ] Custom alert thresholds per check
- [ ] Slack/Discord webhook notifications
- [ ] Health check scheduling via cron jobs
- [ ] Windows Service for background monitoring
- [ ] Integration with Windows Event Log

## Current Status

**Health Check Results (Latest):**
```
Overall Status: WARNING
Health Score: 95/100

✅ Healthy: 9
⚠️  Warning: 1
❌ Critical: 0
💥 Error: 0

Check Details:
✅ browser-status      HEALTHY   Chrome: not running, Edge: running
✅ disk-space          HEALTHY   Disk usage: 55.0% (106.79GB free on C:)
✅ memory-usage        HEALTHY   Memory: 63.9% used (11.47GB free of 31.80GB)
⚠️  cron-jobs           WARNING   4 healthy, 2 warning, 2 error (of 8 tasks)
✅ email-connectivity  HEALTHY   SMTP: reachable (1644ms), IMAP: reachable (55ms)
✅ key-files           HEALTHY   6 OK, 0 warning, 0 missing (of 6 files)
✅ dashboard           HEALTHY   Dashboard on port 3001: healthy
✅ gateway             HEALTHY   OpenClaw Gateway on port 18789: responding
✅ recipe-database     HEALTHY   7 recipes (7 valid, 0 invalid)
✅ system-processes    HEALTHY   Node: 4, Chrome: 0, Edge: 40, Python: 0
```

**Known Issues:**
- `Marvin Dinner Automation` task not found (expected - runs via different mechanism)
- `Marvin Facebook Monitor` task not found (expected - runs via different mechanism)
- `WSL-24x7-Monitor` showing last result 1 (may need investigation)
- `Kanban-AutoRefresh` showing last result 1 (may need investigation)

## Troubleshooting

### PowerShell Execution Policy
If PowerShell commands fail, check execution policy:
```powershell
Get-ExecutionPolicy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Missing nodemailer for Email
If email fails with module not found:
```bash
cd scripts
npm install nodemailer mailparser
```

### Log Directory Permissions
Ensure logs directory exists and is writable:
```bash
mkdir -p logs
```

## Files Created/Modified

**New Files:**
- `lib/health-monitor.js` - Core health monitoring module
- `scripts/system-health-check.js` - CLI tool
- `logs/health-YYYY-MM-DD.log` - Health check history
- `marvin-dash/data/health-status.json` - Dashboard health data

**Modified Files:**
- `marvin-dash/server.js` - Added health API endpoints and scheduled checks

## Maintenance

**To add a new health check:**
1. Add method to `HealthMonitor` class in `lib/health-monitor.js`
2. Add to `runAllChecks()` method
3. Update this documentation

**To modify thresholds:**
1. Edit `DEFAULT_CONFIG` in `lib/health-monitor.js`
2. Or pass custom config when creating `HealthMonitor` instance

**To schedule automatic checks:**
- Dashboard runs checks every 15 minutes automatically
- Or create Windows Task Scheduler task to run CLI tool
