# Secure Credential Management

This document describes the secure credential management system for Dinner Automation and other workspace tools.

## Overview

All passwords, API keys, and sensitive credentials are now managed through **environment variables** instead of being stored in plaintext files. This provides:

- ✅ No passwords in code repositories
- ✅ Easy credential rotation without code changes
- ✅ Per-environment configuration (dev/staging/prod)
- ✅ Compatible with secret management systems

## Quick Start

### 1. Create Your Environment File

```bash
cp .env.example .env
```

### 2. Edit `.env` with Your Credentials

```bash
# Required for email and calendar functionality
ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Optional: For HEB automation
HEB_PASSWORD=your_password

# Optional: For Discord notifications
DINNER_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

### 3. Verify Setup

```bash
node dinner-automation/scripts/credentials.js --check
```

## Credential Reference

### Required Credentials

| Variable | Used By | Description |
|----------|---------|-------------|
| `ICLOUD_APP_PASSWORD` | Email, Calendar | iCloud app-specific password |

### Optional Credentials

| Variable | Used By | Description |
|----------|---------|-------------|
| `HEB_PASSWORD` | HEB Automation | HEB.com login password |
| `DINNER_DISCORD_WEBHOOK` | Notifications | Discord webhook URL |
| `HOMEASSISTANT_TOKEN` | HA Integration | Home Assistant access token |
| `WYZE_API_KEY` | Cameras | Wyze API key |
| `GOVEE_API_KEY` | Smart Lights | Govee API key |

## Getting Your Credentials

### iCloud App-Specific Password

1. Go to [Apple ID Settings](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to **Sign-In & Security** → **App-Specific Passwords**
4. Click **Generate an app-specific password**
5. Name it "Dinner Automation" and copy the generated password
6. Set it as `ICLOUD_APP_PASSWORD` in your `.env` file

### HEB Password

Use your existing HEB.com account password. Set it as `HEB_PASSWORD` in your `.env` file.

### Discord Webhook

1. In Discord, go to Server Settings → Integrations → Webhooks
2. Click **New Webhook**
3. Name it "Dinner Bot" and select the channel
4. Copy the webhook URL
5. Set it as `DINNER_DISCORD_WEBHOOK` in your `.env` file

## Using in Scripts

```javascript
const { getCredential, getEmailConfig } = require('./credentials');

// Get a single credential
const password = getCredential('ICLOUD_APP_PASSWORD');

// Get email configuration (SMTP + IMAP)
const emailConfig = getEmailConfig();

// Get CalDAV configuration
const calDAVConfig = getCalDAVConfig();

// Get HEB credentials
const hebCreds = getHEBCredentials();
```

## Loading .env Files Automatically

If you have `dotenv` installed, environment variables will be loaded automatically:

```javascript
require('dotenv').config();
```

Or in PowerShell:
```powershell
# Load .env file into current session
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
```

## Security Best Practices

1. **Never commit `.env` files** — They're in `.gitignore` for a reason
2. **Rotate passwords regularly** — Change them every 3-6 months
3. **Use app-specific passwords** — Not your main account password
4. **Limit access** — Only share credentials with necessary systems
5. **Use secrets managers** — For production, use proper secret management

## Migration from Old System

If you previously had passwords stored in `TOOLS.md` or scripts:

1. ✅ **Passwords removed** from all source files
2. ✅ **Scripts updated** to use `credentials.js`
3. ✅ **Template created** at `.env.example`
4. ⬜ **Your action:** Create `.env` file with your credentials

## Troubleshooting

### "ICLOUD_APP_PASSWORD is not set"

```bash
# Check if it's set
echo $ICLOUD_APP_PASSWORD  # macOS/Linux
$env:ICLOUD_APP_PASSWORD    # PowerShell

# Set it temporarily
export ICLOUD_APP_PASSWORD=your_password  # macOS/Linux
$env:ICLOUD_APP_PASSWORD="your_password"   # PowerShell

# Or add to .env file
echo "ICLOUD_APP_PASSWORD=your_password" >> .env
```

### Credential Check Fails

```bash
node dinner-automation/scripts/credentials.js --check
```

This will show which credentials are available and which are missing.

### Scripts Can't Find Credentials

Make sure you're running scripts from the project root or dinner-automation directory:

```bash
# Correct
cd dinner-automation && node scripts/email-client.js --send-test

# Also correct
node dinner-automation/scripts/email-client.js --send-test
```

## Advanced: macOS Keychain Integration

For macOS users, you can store credentials in iCloud Keychain and retrieve them:

```bash
# Store in keychain
security add-generic-password -s "dinner-automation" \
    -a "icloud-app-password" -w "your_password"

# Retrieve in script
export ICLOUD_APP_PASSWORD=$(security find-generic-password \
    -s "dinner-automation" -a "icloud-app-password" -w)
```

## Support

For issues with credentials:
1. Run `node credentials.js --check` to diagnose
2. Verify your `.env` file exists and is readable
3. Check that credentials are correct (try logging in manually)
4. Review the specific service's documentation for proper setup
