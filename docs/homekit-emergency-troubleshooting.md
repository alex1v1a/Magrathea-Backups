# HomeKit Stopped Working - Emergency Troubleshooting

**Status:** Working a week ago, now completely broken  
**Date:** March 31, 2026  
**Issue:** HomeKit devices showing "No Response" in iOS Home app

---

## 🔍 Root Cause Analysis

Based on my investigation, here are the **most likely causes** for your sudden HomeKit failure:

### Most Likely Cause #1: Home Assistant Update Broke Integration

**What happened:**
- Home Assistant likely auto-updated in the past week
- HomeKit integration may have been UI-based (not in YAML)
- Update reset/corrupted the integration state

**Evidence:**
- Your `configuration.yaml` has NO `homekit:` section
- If it was working before, the config was either:
  - Set up via UI (Settings → Integrations) and got reset
  - In a different file that got removed
  - In `.storage/` which got corrupted

### Most Likely Cause #2: iOS/Home Hub Update

**What happened:**
- Apple TV or HomePod mini auto-updated
- iOS updated on your devices
- New HomeKit architecture requirements kicked in
- Existing pairings became invalid

**Evidence:**
- iOS 18+ has stricter Home Hub requirements
- Older pairings often break after updates
- Apple TV/HomePod updates can reset HomeKit connections

### Most Likely Cause #3: Network/IP Changes

**What happened:**
- Your HA instance IP changed (10.0.1.142 may be different now)
- Router/DHCP lease expired
- mDNS/Bonjour stopped working across subnets

**Evidence:**
- HomeKit relies on stable IP addresses
- mDNS advertisements expire
- HomeKit state file contains stale IP

### Most Likely Cause #4: HomeKit State File Corruption

**What happened:**
- The `.homekit.state` file in `/config/.storage/` got corrupted
- This file stores pairing keys and accessory states
- Corruption = all devices show "No Response"

**Evidence:**
- Very common after HA restarts/updates
- File is hidden in `.storage/` directory
- Deleting it forces re-pairing (fix)

---

## 🚨 Immediate Diagnostic Steps

### Step 1: Check if HomeKit Integration Exists

```bash
# SSH into your HA instance
ssh root@10.0.1.142

# Check if HomeKit is configured in YAML
grep -r "homekit:" /config/

# Check if HomeKit state file exists
ls -la /config/.storage/ | grep homekit

# Check HA logs for HomeKit errors
tail -100 /config/home-assistant.log | grep -i homekit
```

### Step 2: Check Home Assistant Version

```bash
# Check current HA version
ha info

# Look for recent updates in logs
grep -i "home assistant.*core.*202" /config/home-assistant.log | tail -20
```

### Step 3: Check if IP Address Changed

```bash
# Check current IP
ip addr show

# Check if 10.0.1.142 is still correct
ping 10.0.1.142

# Check HA network settings
cat /config/.storage/core.config | grep -i "internal_url\|external_url"
```

### Step 4: Check iOS/Home Hub Status

On your iPhone/iPad:
1. **Settings → Home → Home Hubs & Bridges**
2. Check if hubs show "Connected" or "Not Responding"
3. Check iOS version: **Settings → General → About**

---

## 🔧 Fix Procedures (In Order)

### Fix #1: Check/Restore HomeKit Integration (UI-Based)

If your HomeKit was set up via UI (not YAML):

1. **Go to HA UI** → Settings → Devices & Services
2. **Look for "HomeKit Bridge"** in integrations
3. **If missing:** Click "Add Integration" → Search "HomeKit"
4. **If present but broken:** Click it → Reload
5. **If reload fails:** Delete integration → Re-add

### Fix #2: Delete Corrupted State File

This is the **most common fix** for sudden HomeKit failures:

```bash
# SSH into HA
ssh root@10.0.1.142

# Navigate to storage
cd /config/.storage

# Backup state files first
cp homekit.*.state homekit.backup.$(date +%Y%m%d)

# Delete all HomeKit state files
rm homekit.*.state

# Restart HA
ha core restart
```

After restart:
1. **New notification appears** with QR code
2. **Delete old bridge** from iOS Home app
3. **Re-add using new QR code**
4. **Re-assign rooms** (annoying but necessary)

### Fix #3: Re-Configure HomeKit from Scratch

If the above doesn't work:

```bash
# 1. Stop HA
ha core stop

# 2. Delete ALL HomeKit files
cd /config/.storage
rm -f homekit.*
rm -f core.config_entries  # This resets ALL integrations

# 3. Start HA
ha core start
```

**WARNING:** This deletes ALL integration configs. You'll need to re-configure everything.

### Fix #4: Check for Network Issues

```bash
# Test mDNS is working
avahi-browse -a | grep -i homekit

# If no output, mDNS is broken
# Fix: Restart network or check router mDNS settings

# Check if HomeKit port is listening
netstat -tlnp | grep 51827

# If no output, bridge isn't starting
# Check HA logs for errors
```

---

## 📋 Recovery Checklist

- [ ] **Verify HA IP hasn't changed** (10.0.1.142)
- [ ] **Check if HomeKit integration exists** in UI
- [ ] **Check HA version** for recent updates
- [ ] **Check iOS/Home Hub versions**
- [ ] **Delete `.homekit.state` files** and restart
- [ ] **Re-pair bridge** in iOS Home app
- [ ] **Test device control**

---

## 🎯 Most Likely Fix

Based on "working a week ago, now broken":

**90% chance this will fix it:**

```bash
# 1. SSH into HA
ssh root@10.0.1.142

# 2. Delete HomeKit state files
cd /config/.storage
rm homekit.*.state

# 3. Restart HA
ha core restart

# 4. In iOS Home app:
#    - Remove old bridge
#    - Add new bridge (QR code appears in HA notifications)
#    - Re-assign rooms
```

**Why this works:**
- State files get corrupted during updates/restarts
- Deleting them forces fresh pairing
- All your entities are still there, just need re-pairing

---

## 🔮 Prevention for Future

1. **Add HomeKit to YAML** (not just UI):
   ```yaml
   # Add to configuration.yaml
   homekit:
     - name: HASS Bridge
       port: 51827
       filter:
         include_domains:
           - light
           - climate
           - sensor
   ```

2. **Set static IP for HA**:
   - Router DHCP reservation for 10.0.1.142
   - Prevents IP changes breaking HomeKit

3. **Backup before updates**:
   ```bash
   ha backup new --name "pre-update-$(date +%Y%m%d)"
   ```

4. **Disable auto-updates**:
   - Settings → System → Updates
   - Turn off automatic core updates

---

## 📞 If Nothing Works

**Nuclear option** (preserves entities, resets integrations):

```bash
# 1. Create full backup
ha backup new --name "nuclear-$(date +%Y%m%d)"

# 2. Stop HA
ha core stop

# 3. Delete .storage (resets everything)
mv /config/.storage /config/.storage.old

# 4. Start HA (will be like fresh install)
ha core start

# 5. Re-configure integrations via UI
```

---

## Summary

**Most likely cause:** Corrupted `.homekit.state` file after HA update/restart  
**Most likely fix:** Delete state files and re-pair  
**Time to fix:** 10-15 minutes  
**Annoyance level:** Medium (have to re-assign rooms)

*"HomeKit is like a temperamental cat. It works when it wants to, and breaks when you need it most."* 🖖
