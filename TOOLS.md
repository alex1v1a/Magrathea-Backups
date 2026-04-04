
## Browser Automation Configuration

### Microsoft Edge — DINNER AUTOMATION ONLY
**Primary browser for all dinner/grocery automation**

| Setting | Value |
|---------|-------|
| **Executable** | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| **Debug Port** | 9222 (CDP) |
| **Account** | alex@1v1a.com (HEB login) |
| **Status** | ✅ Dinner automation exclusive |
| **HEB Extension** | `dinner-automation/heb-extension/` |

### Edge Architecture for Dinner Automation
```
┌─────────────────────────────────────────┐
│  Microsoft Edge (Port 9222)             │
│  └─ HEB Auto Shopper Extension          │
│  └─ Logged into heb.com                 │
└─────────────────────────────────────────┘
         ▲
         │ CDP Connection
    ┌────┴────┬──────────────┐
    │         │              │
HEB Cart  Meal Plan    Calendar Sync
```

### Edge Commands (Dinner Automation)
```bash
# Launch Edge for dinner automation
dinner-automation/data/launch-edge.bat

# Or via Node
node dinner-automation/scripts/launch-edge.js

# Update HEB meal plan
node dinner-automation/scripts/update-heb-meal-plan.js
```

---

### Google Chrome — FACEBOOK ONLY
**Reserved exclusively for Facebook Marketplace automation**

| Setting | Value |
|---------|-------|
| **Profile Directory** | `C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default` |
| **Debug Port** | 9222 (CDP) |
| **Account** | alex@xspqr.com |
| **Status** | 🔒 Facebook only |
| **Policy** | NO dinner automation |

### Chrome Architecture (Facebook Only)
```
┌─────────────────────────────────────────┐
│  Shared Chrome (Port 9222)              │
│  └─ Alexander's Default Profile         │
│  └─ Logged into Facebook                │
└─────────────────────────────────────────┘
         ▲
         │ CDP Connection
    ┌────┴────┬──────────┐
    │         │          │
FB Messages  F-150    Other FB Tasks
```

### Chrome Commands (Facebook Only)
```bash
# Launch shared Chrome (Facebook)
node dinner-automation/scripts/launch-shared-chrome.js

# Check status
node dinner-automation/scripts/launch-shared-chrome.js --status

# Stop shared Chrome
node dinner-automation/scripts/launch-shared-chrome.js --stop

# Facebook Marketplace
node dinner-automation/scripts/facebook-marketplace-shared.js --messages
node dinner-automation/scripts/facebook-marketplace-shared.js --share-f150
```

### Why Separate Browsers?
| Chrome (Facebook) | Edge (Dinner) |
|-------------------|---------------|
| Profile for FB only | Clean profile for HEB |
| No HEB bot detection issues | Bypasses HEB automation blocks |
| Stable FB sessions | Stable HEB login |
| No cross-contamination | Dedicated to groceries |

---
*Add more as I learn — SSH hosts, camera names, voice preferences, etc.*
