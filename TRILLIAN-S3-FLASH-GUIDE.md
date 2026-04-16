# ESP32-S3 Flashing Guide - Trillian Voice Assistant

## Quick Start

Your ESP32-S3 is connected and ready to flash. This configuration includes **microWakeWord** for on-device wake word detection.

---

## Prerequisites

1. **ESPHome installed** (should already be set up from Atom Lite project)
2. **Python environment** with ESPHome
3. **USB cable** connected to the ESP32-S3
4. **Device driver** (if needed - Windows may auto-install)

---

## Step 1: Identify Your ESP32-S3 Board

First, check what specific ESP32-S3 board you have for pin configuration:

```powershell
# List COM ports to find your device
Get-PnpDevice -Class Ports | Where-Object { $_.FriendlyName -like "*USB*" -or $_.FriendlyName -like "*COM*" }
```

Or check Device Manager → Ports (COM & LPT)

**Common ESP32-S3 boards:**
- **ESP32-S3-DevKitC-1** - Most common development kit
- **ESP32-S3-Box** / **ESP32-S3-Box-3** - Has built-in display/speaker
- **M5Stack CoreS3** - With 2" touchscreen
- **Generic ESP32-S3** - Minimal dev board

---

## Step 2: Update Pin Configuration (If Needed)

The config file uses generic ESP32-S3 pins. **You may need to adjust based on your board:**

| Function | Default Pin | Common Alternatives |
|----------|-------------|---------------------|
| Status LED | GPIO48 | GPIO2, GPIO8, GPIO21 |
| Boot Button | GPIO0 | (usually fixed) |
| I2S WS (LRCK) | GPIO4 | GPIO6, GPIO11 |
| I2S SCK (BCLK) | GPIO5 | GPIO7, GPIO12 |
| I2S DIN (Mic) | GPIO8 | GPIO9, GPIO13 |
| I2S DOUT (Speaker) | GPIO9 | GPIO10, GPIO14 |

**If you have an ESP32-S3-Box or Box-3:**
- Different pinout - let me know and I'll update the config
- Built-in speaker and microphone

---

## Step 3: Flash the Firmware

### Option A: ESPHome CLI (Recommended)

```powershell
# Navigate to workspace
cd ~\.openclaw\workspace

# Flash the ESP32-S3 (will compile and upload)
esphome run trillian-s3-voice-assistant.yaml --device COM3

# Replace COM3 with your actual port
```

### Option B: ESPHome Web (If CLI has issues)

1. Go to: https://web.esphome.io/
2. Click "Connect"
3. Select your ESP32-S3 device
4. Use "Install" → "Manual Download" → "Modern Format"
5. Then "Install" → "Choose File" and select the downloaded firmware

---

## Step 4: First Boot & WiFi Setup

After flashing, the device will:

1. **Show purple/white LED** - Booting up
2. **Flash yellow** - No WiFi configured, starting captive portal
3. **Connect to WiFi AP:** `Trillian-S3`
4. **Open browser to:** `192.168.4.1`
5. **Enter your WiFi credentials**

Or use the **improv_serial** feature - Home Assistant may auto-detect and prompt for WiFi.

---

## Step 5: Add to Home Assistant

1. Go to **Settings → Devices & Services**
2. ESPHome should auto-discover "Trillian S3 Voice Assistant"
3. Click **Configure** and enter the API encryption key from your `secrets.yaml`
4. The device will appear with sensors and voice assistant controls

---

## Wake Word Status

### Currently Configured
- **"Okay Nabu"** - Built-in wake word from microWakeWord project
- Running **on-device** (no cloud required!)
- No Home Assistant wake word streaming needed

### Training "Trillian" Custom Wake Word

To train your custom wake word:

1. **Record samples** (~50-100 samples of you saying "Trillian")
2. **Use microWakeWord training notebook:**
   https://github.com/kahrendt/microWakeWord/blob/main/notebooks/training.ipynb
3. **Export the model** as `trillian.json`
4. **Place in ESPHome config directory**
5. **Update YAML** to use your custom model (see commented section)

**For now:** Use "Okay Nabu" while you collect training samples.

---

## LED Indicators

| Color | Pattern | Meaning |
|-------|---------|---------|
| Blue | Pulsing | Listening (after wake word) |
| Green | Pulsing | Wake word detected, starting VA |
| White | Solid | Processing speech / TTS playing |
| Yellow | Flashing | WiFi disconnected / connecting |
| Red | Solid | Error occurred |
| Off | - | Idle, waiting for wake word |

---

## Troubleshooting

### Flash fails / Can't connect
```powershell
# Put ESP32-S3 in download mode manually:
# 1. Hold BOOT button
# 2. Press and release RESET (or unplug/replug USB)
# 3. Release BOOT button
# 4. Try flashing again
```

### No audio / microphone not working
- Check I2S pin configuration matches your board
- Verify microphone is I2S (not PDM or analog)
- Check `pdm: true/false` setting matches your mic type

### Wake word not detecting
- Check PSRAM is detected (sensor shows free PSRAM)
- Speak clearly, 3-6 feet from microphone
- Background noise may interfere
- Try adjusting `noise_suppression_level`

### WiFi won't connect
- Check `secrets.yaml` has correct credentials
- Use captive portal (connect to `Trillian-S3` AP)
- Check 2.4GHz network (ESP32-S3 doesn't support 5GHz only)

---

## Next Steps After Flashing

1. ✅ Test "Okay Nabu" wake word
2. ✅ Verify voice assistant pipeline in HA responds
3. ⏳ Collect "Trillian" voice samples for custom model
4. ⏳ Train custom wake word with microWakeWord
5. ⏳ Deploy custom model to device

---

## Resources

- **microWakeWord:** https://github.com/kahrendt/microWakeWord
- **ESPHome Voice Assistant:** https://esphome.io/components/voice_assistant.html
- **ESPHome micro_wake_word:** https://esphome.io/components/micro_wake_word.html
