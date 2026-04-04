# Home Assistant Multi-Location Quick Start Guide

## Immediate Action Items (Do These First)

### Step 1: Verify Your Setup

Check your current Home Assistant instance:

```bash
# SSH into your Austin HA instance (10.0.1.142)
ssh root@10.0.1.142

# Check if HomeKit is configured
grep -r "homekit:" /config/configuration.yaml

# If no results, HomeKit is NOT configured (this is your problem!)
```

### Step 2: Backup Current Config

```bash
# Create backup
cd /config
cp configuration.yaml configuration.yaml.backup.$(date +%Y%m%d)
```

### Step 3: Apply Austin Configuration

Copy the provided config to your Austin HA instance:

```bash
# From this workspace, copy to HA
cp docs/ha-config-austin.yaml /config/configuration.yaml

# Edit to add your secrets
nano /secrets.yaml
```

Add to `/secrets.yaml`:

```yaml
# Location coordinates (use Google Maps to find)
home_latitude_austin: 30.1234
home_longitude_austin: -97.1234

# External URL (if using Nabu Casa or reverse proxy)
external_url_austin: "https://your-instance.ui.nabu.casa"
# OR for Tailscale:
# external_url_austin: "http://ha-austin.tailnet.ts.net:8123"
```

### Step 4: Rename Entities

Run the helper script to see what needs renaming:

```bash
# View the checklist
python3 docs/rename_entities.py --location austin --action checklist
```

Then manually rename in Home Assistant:
1. Go to **Settings → Devices & Services → Entities**
2. Search for each entity
3. Click the entity → Settings (gear icon)
4. Change Entity ID to include `austin_` prefix
5. Save

### Step 5: Restart and Pair

```bash
# Restart HA
ha core restart

# Or use the UI: Developer Tools → YAML → Restart
```

After restart:
1. **Notification appears** → Click "Configure"
2. **Open Home app** on iPhone/iPad
3. **Tap + → Add Accessory → More Options**
4. **Scan QR code** from HA notification
5. **Assign to room** "Austin"

---

## Troubleshooting

### "No Response" in Home App

1. **Check mDNS**: 
   ```bash
   # From another device on same network
   avahi-browse -a | grep HASS
   ```

2. **Check ports**:
   ```bash
   netstat -tlnp | grep 51827
   ```

3. **Check logs**:
   ```bash
   ha logs | grep -i homekit
   ```

### Bridge Not Discoverable

1. Ensure `ip_address` in config matches HA's actual IP
2. Check firewall isn't blocking port 51827
3. Restart HA after any config changes

### iOS 18 Issues

1. **Check Home Hub**: 
   - Settings → Home → Home Hubs & Bridges
   - Ensure hub is Apple TV 4K (2nd gen+), HomePod mini, or newer

2. **Reset HomeKit** (last resort):
   - Remove bridge from Home app
   - Delete `.homekit.state` file in HA
   - Restart HA
   - Re-pair

---

## Next Steps

1. **Get Austin working first** (your primary location)
2. **Document working entities** 
3. **Replicate for Sayville** (copy config, adjust IPs)
4. **Replicate for Parnell**
5. **Deploy LCARS dashboards**

---

## Files Reference

| File | Purpose |
|------|---------|
| `docs/home-assistant-multi-location-analysis.md` | Full analysis document |
| `docs/ha-config-austin.yaml` | Austin HA configuration |
| `docs/ha-config-sayville.yaml` | Sayville HA configuration |
| `docs/ha-config-parnell.yaml` | Parnell HA configuration |
| `docs/rename_entities.py` | Entity renaming helper |

---

## Need Help?

Check these resources:
- [Home Assistant HomeKit Docs](https://www.home-assistant.io/integrations/homekit/)
- [HA Community Forum](https://community.home-assistant.io/)
- Check logs: `ha logs | grep -i homekit`

*"The first step to fixing a smart home is admitting you have a configuration problem."* 🖖
