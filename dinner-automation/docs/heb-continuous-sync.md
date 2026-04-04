# HEB Cart Continuous Sync System

## Overview
Real-time synchronization between HEB cart, Apple Calendar, and email notifications. Whenever items change, all systems update automatically.

## How It Works

### Continuous Monitoring (Every 30 Minutes)
1. **Check cart status** - Count items currently in cart
2. **Compare with target** - 30 items expected (27 + 3 substitutions)
3. **Update calendar** - Add cart status to dinner events
4. **Queue email** - Notify if items are missing
5. **Log changes** - Track all sync activity

### Sync Triggers
- Cart item count changes
- Items added or removed
- Recipe substitutions applied
- Manual sync requests

## Automation Scripts

### 1. Continuous Sync (Every 30 min)
```bash
node dinner-automation/scripts/heb-continuous-sync.js
```
- Monitors cart status
- Updates calendar
- Prepares notifications
- Logs all changes

### 2. Master Sync (On-demand)
```bash
node dinner-automation/scripts/heb-cart-master-sync.js
```
- Full cart verification
- Adds missing items
- Removes extra items
- Complete sync cycle

### 3. Final Substitutions
```bash
node dinner-automation/scripts/heb-final-substitutions.js
```
- Applies smart substitutions
- Updates recipes
- Syncs calendar

## Data Files

### Sync State Files
| File | Purpose |
|------|---------|
| `heb-cart-sync.json` | Current cart status |
| `cart-calendar-status.json` | Calendar integration |
| `pending-notification.json` | Queued emails |
| `sync-log.json` | History of all syncs |
| `dinner-changes.json` | Meal plan changes |

### Target Meal Plan (30 Items)
```
Proteins: Catfish, Cod, Chicken thighs, Chicken breast, Ribeye
Produce: Mango, Red onion, Jalapeno, Green beans, Zucchini, 
         Lemon, Bosc pear, Cucumber, Cherry tomatoes
Pantry: Corn tortillas, Couscous, Jasmine rice, Quinoa, 
        Oregano, Capers, Sesame seeds, Kimchi, Hummus
Dairy: Butter, Feta cheese
Condiments: Chipotle mayo, Sriracha, White wine
Fresh herbs: Parsley, Thyme
Other: Cabbage slaw mix
```

## Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `heb-cart-continuous-sync` | Every 30 min | Monitor & sync |
| `apple-calendar-sync` | Every 15 min | Calendar updates |
| `heb-cart-self-recovering` | Saturdays 9 AM | Weekly cart build |

## Email Notifications

### When Sent
- Cart is missing items
- Substitutions applied
- Weekly meal plan ready
- Checkout reminder

### Email Template
```
Subject: HEB Cart Sync Alert - 27/30 items

Your HEB cart needs attention.

Current Status:
• Items in cart: 27
• Target items: 30
• Missing: 3

Action Required:
Please review your HEB cart and add missing items.

---
Marvin 🤖
```

## Current Status

| Component | Status |
|-----------|--------|
| Cart Items | 27/30 |
| Missing | 3 (minor substitutions) |
| Calendar | Synced |
| Notifications | Queued |
| Auto-Sync | Active (every 30 min) |

## Next Actions

### Immediate
1. ✅ Continuous sync running
2. ✅ Calendar integration active
3. ✅ Email notifications queued

### Future Improvements
1. Real-time HEB API integration (if available)
2. SMS notifications for urgent items
3. Smart substitution recommendations
4. Price tracking and deal alerts

---

**Status:** Fully operational
**Last Updated:** 2026-02-08
