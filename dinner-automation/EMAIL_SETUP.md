# Dinner Plans Email Automation

Email integration for the Dinner Plans system using iCloud SMTP and IMAP.

## Configuration

### iCloud Email Settings

**SMTP (Sending):**
- Host: `smtp.mail.me.com`
- Port: `587` (STARTTLS)
- User: `MarvinMartian9@icloud.com`
- Password: App-specific password (configured in email-client.js)

**IMAP (Receiving):**
- Host: `imap.mail.me.com`
- Port: `993` (SSL)
- User: `MarvinMartian9@icloud.com`
- Password: Same app-specific password

### Recipients
- alex@1v1a.com
- sferrazzaa96@gmail.com

## Files

| File | Description |
|------|-------------|
| `scripts/email-client.js` | Core email client with SMTP/IMAP functionality |
| `scripts/dinner-automation.js` | Main automation script (uses SMTP to send plans) |
| `scripts/monitor-email.js` | Email reply monitor (uses IMAP to check replies) |
| `scripts/test-email.js` | Test suite for email functionality |

## Usage

### Send Test Email
```bash
cd dinner-automation
node scripts/test-email.js --send
```

### Check Inbox for Replies
```bash
cd dinner-automation
node scripts/test-email.js --check
```

### Run All Tests
```bash
cd dinner-automation
node scripts/test-email.js --full
```

### Run Full Weekly Automation
```bash
cd dinner-automation
node scripts/dinner-automation.js
```

### Run Email Monitor (1pm-9pm check)
```bash
cd dinner-automation
node scripts/monitor-email.js
```

## Reply Keywords

The system parses email replies for these actions:

| Keyword | Action |
|---------|--------|
| approve, looks good, great, perfect | Approve the dinner plan |
| reject, cancel, stop, no | Reject the plan |
| adjust, change, swap, replace | Request adjustments |
| add, include, need, get | Add items to cart |
| remove, delete, don't need | Remove items from cart |
| too expensive, over budget | Budget concern |

## Monitoring Schedule

The email monitor runs hourly from 1pm-9pm daily to check for replies:
- Checks INBOX for unread messages from recipients
- Parses replies for actions
- Marks processed messages as read
- Saves pending actions to `data/pending-actions.json`

## NPM Scripts

```bash
npm run test        # Run full test suite
npm run send-test   # Send test email
npm run check-inbox # Check for replies
npm run weekly      # Run weekly automation
npm run monitor-email # Run email monitor
```

## Data Files

| File | Description |
|------|-------------|
| `data/weekly-plan.json` | Current week's meal plan |
| `data/email-sent.json` | Last sent email details |
| `data/last-email-check.json` | Last IMAP check results |
| `data/pending-actions.json` | Actions from replies waiting to be processed |
| `data/email-monitor-state.json` | Monitor state and processed replies |

## Troubleshooting

### SMTP Connection Fails
- Verify app-specific password is correct
- Check iCloud account security settings
- Ensure 2FA is enabled (required for app-specific passwords)

### IMAP Connection Fails
- Verify same app-specific password as SMTP
- Check if IMAP is enabled in iCloud settings
- Ensure "Less Secure Apps" is not blocking (not applicable to iCloud)

### No Replies Found
- Verify email was sent to correct addresses
- Check if replies are in INBOX (not junk/spam)
- Ensure sender addresses match configured recipients
