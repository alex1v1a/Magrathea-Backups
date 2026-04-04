# Marvin Automation Framework

> **AI-powered household automation for meal planning, grocery shopping, and marketplace management.**

---

## 🎯 What This Is

An intelligent automation system that handles repetitive household tasks:

- 🍽️ **Meal Planning** — Generates weekly dinner plans from 20+ family recipes
- 🛒 **Grocery Shopping** — Auto-adds ingredients to HEB cart with verification
- 📅 **Calendar Sync** — Pushes meals to Apple Calendar with full recipe details
- 📧 **Smart Email** — Sends confirmations, parses replies with NLP, SMS fallback
- 🚗 **Facebook Marketplace** — Manages F-150 and Thule listings, group sharing

**Status:** ✅ Production ready — running continuously since February 2026

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MARVIN AUTOMATION FRAMEWORK                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🍽️ DINNER AUTOMATION        🛒 HEB CART            📅 CALENDAR SYNC   │
│  ├─ Meal plan generation     ├─ Auto-add items      ├─ CalDAV sync      │
│  ├─ Email confirmations      ├─ Stock management    ├─ YouTube links    │
│  ├─ NLP reply parsing        └─ Weekly plan sync    └─ Recipe details   │
│  └─ SMS fallback                                                      │
│                                                                          │
│  📧 EMAIL SYSTEM v2          🚗 FACEBOOK             🔄 CRON JOBS       │
│  ├─ HTML templates           ├─ F-150 listing       ├─ 15+ schedules    │
│  ├─ IMAP/SMTP                ├─ Group sharing       ├─ Auto-retry       │
│  ├─ Twilio SMS               └─ Message monitor     └─ Health checks   │
│  └─ Status tracking                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Microsoft Edge (for HEB automation)
- Google Chrome (for Facebook automation)
- iCloud account with app-specific passwords

### Installation

```bash
# Clone repository
git clone <repo-url>
cd workspace

# Install dependencies
npm install playwright tsdav nodemailer twilio

# Set up credentials (see Configuration section)
mkdir .secrets
# Add your JSON credential files (see docs/API_REFERENCE.md)
```

### Launch Browsers

```bash
# Launch Edge for HEB automation
node dinner-automation/scripts/launch-shared-chrome.js

# Login to HEB manually in the Edge window
```

### Run Automation

```bash
# Send weekly dinner plan
node dinner-automation/scripts/dinner-email-system-v2.js --send-test

# Add items to HEB cart
node dinner-automation/scripts/heb-add-cart.js

# Sync to Apple Calendar
node dinner-automation/scripts/sync-dinner-to-icloud.js

# Check Facebook messages
node dinner-automation/scripts/facebook-marketplace-shared.js --messages
```

---

## 📂 Project Structure

```
workspace/
├── 📁 docs/                          # Documentation
│   ├── KNOWLEDGE_BASE.md            # Central index
│   ├── TROUBLESHOOTING.md           # Common issues
│   ├── API_REFERENCE.md             # API docs
│   └── ...
│
├── 📁 dinner-automation/            # Dinner automation
│   ├── 📁 scripts/                  # 150+ automation scripts
│   │   ├── dinner-email-system-v2.js
│   │   ├── heb-add-cart.js
│   │   ├── sync-dinner-to-icloud.js
│   │   └── facebook-marketplace-shared.js
│   └── 📁 data/                     # Data files
│       ├── recipe-database.json     # 20+ recipes
│       ├── weekly-plan.json         # Current plan
│       └── ...
│
├── 📁 lib/                          # Shared libraries
│   ├── automation-utils.js          # Core utilities
│   ├── error-handling.js            # Error classes
│   └── ...
│
├── 📁 .secrets/                     # Credentials (gitignored)
│   ├── icloud-smtp.json
│   ├── twilio.json
│   └── ...
│
├── 📄 MEMORY.md                     # Long-term memory
├── 📄 AGENTS.md                     # Agent guidelines
└── 📄 TOOLS.md                      # Tool configurations
```

---

## 🍽️ Dinner Automation

Complete meal planning with full integration.

### Weekly Flow

```
Saturday 9:00 AM    Generate meal plan
Saturday 9:05 AM    Send confirmation email
                    ↓
              ┌─────────────┐
              │ Wait for    │
              │ reply       │
              │ (6 hours)   │
              └──────┬──────┘
                     ↓
            ┌────────────────┐
            │ Parse reply    │
            │ with NLP       │
            └───────┬────────┘
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
 Calendar         HEB Cart        Email
 Sync            Update          Confirm
```

### Key Features

| Feature | Description |
|---------|-------------|
| 20+ Recipes | Family recipes with stories, wine pairings |
| Smart Email | HTML templates, Unsplash images, tracking |
| NLP Parser | Understands "swap Monday to...", "skip Friday" |
| SMS Fallback | Twilio integration after 6 hours |
| Calendar Sync | Full recipe details + YouTube cooking videos |
| HEB Cart | Auto-add with per-item verification |

### Commands

```bash
# Send dinner plan
node dinner-automation/scripts/dinner-email-system-v2.js --send-test

# Check replies
node dinner-automation/scripts/dinner-email-system-v2.js --check-reply

# Test NLP parser
node dinner-automation/scripts/dinner-email-system-v2.js --test-parser "Swap Monday to Chicken Alfredo"

# Sync calendar
node dinner-automation/scripts/sync-dinner-to-icloud.js
```

---

## 🛒 HEB Cart Automation

> **Browser:** Microsoft Edge (Port 9222)  
> **Success Rate:** 100% (42/42 items)  
> **Method:** Playwright + CDP with verification

### How It Works

1. **Launch Edge** with debug port 9222
2. **User logs in** to HEB once (persists)
3. **Playwright connects** via CDP to existing session
4. **Per-item verification** — cart count checked before/after
5. **Batch processing** — 5 items at a time with pauses

### Important Notes

- ✅ Use **branded product names** ("H-E-B Basmati Rice" not "basmati rice")
- ✅ Only works with Microsoft Edge (bypasses bot detection)
- ✅ Must use CDP connection (not new browser instance)
- ✅ Random delays between actions (anti-bot)

### Commands

```bash
# Launch Edge
node dinner-automation/scripts/launch-shared-chrome.js

# Add all items
node dinner-automation/scripts/heb-add-cart.js

# Add missing only (resume)
node dinner-automation/scripts/heb-add-missing.js

# Check status
node dinner-automation/scripts/heb-add-cart.js --status
```

---

## 📅 Calendar Sync

Synchronizes dinner plans to Apple Calendar via CalDAV.

### Synced Data

- 🍽️ Meal name and day
- 📖 Recipe story and origin
- 🛒 Full ingredients list
- ⏱️ Prep/cook/total times
- 🎥 YouTube cooking video links
- 🍷 Wine pairing suggestions

### Command

```bash
node dinner-automation/scripts/sync-dinner-to-icloud.js
```

---

## 🚗 Facebook Marketplace

Manages F-150 truck and Thule box listings.

### Active Listings

- 🚗 **F-150 Truck** — Main listing
- 📦 **Thule Box** — Roof cargo box

### Target Groups (3)

- HAYS COUNTY LIST & SELL
- Buda/Kyle Buy, Sell & Rent
- Ventas De Austin, Buda, Kyle

### Automation Schedule

| Job | Schedule |
|-----|----------|
| Message Monitor | Hourly 8am-9pm |
| Weekly Share | Fridays 6:00 PM |
| Daily Report | Daily 8:00 PM |

### Commands

```bash
# Check messages
node dinner-automation/scripts/facebook-marketplace-shared.js --messages

# Share F-150 (rotates groups)
node dinner-automation/scripts/facebook-marketplace-shared.js --share-f150
```

---

## 🔄 Cron Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Dinner Plan Generator | Sat 9:00 AM | Generate weekly meal plan |
| Dinner Email | Sat 9:05 AM | Send confirmation email |
| Email Reply Check | Every 5 min | Check for replies |
| YouTube Cache | Sun 2:00 AM | Refresh video links |
| Calendar Sync | Every 15 min | Sync to Apple Calendar |
| HEB Cart Sync | Every 30 min | Sync HEB cart status |
| FB Message Monitor | Hourly 8am-9pm | Check FB messages |
| F-150 Weekly Share | Fri 6:00 PM | Share to all groups |

---

## 🔐 Configuration

### Required Secrets (`.secrets/`)

| File | Contents |
|------|----------|
| `icloud-smtp.json` | SMTP credentials for email |
| `icloud-credentials.json` | CalDAV credentials |
| `twilio.json` | SMS API credentials |
| `unsplash.json` | Image API key |

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for schema details.

### Browser Setup

**Edge (HEB only):**
```bash
node dinner-automation/scripts/launch-shared-chrome.js
```

**Chrome (Facebook only):**
```bash
# Same script manages Chrome for Facebook
node dinner-automation/scripts/launch-shared-chrome.js
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md) | Central index of all systems |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Module and API documentation |
| [docs/AUTOMATION-ARCHITECTURE.md](docs/AUTOMATION-ARCHITECTURE.md) | System architecture |
| [docs/ANTI-BOT-PLAYBOOK.md](docs/ANTI-BOT-PLAYBOOK.md) | Bot evasion techniques |

---

## 🛠️ Development

### Running Tests

```bash
# Test pattern library
node patterns/test.js

# Test email system
node dinner-automation/scripts/dinner-email-system-v2.js --test-parser "test message"

# Check HEB status
node dinner-automation/scripts/heb-add-cart.js --status
```

### Adding New Recipes

Edit `dinner-automation/data/recipe-database.json`:

```json
{
  "recipes": {
    "Your Recipe Name": {
      "cuisine": "Cuisine Type",
      "origin": "Origin story",
      "story": "Historical context...",
      "prepTime": "15 min",
      "cookTime": "30 min",
      "difficulty": "Medium",
      "servings": 4,
      "ingredients": ["Item 1", "Item 2"],
      "instructions": ["Step 1", "Step 2"],
      "winePairing": "Wine suggestion"
    }
  }
}
```

---

## ⚠️ Troubleshooting

### HEB Bot Detection

- Use **Microsoft Edge** (not Chrome)
- Connect via CDP to existing logged-in session
- Use branded product names in search

### Email Not Sending

- Verify `.secrets/icloud-smtp.json` exists
- Use app-specific password (not account password)
- Check port 587 is not blocked

### Calendar Not Syncing

- Create "Dinner" calendar in Apple Calendar first
- Verify CalDAV credentials
- Check firewall for CalDAV port

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more.

---

## 📈 Current Status

| System | Status | Last Update |
|--------|--------|-------------|
| Dinner Email v2 | ✅ Operational | Feb 15, 2026 |
| HEB Cart | ✅ 100% success | Feb 15, 2026 |
| Calendar Sync | ✅ Operational | Feb 11, 2026 |
| Facebook Auto | ✅ Operational | Feb 12, 2026 |
| YouTube Cache | ✅ Operational | Feb 11, 2026 |

---

## 📝 License

Private — For Alexander's household use only.

---

## 🤖 About

Maintained by **Marvin** (AI Agent).  
Built with ❤️ for the 1v1a family.

*Last Updated: February 15, 2026*
