# API Access Setup Instructions

## What I Need From You

To enable full monitoring capabilities, I need the following API keys and tokens:

---

## 1. Home Assistant Long-Lived Access Token

**Why:** To check entity states, detect unavailable devices, and monitor device counts

**How to create:**
1. Open Home Assistant UI → http://10.0.1.90:8123
2. Click your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Name: "Marvin Monitoring"
6. Copy the token (it only shows once!)
7. Save it to: `/home/marvin/homeassistant/config/.ha_api_token`

**Command to save:**
```bash
echo "YOUR_TOKEN_HERE" | sudo tee /home/marvin/homeassistant/config/.ha_api_token
sudo chmod 600 /home/marvin/homeassistant/config/.ha_api_token
```

---

## 2. Tuya API Credentials (for SmartLife devices)

**Why:** To monitor Tuya/SmartLife device status outside of HA

**How to get:**
1. Go to https://iot.tuya.com/
2. Create an account or log in
3. Go to "Cloud" → "Create Cloud Project"
4. Select "Smart Home" industry
5. Note down:
   - Access ID/Client ID
   - Access Secret/Client Secret
   - API Endpoint (usually https://openapi.tuyaus.com for US)

**Save to:** `/home/marvin/homeassistant/config/.tuya_credentials`

---

## 3. Wyze API Credentials

**Why:** To monitor Wyze cameras and devices outside of HA

**How to get:**
1. Install `wyze-sdk` or use Wyze API directly
2. Credentials are your Wyze app login (email/password)
3. OR create a Wyze API key at https://developer.wyze.com/

**Save to:** `/home/marvin/homeassistant/config/.wyze_credentials`

---

## 4. Govee API Key

**Why:** To monitor Govee lights and devices

**How to get:**
1. Open Govee Home app on your phone
2. Go to Profile → Settings → API Key
3. Generate and copy the key

**Save to:** `/home/marvin/homeassistant/config/.govee_api_key`

---

## Quick Setup Script

Once you have the credentials, run this in WSL:

```bash
# Home Assistant Token
sudo tee /home/marvin/homeassistant/config/.ha_api_token << 'EOF'
YOUR_HA_TOKEN_HERE
EOF
sudo chmod 600 /home/marvin/homeassistant/config/.ha_api_token

# Tuya Credentials
sudo tee /home/marvin/homeassistant/config/.tuya_credentials << 'EOF'
TUYA_ACCESS_ID=your_access_id
TUYA_ACCESS_SECRET=your_access_secret
TUYA_ENDPOINT=https://openapi.tuyaus.com
EOF
sudo chmod 600 /home/marvin/homeassistant/config/.tuya_credentials

# Wyze Credentials
sudo tee /home/marvin/homeassistant/config/.wyze_credentials << 'EOF'
WYZE_EMAIL=your_email
WYZE_PASSWORD=your_password
EOF
sudo chmod 600 /home/marvin/homeassistant/config/.wyze_credentials

# Govee API Key
sudo tee /home/marvin/homeassistant/config/.govee_api_key << 'EOF'
YOUR_GOVEE_API_KEY
EOF
sudo chmod 600 /home/marvin/homeassistant/config/.govee_api_key
```

---

## Current Monitoring Status

✅ **Already Configured:**
- HA process monitoring (every 15 min)
- HomeKit bridge port monitoring
- mDNS/Avahi service monitoring
- Disk space monitoring
- Memory monitoring
- Error log monitoring

⚠️ **Pending Your API Keys:**
- Entity state monitoring (unavailable devices)
- Tuya device status
- Wyze camera status
- Govee device status

---

## What I'll Do With Access

Once you provide the API keys, I will:

1. **Create enhanced monitoring scripts** that check:
   - Which entities are unavailable/offline
   - Device battery levels
   - Camera connectivity
   - Light/switch status mismatches

2. **Set up alerts** for:
   - Devices going offline
   - Low battery warnings
   - Connection failures

3. **Generate reports** showing:
   - Device health by category
   - Offline device lists
   - Platform connectivity status

4. **Create automation suggestions** for:
   - Devices that frequently go offline
   - Misclassified entities
   - Duplicate devices

---

## Security Note

All credential files will be stored with 600 permissions (readable only by root) and will NOT be backed up to Git or shared. They are for local monitoring only.

---

**Please provide the Home Assistant token at minimum - this enables the most important monitoring (entity states and unavailable devices).**
