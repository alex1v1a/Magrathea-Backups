# OpenClaw CLI Reference - Bot Team Quick Guide

> Source: https://docs.openclaw.ai/cli/
> For first-line troubleshooting before seeking external support

## Critical Commands for Bot Mesh

### System Health
```bash
openclaw doctor              # Diagnose all issues
openclaw health              # Quick health check
openclaw status              # Session status
```

### Gateway Management
```bash
openclaw gateway status      # Check if gateway is running
openclaw gateway restart     # Restart gateway service
openclaw gateway probe       # Test connectivity
openclaw logs --follow       # Watch live logs
```

### Session & Node Monitoring
```bash
openclaw sessions list       # List active sessions
openclaw nodes status        # Check node status
openclaw system heartbeat last   # Last heartbeat
```

### Cron (for Heartbeat Tasks)
```bash
openclaw cron list           # List all cron jobs
openclaw cron status         # Check cron status
openclaw cron add            # Add new scheduled task
```

### Recovery
```bash
openclaw reset               # Reset configuration
openclaw configure           # Re-run configuration
```

## Team SSH Access
- **Marvin**: 100.126.151.25
- **Bistromath**: 100.97.122.5
- **Deep Thought**: 100.91.198.42
- **Trillian**: 100.122.231.21

## Emergency Protocol
1. Check `openclaw doctor` first
2. Review `openclaw logs --follow`
3. Test SSH mesh connectivity
4. Restart services if needed: `openclaw gateway restart`

_Last updated: 2026-02-25 by Marvin_
