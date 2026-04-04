# 🍽️ Dinner Plans Weekly Automation System

An automated meal planning and grocery shopping system that runs every Sunday to plan the week's dinners and build an HEB shopping cart.

## Features

- **Weekly Meal Planning** ($200 budget, 7 unique dinners, no repeats from last 100 meals)
- **HEB Cart Building** (110% buffer for healthy options)
- **Email Summaries** via iCloud SMTP (sent to alex@1v1a.com and sferrazzaa96@gmail.com)
- **Email Reply Monitoring** via iCloud IMAP (checks for replies 1pm-9pm)
- **Reply Parsing** (detects approvals, adjustments, add-to-cart requests)
- **Calendar Integration** (updates iCloud "Dinner" calendar daily)

## Email Integration ✉️

The system uses iCloud email for communication:

**SMTP (Sending):**
- Host: `smtp.mail.me.com:587` (STARTTLS)
- Sends dinner plans every Sunday at 9 AM

**IMAP (Receiving):**
- Host: `imap.mail.me.com:993` (SSL)
- Checks for replies hourly from 1pm-9pm daily
- Parses replies for keywords: approve, adjust, change, add, remove

See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed configuration.

## Schedule

| Task | Schedule | Script |
|------|----------|--------|
| Main Automation | Sundays 9:00 AM CST | `dinner-automation.js` |
| Email Reply Monitor | Hourly 1pm-9pm | `monitor-email.js` |
| Purchase Check | Daily 8:45pm | `monitor-purchase.js` |
| Cart Monitor | Daily 9:00pm | `monitor-cart.js` |
| Calendar Update | Daily 5:00pm | `update-calendar.js` |

## Directory Structure

```
dinner-automation/
├── scripts/
│   ├── dinner-automation.js    # Main automation script
│   ├── email-client.js         # SMTP/IMAP email client
│   ├── test-email.js           # Email testing utilities
│   ├── cron-config.js          # Cron configuration
│   ├── monitor-email.js        # Email reply monitor (IMAP)
│   ├── monitor-purchase.js     # Purchase confirmation check
│   ├── monitor-cart.js         # Cart status monitor
│   └── update-calendar.js      # Calendar updater
├── templates/
│   └── meals.json              # Meal templates database
├── data/
│   ├── meal-history.json       # 100-night meal history
│   ├── weekly-plan.json        # Current week's plan
│   ├── heb-cart-pending.json   # Pending cart details
│   ├── email-sent.json         # Last sent email details
│   ├── last-email-check.json   # Last IMAP check results
│   ├── pending-actions.json    # Actions from email replies
│   ├── email-monitor-state.json # Monitor state
│   ├── monitoring-config.json  # Monitoring schedules
│   ├── last-run.json           # Last run summary
│   └── *.log                   # Runtime logs
└── logs/
    └── *.log                   # Cron and monitor logs
```

## Installation

### 1. Install Dependencies

```bash
cd dinner-automation
npm install
```

### 2. Test Email Configuration

```bash
# Send test email
npm run send-test

# Check inbox
npm run check-inbox

# Run all tests
npm test
```

### 3. Setup Windows Task Scheduler

1. Open Task Scheduler (`Win + R` → `taskschd.msc`)
2. Action → Create Task
3. **General Tab:**
   - Name: `Dinner Plans Weekly Automation`
   - Run whether user is logged on or not: ✓ Check
4. **Triggers Tab** → New:
   - Begin the task: On a schedule
   - Settings: Weekly
   - Recur every: 1 weeks
   - On: Sunday
   - Start at: 9:00:00 AM
5. **Actions Tab** → New:
   - Action: Start a program
   - Program/script: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\Users\Admin\.openclaw\workspace\dinner-automation\scripts\dinner-automation.js`
   - Start in: `C:\Users\Admin\.openclaw\workspace\dinner-automation`
6. Click OK and enter credentials if prompted

For monitoring tasks, create additional tasks:

**Email Monitor (1pm-9pm):**
- Schedule: Daily, every 1 hour between 1:00 PM and 9:00 PM
- Program: `node`
- Arguments: `scripts/monitor-email.js`

**Purchase Check (8:45 PM):**
- Schedule: Daily at 8:45 PM
- Program: `node`
- Arguments: `scripts/monitor-purchase.js`

**Cart Monitor (9:00 PM):**
- Schedule: Daily at 9:00 PM
- Program: `node`
- Arguments: `scripts/monitor-cart.js`

**Calendar Update (5:00 PM):**
- Schedule: Daily at 5:00 PM
- Program: `node`
- Arguments: `scripts/update-calendar.js`

### Option 2: WSL Cron

```bash
# Open WSL
wsl

# Navigate to workspace
cd /mnt/c/Users/Admin/.openclaw/workspace/dinner-automation

# Install dependencies
npm install

# Display crontab entries
node scripts/cron-config.js

# Edit crontab
crontab -e

# Add the entries displayed above
```

## Configuration

### Meal Templates

Edit `templates/meals.json` to add/remove meals. Each meal should have:

```json
{
  "name": "Meal Name",
  "category": "cuisine type",
  "estimatedCost": 25,
  "prepTime": "30 min",
  "difficulty": "easy|medium|hard",
  "healthy": true,
  "ingredients": [
    { "name": "Ingredient", "amount": "1 lb", "hebSearch": "search term" }
  ]
}
```

### Email Settings

Email credentials are configured in `scripts/email-client.js`:
- User: `MarvinMartian9@icloud.com`
- Password: App-specific password (configured in file)
- Recipients: `alex@1v1a.com`, `sferrazzaa96@gmail.com`

### iCloud Calendar

Uses app-specific password configured in `scripts/update-calendar.js`.

## Usage

### NPM Scripts

```bash
npm test              # Run full email test suite
npm run send-test     # Send test email to recipients
npm run check-inbox   # Check inbox for replies
npm run weekly        # Run weekly automation
npm run monitor-email # Run email reply monitor
```

### Manual Run

```bash
# Run full automation
node scripts/dinner-automation.js

# Check for email replies
node scripts/monitor-email.js

# Send test email
node scripts/test-email.js --send
```

### View Logs

```bash
# Windows PowerShell
Get-Content logs\dinner-$(Get-Date -Format "yyyy-MM-dd").log -Wait

# WSL/Linux
tail -f logs/dinner-$(date +%Y-%m-%d).log
```

### Check Current Plan

```bash
# Windows PowerShell
Get-Content data\weekly-plan.json | ConvertFrom-Json

# WSL/Linux
cat data/weekly-plan.json | jq
```

## Current Status

### ✅ Implemented
- Meal plan generation with budget tracking
- 100-night history tracking
- Weekly rotation (no repeats)
- **iCloud SMTP email sending**
- **iCloud IMAP email receiving**
- **Reply parsing** (approve, adjust, add, remove keywords)
- Monitoring schedule configuration

### 🚧 Pending Integration
- HEB.com cart building (browser automation)
- Purchase confirmation email checking
- iCloud CalDAV calendar updates

## Reply Keywords

Recipients can reply to dinner plan emails with these keywords:

| Keyword | Action |
|---------|--------|
| approve, looks good, great, perfect | Approve the dinner plan |
| reject, cancel, stop, no | Reject the plan |
| adjust, change, swap, replace | Request adjustments |
| add, include, need, get | Add items to cart |
| remove, delete, don't need | Remove items from cart |
| too expensive, over budget | Budget concern |

## Testing

Run individual components:

```bash
# Test meal generation
node -e "const D = require('./scripts/dinner-automation'); new D().generateWeeklyMealPlan();"

# Test email client
node scripts/email-client.js --send-test
node scripts/email-client.js --check

# Test email monitor
node scripts/monitor-email.js

# Test calendar update
node scripts/update-calendar.js

# Full test suite
node scripts/test-email.js --full
```

## Future Enhancements

- [ ] Web interface for meal management
- [ ] Recipe scraping from websites
- [ ] Nutritional information tracking
- [ ] Cost optimization based on HEB sales
- [ ] Integration with HEB Go app
- [ ] Voice assistant integration
- [ ] Dietary restriction filtering
- [ ] Automatic reply action execution
