# Knowledge Base

> **Central index of all systems and documentation for the Marvin Automation Framework**

---

## 🗺️ Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | You are here — central navigation | Everyone |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions | Operators |
| [API_REFERENCE.md](./API_REFERENCE.md) | Module and API documentation | Developers |
| [AUTOMATION-ARCHITECTURE.md](./AUTOMATION-ARCHITECTURE.md) | System architecture overview | Architects |
| [ANTI-BOT-PLAYBOOK.md](./ANTI-BOT-PLAYBOOK.md) | Bot detection evasion techniques | Developers |
| [SUB-AGENT-REASONING-PATTERNS.md](./SUB-AGENT-REASONING-PATTERNS.md) | Multi-agent task patterns | AI/Automation |

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MARVIN AUTOMATION FRAMEWORK                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   🍽️ DINNER AUTOMATION        🛒 HEB CART            📅 CALENDAR SYNC   │
│   ├─ Meal plan generation     ├─ Auto-add items      ├─ CalDAV sync      │
│   ├─ Email confirmations      ├─ Stock management    ├─ YouTube links    │
│   ├─ NLP reply parsing        └─ Weekly plan sync    └─ Recipe details   │
│   └─ SMS fallback                                                      │
│                                                                          │
│   📧 EMAIL SYSTEM v2          🚗 FACEBOOK             🔄 CRON JOBS       │
│   ├─ HTML templates           ├─ F-150 listing       ├─ 15+ schedules    │
│   ├─ IMAP/SMTP                ├─ Group sharing       ├─ Auto-retry       │
│   ├─ Twilio SMS               └─ Message monitor     └─ Health checks   │
│   └─ Status tracking                                                     │
│                                                                          │
│   🔧 SHARED LIBRARIES                                                    │
│   ├─ automation-utils.js    ├─ error-handling.js                         │
│   ├─ browser-helpers.js     ├─ retry-manager.js                          │
│   └─ logger.js              └─ config-validator.js                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

```
workspace/
├── 📁 docs/                          # Documentation (you are here)
│   ├── KNOWLEDGE_BASE.md            # Central index
│   ├── TROUBLESHOOTING.md           # Issues & fixes
│   ├── API_REFERENCE.md             # API docs
│   ├── AUTOMATION-ARCHITECTURE.md   # Architecture
│   ├── ANTI-BOT-PLAYBOOK.md         # Bot evasion
│   └── SUB-AGENT-REASONING-PATTERNS.md  # Multi-agent patterns
│
├── 📁 dinner-automation/            # Dinner automation system
│   ├── 📁 scripts/                  # 150+ automation scripts
│   │   ├── dinner-email-system-v2.js
│   │   ├── sync-dinner-to-icloud.js
│   │   ├── heb-add-cart.js
│   │   ├── facebook-marketplace-shared.js
│   │   └── launch-shared-chrome.js
│   └── 📁 data/                     # Data files
│       ├── recipe-database.json     # 20+ family recipes
│       ├── weekly-plan.json         # Current meal plan
│       ├── youtube-cache.json       # Cooking video links
│       └── calendar-events.json     # Calendar data
│
├── 📁 lib/                          # Shared libraries
│   ├── automation-utils.js          # Core utilities
│   ├── error-handling.js            # Error classes
│   ├── browser-helpers.js           # Browser tools
│   └── retry-manager.js             # Retry logic
│
├── 📁 .secrets/                     # Credentials (gitignored)
│   ├── icloud-smtp.json
│   ├── icloud-credentials.json
│   ├── twilio.json
│   └── unsplash.json
│
├── 📄 MEMORY.md                     # Long-term memory
├── 📄 AGENTS.md                     # Agent guidelines
├── 📄 TOOLS.md                      # Tool configurations
└── 📄 USER.md                       # User profile
```

---

## 🍽️ Dinner Automation (Full Flow)

Complete automated meal planning with email confirmation, calendar sync, and grocery cart integration.

### Weekly Schedule

```
Saturday 9:00 AM ─────────► Generate Weekly Meal Plan
       ↓
Saturday 9:05 AM ─────────► Send Email Confirmation
       ↓
   ┌───────────────────────┐
   │  Wait for Reply       │
   │  (Max 6 hours)        │
   └───────────┬───────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
   Reply Received   No Reply
        ↓             ↓
   Parse NLP       Send SMS
        ↓         (Twilio)
   Apply Changes      ↓
        ↓         SMS Reply?
        └────────┬─────┘
                 ↓
        ┌────────────────┐
        │ Status: CONFIRMED
        └───────┬────────┘
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
 Calendar    HEB Cart    Email
 Sync        Update      Confirm
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Recipe Database | `data/recipe-database.json` | 20+ recipes with stories, tips |
| Weekly Plan | `data/weekly-plan.json` | Current week's meals |
| Email System | `scripts/dinner-email-system-v2.js` | Send, track, parse replies |
| Calendar Sync | `scripts/sync-dinner-to-icloud.js` | CalDAV sync with details |
| HEB Cart | `scripts/heb-add-cart.js` | Auto-add to HEB cart |
| YouTube Cache | `scripts/build-youtube-cache.js` | Cooking video links |

### Quick Commands

```bash
# Send dinner plan email
node dinner-automation/scripts/dinner-email-system-v2.js --send-test

# Check for replies
node dinner-automation/scripts/dinner-email-system-v2.js --check-reply

# View status
node dinner-automation/scripts/dinner-email-system-v2.js --status

# Sync to calendar
node dinner-automation/scripts/sync-dinner-to-icloud.js

# Add to HEB cart
node dinner-automation/scripts/heb-add-cart.js
```

---

## 🛒 HEB Cart Automation

> **Browser:** Microsoft Edge (Port 9222)  
> **Method:** Playwright + CDP with per-item verification  
> **Status:** ✅ 42/42 items (100% success rate)

### How It Works

1. **Launch Edge** with debug port 9222
2. **User logs in** to HEB once
3. **Playwright connects** via CDP to existing session
4. **Per-item verification** — cart count checked before/after each add
5. **Batch processing** — 5 items at a time with 10-15s pauses

### Critical Requirements

| Requirement | Why |
|-------------|-----|
| Microsoft Edge | Bypasses HEB bot detection |
| CDP Connection | Uses existing logged-in session |
| Branded Product Names | Generic terms timeout; use "H-E-B Basmati Rice" not "basmati rice" |
| Per-item Verification | Ensures each item actually added |
| Random Delays | Avoids bot detection patterns |

### Commands

```bash
# 1. Launch Edge (run once, keeps running)
node dinner-automation/scripts/launch-shared-chrome.js

# 2. Login to HEB manually in the Edge window

# 3. Add all items from meal plan
node dinner-automation/scripts/heb-add-cart.js

# 4. Add only missing items (resume)
node dinner-automation/scripts/heb-add-missing.js

# 5. Check cart status
node dinner-automation/scripts/heb-add-cart.js --status
```

### Stock Management

Two exclusion lists prevent buying items already stocked:

```bash
# Weekly exclusions (temporary - resets Saturday)
node dinner-automation/scripts/stock-manager.js --weekly-add "Olive oil" "Just bought"

# Long-term stock (permanent - pantry staples)
node dinner-automation/scripts/stock-manager.js --stock-add "Soy sauce" condiments_and_sauces

# View lists
node dinner-automation/scripts/stock-manager.js --list
```

---

## 📧 Email System v2

Enterprise-grade email system with NLP parsing, tracking, and SMS fallback.

### Features

| Feature | Description |
|---------|-------------|
| HTML Templates | Modern, responsive emails with gradient headers |
| Status Tracking | `sent → opened → replied → confirmed` |
| NLP Reply Parser | Smart pattern matching (not just keywords) |
| SMS Fallback | Twilio integration after 6 hours |
| Meal Images | Unsplash API for beautiful thumbnails |
| Calendar Integration | YouTube cooking videos linked |

### NLP Parser Examples

| User Says | Parsed Action |
|-----------|---------------|
| "Looks good!" / "Perfect" | `confirm` |
| "Swap Monday to Chicken Alfredo" | `swap: Monday → Chicken Alfredo` |
| "Instead of tacos, do burgers" | `swap: tacos → burgers` |
| "Remove Wednesday" / "Skip Friday" | `remove: Wednesday` |
| "Add Sunday: Spaghetti Carbonara" | `add: Sunday → Spaghetti` |

### Configuration Files

```bash
# SMTP (existing)
.secrets/icloud-smtp.json

# Twilio for SMS
.secrets/twilio.json
{
  "accountSid": "AC...",
  "authToken": "...",
  "fromNumber": "+1..."
}

# Unsplash for images
.secrets/unsplash.json
{
  "accessKey": "..."
}
```

---

## 📅 Calendar Sync

Synchronizes dinner plans to Apple Calendar via CalDAV with rich recipe details.

### What Gets Synced

- 🍽️ **Meal name** and day
- 📖 **Recipe story** and origin
- 🛒 **Ingredients list**
- ⏱️ **Prep/cook times**
- 🎥 **YouTube cooking videos**
- 🍷 **Wine pairings**

### Calendar Event Format

```
🍽️ Pan-Seared Cod with Lemon Butter

🌍 Cuisine: Mediterranean / Italian
📍 Origin: Coastal Italy and Greece

📖 The Story:
This classic preparation has been enjoyed along the 
Mediterranean coast for centuries...

⏱️ Timing:
   Prep: 10 min
   Cook: 10 min
   Total: 20 min
   Difficulty: Easy
   Serves: 4

🛒 Ingredients:
   • 1.5 lbs cod fillets
   • 4 tbsp unsalted butter
   ...

🎥 Cooking Video:
https://youtube.com/watch?v=...

🍷 Wine Pairing: Sauvignon Blanc
```

---

## 🚗 Facebook Marketplace Automation

> **Browser:** Google Chrome (Port 18800 or shared on 9222)  
> **Account:** alex@xspqr.com  
> **Reserved exclusively for Facebook** — NO dinner automation

### Active Listings

- 🚗 **F-150 Truck** — Main listing
- 📦 **Thule Box** — Roof cargo box

### Target Groups (3 Active)

| Group | Status |
|-------|--------|
| HAYS COUNTY LIST & SELL | ✅ Member |
| Buda/Kyle Buy, Sell & Rent | ✅ Member |
| Ventas De Austin, Buda, Kyle | ✅ Member |

### Automation Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Message Monitor | Hourly 8am-9pm | Check buyer messages |
| Weekly Share | Fridays 6:00 PM | Share F-150 + Thule to all groups |
| Daily Report | Daily 8:00 PM | Outreach summary |
| Group Discovery | Wednesdays 7:00 PM | Find new groups (80mi radius) |

### Commands

```bash
# Launch shared Chrome (Facebook + HEB)
node dinner-automation/scripts/launch-shared-chrome.js

# Check messages
node dinner-automation/scripts/facebook-marketplace-shared.js --messages

# Share F-150 (rotates through groups)
node dinner-automation/scripts/facebook-marketplace-shared.js --share-f150
```

---

## 🔄 Cron Schedule

All scheduled automation jobs:

| Job | Schedule | Purpose | Script |
|-----|----------|---------|--------|
| Dinner Plan Generator | Sat 9:00 AM | Generate weekly meal plan | `rebuild-meal-plan.js` |
| Dinner Email | Sat 9:05 AM | Send confirmation email | `dinner-email-system-v2.js` |
| Email Reply Check | Every 5 min | Check for replies | `dinner-email-system-v2.js` |
| YouTube Cache | Sun 2:00 AM | Refresh video links | `build-youtube-cache.js` |
| Calendar Sync | Every 15 min | Sync to Apple Calendar | `sync-dinner-to-icloud.js` |
| HEB Cart Sync | Every 30 min | Sync HEB cart status | `heb-continuous-sync.js` |
| FB Message Monitor | Hourly 8am-9pm | Check FB messages | `facebook-marketplace-shared.js` |
| F-150 Weekly Share | Fri 6:00 PM | Share to all groups | `facebook-marketplace-shared.js` |
| FB Daily Report | Daily 8:00 PM | Outreach summary | `fb-daily-report.js` |
| Group Discovery | Wed 7:00 PM | Find new groups | `fb-group-discovery.js` |

---

## 🔐 Secrets & Configuration

All credentials stored in `.secrets/` (gitignored):

| File | Contents | Used By |
|------|----------|---------|
| `icloud-smtp.json` | SMTP credentials | Email system |
| `icloud-credentials.json` | CalDAV credentials | Calendar sync |
| `twilio.json` | SMS API keys | Email fallback |
| `unsplash.json` | Image API key | Email templates |
| `heb-credentials.json` | HEB login (if needed) | HEB automation |

---

## 🚀 Getting Started (New User Guide)

### Step 1: Understand the Systems

1. Read this file (KNOWLEDGE_BASE.md) — you're doing great!
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
3. Check [API_REFERENCE.md](./API_REFERENCE.md) for module details

### Step 2: Set Up Credentials

```bash
# Create .secrets directory
mkdir .secrets

# Add your credentials (JSON format)
echo '{"username":"...","password":"..."}' > .secrets/icloud-smtp.json
```

### Step 3: Test Core Systems

```bash
# Test email
node dinner-automation/scripts/dinner-email-system-v2.js --send-test

# Test calendar sync
node dinner-automation/scripts/sync-dinner-to-icloud.js

# Test HEB (after launching Edge)
node dinner-automation/scripts/heb-add-cart.js --status
```

### Step 4: Launch Browsers

```bash
# Launch Edge for HEB
node dinner-automation/scripts/launch-shared-chrome.js

# Login to HEB manually in Edge window
# Then run:
node dinner-automation/scripts/heb-add-cart.js
```

---

## 📚 Additional Resources

| Resource | Location | Description |
|----------|----------|-------------|
| Recipe Database | `dinner-automation/data/recipe-database.json` | 20+ family recipes |
| Weekly Plan | `dinner-automation/data/weekly-plan.json` | Current meal plan |
| Pattern Library | `patterns/` | 41KB reusable modules |
| Security Audit | `SECURITY_AUDIT_SUMMARY.md` | Security improvements |
| Architecture | `docs/AUTOMATION-ARCHITECTURE.md` | System design |

---

## 🆘 Need Help?

1. **Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** — most issues documented there
2. **Review logs** — all scripts log to console with structured output
3. **Check status** — most scripts have `--status` flag
4. **Read the code** — scripts are heavily commented

---

*Last Updated: February 15, 2026*  
*Maintained by: Marvin (AI Agent)*
