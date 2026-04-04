# Siri Voice Control Setup for Home Assistant

## ✅ Current Status: HomeKit Bridge Configured

Your HA configuration already includes:
```yaml
homekit:
  - name: HA Bridge
    port: 21064
    filter:
      include_domains:
        - light
        - switch
        - camera
        - sensor
        - binary_sensor
        - climate
        - fan
```

## 📱 Step-by-Step Setup

### Step 1: Find HomeKit Pairing Code
1. Open Home Assistant at http://localhost:8123
2. Go to **Settings → Devices & Services**
3. Look for **HomeKit Bridge** notification (bell icon)
4. Click it to reveal the **8-digit pairing code**
   - Format: XXX-XX-XXX (e.g., 123-45-678)

### Step 2: Add to Apple Home App
1. Open **Home app** on your iPhone
2. Tap **+** (Add Accessory)
3. Tap **"Don't Have a Code or Can't Scan?"**
4. Select **"Home Assistant Bridge"** from the list
5. Enter the **8-digit pairing code** from HA
6. Tap **"Add Anyway"** (it's an uncertified accessory)
7. Assign rooms to your devices

### Step 3: Test Siri Commands

**Basic Commands:**
| Voice Command | Action |
|---------------|--------|
| "Hey Siri, turn on the living room lights" | Activates light entity |
| "Hey Siri, turn off all lights" | Goodnight routine |
| "Hey Siri, set the bedroom temperature to 72" | Climate control |
| "Hey Siri, is the front door locked?" | Check lock status |
| "Hey Siri, show me the backyard camera" | View camera feed |

**Room-Based Commands:**
- "Turn on kitchen lights"
- "Dim the bedroom lights to 50%"
- "Set the scene to Movie Night"

## 🎯 Recommended Voice Automations

### Automation 1: "I'm Home"
**Siri Command:** "Hey Siri, I'm home"
**Actions:**
- Turn on entry lights
- Set thermostat to comfortable temp
- Unlock front door (if equipped)
- Announce welcome message

### Automation 2: "Good Night"
**Siri Command:** "Hey Siri, good night"
**Actions:**
- Turn off all lights except hallway nightlight
- Lock all doors
- Set thermostat to sleep mode
- Arm security system

### Automation 3: "Movie Time"
**Siri Command:** "Hey Siri, it's movie time"
**Actions:**
- Dim living room lights to 20%
- Turn off kitchen lights
- Set TV to movie mode (if integrated)
- Close smart blinds (if equipped)

### Automation 4: "Good Morning"
**Siri Command:** "Hey Siri, good morning"
**Actions:**
- Gradually brighten bedroom lights
- Open blinds
- Announce weather and calendar
- Start coffee maker (if smart plug)

## 🔧 Creating Siri Shortcuts (Advanced)

For complex automations, create iOS Shortcuts:

1. Open **Shortcuts app** on iPhone
2. Tap **+** to create new shortcut
3. Add actions:
   - **"Control Home"** → Select devices/scenes
   - **"Get Contents of URL"** → Call HA webhook
4. Tap **Settings** (gear icon) → **Add to Siri**
5. Record your custom phrase

**Example Webhook URL:**
```
http://localhost:8123/api/webhook/morning_routine
```

## 📋 Checklist

- [ ] Find HomeKit pairing code in HA
- [ ] Add bridge to Apple Home app
- [ ] Test basic on/off commands
- [ ] Organize devices by room
- [ ] Create custom scenes (Movie Night, Good Morning)
- [ ] Set up Siri Shortcuts for complex automations

## 💡 Tips

1. **Naming matters:** Use simple names like "Living Room Light" not "Philips Hue Bulb #3"
2. **Rooms:** Assign devices to rooms in Home app for room-based commands
3. **Scenes:** Create scenes in Home app for multi-device control
4. **Shortcuts:** Use Shortcuts app for conditional logic ("If it's after sunset, turn on porch light")

## 🚀 Next Steps

1. **Get the pairing code** from HA notifications
2. **Add to Home app** now
3. **Test a command** - say "Hey Siri, turn off all lights"

**Ready to proceed?** Get that pairing code and let's test it!
