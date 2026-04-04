# Marvin Email Monitor

Automated email checking system that monitors multiple email accounts every 15 minutes for important messages.

## Features

- **Multi-account support**: Monitors iCloud and Gmail accounts
- **Smart filtering**: Only notifies on important emails (not spam/promotions)
- **Priority detection**: Keywords like "urgent", "action required", "security alert"
- **Discord integration**: Sends notifications via Discord webhook
- **OpenClaw fallback**: Falls back to OpenClaw webhook if Discord not configured
- **Deduplication**: Won't notify for the same email twice
- **State tracking**: Tracks check history and notification log

## Files

| File | Description |
|------|-------------|
| `email-monitor.js` | Main monitoring script with IMAP logic |
| `email-notifier.js` | Discord/OpenClaw notification module |
| `email-config.js` | Configuration helper |
| `run-email-monitor.bat` | Windows batch wrapper with credentials |
| `setup-email-monitor.ps1` | PowerShell script to create scheduled task |
| `package.json` | Node.js dependencies |

## Usage

### Manual Run

```bash
cd C:\Users\Admin\.openclaw\workspace\scripts

# Check emails now
node email-monitor.js

# Send test notification
node email-monitor.js --test

# Show status
node email-monitor.js --status

# Initialize state file
node email-monitor.js --init

# Or use the batch wrapper (includes credentials)
run-email-monitor.bat
```

### Automated (Every 15 Minutes)

Run as Administrator:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\Admin\.openclaw\workspace\scripts\setup-email-monitor.ps1
```

This creates a Windows Scheduled Task that runs every 15 minutes.

## Email Accounts Monitored

1. **MarvinMartian9@icloud.com** (Primary iCloud)
2. **9marvinmartian@gmail.com** (Secondary Gmail)
3. **alex@1v1a.com** (Add if credentials available)

## Important Email Detection

### Priority Keywords
- `urgent`, `action required`, `asap`, `important`, `priority`
- `deadline`, `expires`, `payment due`, `bill due`
- `security alert`, `suspicious activity`, `verification`
- `appointment`, `meeting`, `scheduled`
- `delivery`, `shipped`, `tracking`, `order`

### Priority Senders
- alex@1v1a.com
- sferrazzaa96@gmail.com
- Apple/iCloud official emails
- Google official emails

### Excluded (Spam/Promotions)
- Contains "unsubscribe", "promotional", "marketing"
- From marketing/promo addresses

## Notification Methods

1. **Discord Webhook** (Primary)
   - Set `EMAIL_DISCORD_WEBHOOK` or `KANBAN_DISCORD_WEBHOOK` environment variable
   - Gets channel webhook URL from Discord Server Settings

2. **OpenClaw Webhook** (Fallback)
   - Sends to `http://localhost:18789/hooks/wake`
   - Displays notification via OpenClaw

3. **Log File** (Always)
   - All notifications logged to `marvin-dash/data/email-notifications.json`

## Data Files

| File | Location | Purpose |
|------|----------|---------|
| State | `marvin-dash/data/email-monitor-state.json` | Tracks UIDs, check history |
| Notifications | `marvin-dash/data/email-notifications.json` | Log of all notifications sent |
| Config | `marvin-dash/data/email-config.json` | Optional persistent config |

## State File Format

```json
{
  "lastCheck": "2026-02-07T16:00:00.000Z",
  "lastNotifiedUids": {
    "iCloud Primary": {
      "12345": 1707312000000
    },
    "Gmail Secondary": {}
  },
  "totalChecks": 100,
  "totalImportantFound": 5,
  "errors": []
}
```

## Security Notes

- Credentials are read from environment variables or secure storage
- App-specific passwords required for iCloud
- State file is stored locally, not synced
- No email content is stored permanently

## Troubleshooting

### Check logs
```bash
# View state
cat ..\marvin-dash\data\email-monitor-state.json

# View notification log
cat ..\marvin-dash\data\email-notifications.json
```

### Test notification
```bash
node email-monitor.js --test
```

### Check Task Scheduler
1. Open Task Scheduler (`taskschd.msc`)
2. Find "Marvin Email Monitor"
3. Check Last Run Result

### Common Issues

**"No password configured"**
- Set `ICLOUD_APP_PASSWORD` or `GMAIL_PASSWORD` environment variable
- Or run via `run-email-monitor.bat` which sets them

**"Connection refused"**
- Check internet connection
- Verify IMAP is enabled in email settings
- For Gmail: Enable "Less secure apps" or use App Password

**Discord notifications not working**
- Verify webhook URL is set correctly
- Check webhook URL in Discord channel settings

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ICLOUD_EMAIL` | iCloud email address |
| `ICLOUD_APP_PASSWORD` | iCloud app-specific password |
| `GMAIL_EMAIL` | Gmail address |
| `GMAIL_PASSWORD` | Gmail password |
| `EMAIL_DISCORD_WEBHOOK` | Discord webhook URL |
| `KANBAN_DISCORD_WEBHOOK` | Fallback Discord webhook |

### Setting Environment Variables (Windows)

```powershell
# User level (recommended)
[Environment]::SetEnvironmentVariable("ICLOUD_APP_PASSWORD", "your-password", "User")
[Environment]::SetEnvironmentVariable("GMAIL_PASSWORD", "your-password", "User")
[Environment]::SetEnvironmentVariable("EMAIL_DISCORD_WEBHOOK", "https://discord.com/api/webhooks/...", "User")

# Verify
$env:ICLOUD_APP_PASSWORD
```

## IMAP Settings

### iCloud
- Host: `imap.mail.me.com`
- Port: `993`
- TLS: Yes
- Password: App-specific password required

### Gmail
- Host: `imap.gmail.com`
- Port: `993`
- TLS: Yes
- Password: Regular password or App Password

## Credits

Part of the Marvin automation system.
