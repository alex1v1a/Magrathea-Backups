# Dinner Email Delivery Fix

## Problem
Emails were being "sent" successfully (SMTP accepted them and returned message IDs) but were not being received by recipients (alex@1v1a.com and sferrazzaa96@gmail.com). This is a known issue with iCloud SMTP where messages can be silently dropped or filtered as spam.

## Root Causes
1. **iCloud SMTP filtering**: iCloud has aggressive outgoing spam filters that can drop emails even after SMTP acceptance
2. **Emoji in subject/sender**: The original emails had emoji in both the subject line (🍽️) and sender name (🤖), which can trigger spam filters
3. **Gmail/iCloud filtering**: Gmail and other providers may filter emails from iCloud SMTP relays
4. **No delivery verification**: SMTP "success" doesn't guarantee inbox delivery

## Solution Implemented

### 1. Improved Email Deliverability (email-client.js)
- Removed emoji from sender name (now "Marvin Dinner Bot" instead of "Marvin 🤖 Dinner Bot")
- Removed emoji from subject line (now "Weekly Dinner Plan" instead of "🍽️ Weekly Dinner Plan")
- Added proper email headers (X-Priority, X-Mailer, Precedence)
- Added SMTP connection pooling for better reliability
- Added rate limiting to avoid triggering spam filters
- Added explicit envelope configuration

### 2. Discord Webhook Fallback (discord-notifier.js)
- Created Discord webhook notifier as a reliable backup notification method
- Sends rich embeds with meal plan details
- Provides redundancy when email fails
- Can be used standalone or alongside email

### 3. Hybrid Notification System (email-client.js)
- New `sendHybridNotification()` method sends both email AND Discord
- If email fails, Discord still delivers the message
- Logs both results for monitoring
- No single point of failure

### 4. Updated Automation (dinner-automation.js)
- Now uses `sendHybridNotification()` by default
- Logs both email and Discord results
- Saves notification status for each channel

## Setup Instructions

### Option 1: Set Up Discord Webhook (Recommended)

1. Open Discord and go to the server where you want notifications
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Give it a name (e.g., "Dinner Plans")
5. Select the channel for notifications
6. Copy the Webhook URL
7. Set the environment variable:
   ```powershell
   # Windows PowerShell
   [Environment]::SetEnvironmentVariable("DINNER_DISCORD_WEBHOOK", "https://discord.com/api/webhooks/...", "User")
   ```
   Or add to your `.env` file if using dotenv.

### Option 2: Fix Email Deliverability Only

The updated email client should have better deliverability:
- Check spam/junk folders
- Add `MarvinMartian9@icloud.com` to contacts
- Check Gmail "All Mail" folder
- Look for messages filtered by Gmail's categories

## Testing

### Test Discord Webhook
```bash
cd dinner-automation
node scripts/discord-notifier.js --test
```

### Test Email Only
```bash
cd dinner-automation
node scripts/email-client.js --send-test
```

### Test Hybrid (Email + Discord)
```bash
cd dinner-automation
node scripts/test-email.js --full
```

## Monitoring

Check the notification status in:
- `dinner-automation/data/email-sent.json` - Shows both email and Discord status
- `dinner-automation/logs/dinner-YYYY-MM-DD.log` - Detailed logs

## Files Changed

| File | Changes |
|------|---------|
| `scripts/email-client.js` | Added hybrid notification, improved deliverability, removed emoji |
| `scripts/discord-notifier.js` | NEW - Discord webhook notifier |
| `scripts/dinner-automation.js` | Updated to use hybrid notification |

## Expected Behavior

After the fix:
1. Weekly dinner plans are sent via email (with better deliverability)
2. Same dinner plan is sent to Discord as backup
3. Recipients get at least one notification (email or Discord)
4. Logs show status of both channels
5. If email is filtered to spam, Discord still delivers

## Troubleshooting

### Discord not sending
- Check that `DINNER_DISCORD_WEBHOOK` environment variable is set
- Verify webhook URL is correct (starts with `https://discord.com/api/webhooks/`)
- Check Discord channel permissions

### Email still not received
- This is expected behavior with iCloud SMTP
- Discord backup ensures you still get notified
- Consider switching to a transactional email service (SendGrid, Mailgun) for better deliverability

### Both channels fail
- Check network connectivity
- Verify iCloud credentials are valid
- Check Discord webhook is valid
- Review logs in `dinner-automation/logs/`
