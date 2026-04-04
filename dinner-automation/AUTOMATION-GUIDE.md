# Dinner Automation - What's Automatic vs Manual

## ✅ FULLY AUTOMATIC (No User Action Required)

### 1. 📧 Email
- **Status**: ✅ Fully Automatic
- **What happens**: Email sent to alex@1v1a.com and sferrazzaa96@gmail.com
- **User action**: None - check your inbox

### 2. 🛒 HEB Cart
- **Status**: ⚠️ Semi-Automatic (Windows limitation)
- **What happens**:
  1. ✅ Chrome launches automatically
  2. ✅ Chrome comes to foreground
  3. ✅ Navigates to heb.com
  4. ✅ Extension auto-starts
  5. ❌ **Manual**: Must be logged into HEB.com
- **User action**: Log into HEB.com if not already logged in

### 3. 📅 Apple Calendar
- **Status**: ❌ Manual Import Required (Platform limitation)
- **Why**: Apple Calendar is macOS/iOS only. Windows cannot directly access it.
- **Options**:
  1. **iCloud.com** (Web): Import via browser
  2. **iCloud for Windows**: Sync app
  3. **iPhone/Mac**: Import on Apple device

---

## 🔧 PLATFORM LIMITATIONS

### Windows Cannot:
- Directly access Apple Calendar (macOS/iOS only)
- Auto-import ICS to iCloud without user interaction
- Save HEB login session across Chrome launches (security)

### What IS Automated:
- ✅ Generating the calendar file (dinner-plan.ics)
- ✅ Opening Chrome with HEB.com loaded
- ✅ Bringing Chrome to foreground
- ✅ Extension auto-starting when HEB.com loads
- ✅ Adding items to cart automatically (when logged in)

---

## 📋 REQUIRED USER ACTIONS

### First-Time Setup:
1. **HEB Login**: Log into HEB.com in the Marvin Chrome profile (saves session)
2. **Calendar Import**: Import dinner-plan.ics to Apple Calendar via iCloud.com

### Weekly (After Setup):
1. **Check Email**: Review dinner plan
2. **Open Chrome**: HEB automation starts when you click Chrome window
3. **Verify Cart**: Items auto-add (takes ~5 minutes for 30 items)

---

## 🚀 QUICK START

**Run this to start automation:**
```
Fully-Automatic-Dinner.bat
```

**Then:**
1. Check email (automatic)
2. Click Chrome window (HEB auto-starts)
3. Import calendar file via iCloud.com

---

## 🔄 FILES GENERATED

| File | Purpose |
|------|---------|
| `data/weekly-plan.json` | Meal plan data |
| `data/dinner-plan.ics` | Apple Calendar import file |
| `data/automation-status.json` | Status of last run |
| `data/heb-auto-status.json` | HEB cart status |

---

## 🐛 TROUBLESHOOTING

### Chrome doesn't auto-start adding items:
- Ensure you're logged into HEB.com
- Check that the red notification banner appears
- Refresh heb.com if needed

### Calendar events not showing:
- Must import via iCloud.com/calendar/ or Apple device
- File location: `dinner-automation/data/dinner-plan.ics`

### Email not received:
- Check spam folder
- Check: alex@1v1a.com and sferrazzaa96@gmail.com
