# Amazon Alexa Integration for Home Assistant

## 🎯 Two Setup Options

### Option 1: Home Assistant Cloud (EASIEST - Recommended)
**Cost:** $6.50/month (Nabu Casa)
**Setup Time:** 5 minutes
**Maintenance:** Zero

**Steps:**
1. Sign up at https://www.nabucasa.com
2. Link your HA instance to Nabu Casa
3. Enable Alexa integration in the UI
4. Link to your Amazon account
5. Discover devices: "Alexa, discover devices"

**Pros:**
- ✅ Works from anywhere (no port forwarding)
- ✅ Automatic SSL certificates
- ✅ Easy setup, no AWS knowledge needed
- ✅ Google Assistant also included
- ✅ Remote access to HA from outside your home

**Cons:**
- ❌ Monthly subscription fee

---

### Option 2: Manual Alexa Smart Home Skill (FREE)
**Cost:** Free
**Setup Time:** 1-2 hours
**Maintenance:** Occasional updates

**Requirements:**
- AWS account (free tier works)
- Port forwarding on your router (or Nabu Casa tunnel)
- Some technical knowledge

**Steps:**
1. Create AWS Lambda function
2. Deploy Haaska (self-hosted Alexa skill)
3. Create Alexa Skill in Developer Console
4. Link AWS Lambda to skill
5. Configure OAuth
6. Discover devices

**Pros:**
- ✅ Free forever
- ✅ Full control over the skill
- ✅ No monthly fees

**Cons:**
- ❌ Complex setup
- ❌ Requires AWS knowledge
- ❌ Need to handle SSL certificates
- ❌ Port forwarding security risks

---

## 🚀 Recommended: Option 1 (Nabu Casa)

### Quick Setup

**Step 1:** Subscribe at https://www.nabucasa.com
- $6.50/month
- First month often has trial

**Step 2:** Link to Home Assistant
1. Open HA → Configuration → Home Assistant Cloud
2. Click "Start your free trial" or "Subscribe"
3. Follow the signup flow
4. Your HA instance will get a secure URL like:
   `https://yourname.ui.nabu.casa`

**Step 3:** Enable Alexa
1. In Nabu Casa → Alexa → Enable
2. Configure which devices to expose:
   ```yaml
   cloud:
     alexa:
       filter:
         include_domains:
           - light
           - switch
           - sensor
           - climate
           - fan
           - cover
           - lock
           - camera
   ```

**Step 4:** Link to Amazon
1. Go to https://alexa.amazon.com
2. Skills → Search "Home Assistant"
3. Enable Skill → Sign in with Nabu Casa
4. Authorize access

**Step 5:** Discover Devices
Say: *"Alexa, discover devices"*

Or in Alexa app:
Devices → + → Add Device → Smart Home → Discover

---

## 🎙️ Voice Commands Ready

Once connected, you can say:

| Command | Action |
|---------|--------|
| "Alexa, turn on the living room lights" | Controls lights |
| "Alexa, set the thermostat to 72 degrees" | Climate control |
| "Alexa, is the front door locked?" | Check locks |
| "Alexa, turn off all lights" | Goodnight routine |
| "Alexa, what's the temperature in the bedroom?" | Sensors |
| "Alexa, show me the backyard camera" | Cameras (Echo Show) |
| "Alexa, set movie time scene" | Activate HA scenes |

---

## 🔧 Device Naming Tips

Alexa works best with simple names:

**Good Names:**
- "Living Room Light"
- "Kitchen Switch"
- "Bedroom Fan"
- "Front Door Lock"

**Bad Names:**
- "Philips Hue Bulb #3 Kitchen" (too long)
- "switch.kitchen_light_2" (technical)
- "Tuya Smart Plug Living Room" (brand names confuse Alexa)

Rename devices in HA if needed:
Settings → Devices → Select Device → Name

---

## 📱 Routines (Alexa's Version of Automations)

Create Alexa Routines for complex commands:

### "Alexa, good night"
- Turn off all lights
- Lock doors
- Set thermostat to sleep mode
- Arm security system

### "Alexa, I'm home"
- Turn on entry lights
- Unlock front door
- Set temperature to comfortable
- Announce welcome

### "Alexa, movie time"
- Dim living room lights to 20%
- Turn off kitchen lights
- Close smart blinds (if equipped)

**To create:**
Alexa app → More → Routines → +

---

## 🆚 Alexa vs Siri (Both Active!)

You can use BOTH simultaneously:

| Feature | Siri (HomeKit) | Alexa (Cloud) |
|---------|----------------|---------------|
| Setup | Free | $6.50/month |
| Works outside home | No | Yes |
| Response speed | Fast | Slight delay |
| Device support | Apple ecosystem | Wide range |
| Best for | iPhone users | Echo devices |

**Recommendation:**
- Use **Siri** on iPhone/Watch for quick commands at home
- Use **Alexa** on Echo devices for whole-home control
- Both control the same HA devices!

---

## ⚠️ Troubleshooting

**"Alexa can't find my devices"**
→ Say "Alexa, discover devices" again
→ Check Nabu Casa → Alexa → Exposed entities

**"Alexa says device is not responding"**
→ Check HA is online
→ Check Nabu Casa connection
→ Restart HA

**"Some devices missing"**
→ Check they're included in the filter
→ Try including specific entity IDs

---

## 🎯 Current HA Integrations Status

| Integration | Status |
|-------------|--------|
| Govee | ✅ Ready |
| Wyze (22 cameras) | ✅ Ready |
| HomeKit/Siri | ✅ Ready |
| Tuya | ✅ Ready |
| Alexa | 🔄 Need to choose option |
| LCARS Theme | ✅ Ready |

**Which Alexa option do you prefer?**
1. **Nabu Casa ($6.50/mo)** - Easy, 5 min setup
2. **Manual (Free)** - Complex, 1-2 hour setup

I recommend Option 1 - it's worth the monthly fee for the convenience and remote access!
