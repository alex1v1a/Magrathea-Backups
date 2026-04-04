# Email Sending Setup Guide

This environment now supports sending emails via iCloud SMTP.

## Quick Start

### 1. Get an iCloud App Password

1. Go to https://appleid.apple.com
2. Sign in with **MarvinMartian9@icloud.com**
3. Go to **"Sign-In and Security"** → **"App-Specific Passwords"**
4. Click **"Generate an app-specific password"**
5. Name it "OpenClaw Email" (or similar)
6. Copy the generated password (looks like: `abcd-efgh-ijkl-mnop`)

### 2. Set the App Password

**Option A: Environment Variable (Recommended)**

```cmd
set ICLOUD_APP_PASSWORD=your-app-password-here
```

To make it permanent, add it to your system environment variables.

**Option B: Config File**

Create a file at `.secrets/email-config.json`:

```json
{
  "host": "smtp.mail.me.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "MarvinMartian9@icloud.com",
    "pass": "your-app-password-here"
  },
  "from": "MarvinMartian9@icloud.com",
  "fromName": "Marvin"
}
```

### 3. Send a Test Email

```cmd
node send-email.js --to "alex@1v1a.com" --subject "Test" --body "Hello from Marvin!"
```

### 4. Send an HTML Report

```cmd
node send-report.js mortgage_report.html
```

Or with a specific recipient:

```cmd
node send-report.js mortgage_report.html alex@1v1a.com
```

## Available Commands

### Send Email

```cmd
# Plain text
node send-email.js --to "recipient@example.com" --subject "Subject" --body "Message text"

# HTML
node send-email.js --to "recipient@example.com" --subject "Subject" --body "<h1>HTML</h1>" --html

# From file
node send-email.js --to "recipient@example.com" --subject "Subject" --file message.txt
```

### Send Report

```cmd
# Send HTML report to default recipient (alex@1v1a.com)
node send-report.js mortgage_report.html

# Send to specific recipient
node send-report.js mortgage_report.html someone@example.com
```

## Files Created

| File | Purpose |
|------|---------|
| `send-email.js` | Core email sending script |
| `send-report.js` | Helper to send HTML reports |
| `send-email.bat` | Windows wrapper for send-email.js |
| `send-report.bat` | Windows wrapper for send-report.js |
| `.secrets/email-config.json` | Email configuration (created after setup) |

## Security Notes

- **Never commit** `.secrets/` to git
- App passwords are limited - they can only send email, not access your account
- You can revoke app passwords anytime at appleid.apple.com
- The `.secrets/` directory is in `.gitignore` by default

## Troubleshooting

### "No app password configured!"

You need to set the `ICLOUD_APP_PASSWORD` environment variable or create the config file.

### "Invalid login"

- Make sure you're using an **App-Specific Password**, not your regular iCloud password
- Verify the password is correct
- Check that the email address is MarvinMartian9@icloud.com

### "Connection refused"

- Check your internet connection
- iCloud SMTP requires port 587 with STARTTLS
- Some corporate firewalls block SMTP

## I can now send emails!

Once you've set up the app password, I can send emails for you:

```javascript
// Example: I'll use this to send you reports
const { sendEmail } = require('./send-email');

await sendEmail({
  to: 'alex@1v1a.com',
  subject: '🏠 Mortgage Report',
  body: htmlContent,
  html: true
});
```

Just provide the app password and I'll handle the rest!