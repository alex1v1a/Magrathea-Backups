# iCloud CalDAV Calendar Integration

This module syncs dinner plans from the weekly meal plan to your iCloud "Dinner" calendar.

## Features

- ✅ Creates daily dinner events at **5:00 PM** (1 hour duration)
- ✅ Includes full recipe description with ingredients list
- ✅ Sets reminder 1 hour before (4:00 PM)
- ✅ Syncs weekly meal plans (7 dinners)
- ✅ Updates existing events if meal plans change
- ✅ Tracks sync state to avoid duplicates
- ✅ Uses iCloud app-specific password for security

## Prerequisites

Install dependencies:
```bash
cd dinner-automation
npm install
```

Required packages:
- `tsdav` - Modern CalDAV client
- `uuid` - Generate unique event IDs
- `date-fns` - Date formatting utilities

## Configuration

Credentials are pre-configured in `scripts/update-calendar.js`:

```javascript
username: 'MarvinMartian9@icloud.com'
password: 'jgdw-epfw-mspb-nihn'  // App-specific password
server: 'https://caldav.icloud.com'
```

The app-specific password is from TOOLS.md and has been generated for CalDAV access.

## Usage

### Sync Today's Dinner Only
```bash
node scripts/update-calendar.js
# or
npm run calendar:today
```

### Sync Entire Week (7 Dinners)
```bash
node scripts/update-calendar.js --week
# or
npm run calendar:week
```

### Force Update (Even if Events Exist)
```bash
node scripts/update-calendar.js --week --force
# or
npm run calendar:force
```

### Clear All Dinner Events
```bash
node scripts/update-calendar.js --clear
# or
npm run calendar:clear
```

## Event Format

Each calendar event includes:

**Title:** `🍽️ {Dinner Name}`

**Time:** 5:00 PM - 6:00 PM (America/Chicago)

**Description:**
```
{CATEGORY} | Prep: {prepTime} | Difficulty: {difficulty}

INGREDIENTS:
• {ingredient 1} ({amount})
• {ingredient 2} ({amount})
...

Estimated Cost: ${cost}
```

**Reminder:** 1 hour before (4:00 PM)

## Data Files

| File | Purpose |
|------|---------|
| `data/weekly-plan.json` | Source meal plan (7 dinners) |
| `data/calendar-state.json` | Tracks synced event IDs |
| `logs/calendar-sync.log` | Sync operation logs |

## State Management

The system maintains state in `data/calendar-state.json`:

```json
{
  "events": {
    "2026-02-05": {
      "uid": "event-uuid",
      "mealName": "Chicken Tikka Masala",
      "updatedAt": "2026-02-05T12:00:00Z"
    }
  },
  "lastSync": "2026-02-05T12:00:00Z",
  "weekOf": "2026-02-02"
}
```

This allows:
- Detecting if an event already exists
- Updating existing events when meals change
- Avoiding duplicate entries

## Cron Setup

Add to your crontab for automatic sync:

```bash
# Sync today's dinner every day at 9 AM
0 9 * * * cd /path/to/dinner-automation && node scripts/update-calendar.js >> logs/calendar-cron.log 2>&1

# Sync entire week every Sunday at 10 AM (after meal plan generation)
0 10 * * 0 cd /path/to/dinner-automation && node scripts/update-calendar.js --week >> logs/calendar-cron.log 2>&1
```

On Windows Task Scheduler:
- Create task "Dinner Calendar Sync"
- Trigger: Daily at 9:00 AM
- Action: `node.exe scripts/update-calendar.js`
- Working directory: `C:\path\to\dinner-automation`

## API Usage

You can also use the CalendarSync class programmatically:

```javascript
const CalendarSync = require('./scripts/update-calendar');

const sync = new CalendarSync();

// Initialize and sync
await sync.initialize();

// Sync specific day
await sync.syncDay(mealObject, date);

// Sync entire week
await sync.syncWeek();

// Sync today only
await sync.syncToday();
```

## Troubleshooting

### "Failed to initialize CalDAV"
- Check iCloud credentials in TOOLS.md
- Verify app-specific password is valid
- Ensure 2FA is enabled on iCloud account

### "No meal planned for today"
- Run `npm run weekly` to generate weekly plan first
- Check `data/weekly-plan.json` exists

### Events not appearing
- Check `logs/calendar-sync.log` for errors
- Verify calendar created in Apple Calendar app
- Look for "Dinner" calendar in iCloud

### Duplicate events
- Run with `--force` to update existing events
- Or delete and recreate with `--clear` then `--week`

## Security Notes

- App-specific password is stored in the script (local file)
- No credentials are logged or transmitted to third parties
- All communication is HTTPS to Apple's servers
- Password has limited scope (calendar access only)
