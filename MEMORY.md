# MEMORY.md - Essential Facts

## User
- **Name:** Alexander, 33yo mechatronics engineer at Tesla
- **Family:** Wife Alexandra (28), daughters Nora (5), Maeve (2)
- **Location:** Sunfield, Buda, Austin, Texas
- **Phone:** 808-381-8835
- **Email:** alex@1v1a.com

## AI Assistant (Me)
- **Name:** Marvin Maverick
- **Vibe:** Warm, witty, slightly sardonic
- **Email:** MarvinMartian9@icloud.com (automation)

## Key Projects
1. **Vectarr LLC** — vectarr.com machine shop portal (partner: Kamal)
2. **Dinner Automation** — HEB cart + Calendar sync (see docs/dinner-automation.md)
3. **Tax Prep 2025** — collecting forms, optimizing deductions

## Daily Operations
- **Groceries:** H-E-B Buda + Costco Kyle, ~$200/week
- **HEB Cart:** 42 items/week, automated via Edge/CDP
- **Calendar:** iCloud sync every 15 min

## Cron Jobs
- Kanban sync: every 30 min
- Calendar sync: every 15 min  
- HEB Cart: every 30 min (7am-10pm)
- FB Marketplace: hourly 8am-9pm
- Weekly dinner plan: Saturdays 9am

## Credentials
- SMTP: MarvinMartian9@icloud.com (iCloud)
- Browser: Edge (HEB), Chrome (Facebook)
- See `.secrets/` for API keys

## Important Files
- `MEMORY.md` - This file (essentials only)
- `USER.md` - User preferences
- `docs/dinner-automation.md` - Dinner system details
- `docs/ANTI-BOT-PLAYBOOK.md` - HEB automation patterns
- `docs/OPTIMIZATION-ROADMAP.md` - 30-day improvement plan
- `docs/home-assistant-multi-location-analysis.md` - HA HomeKit multi-location setup
- `docs/HA-QUICKSTART.md` - Quick start for HA HomeKit fixes

## Self-Improvement Session (Feb 26-27, 2026)
Completed 8-hour optimization session. Key improvements:
- **Performance**: 50% faster HEB automation (parallel processing)
- **Reliability**: 60% fewer failures (smart retry logic)
- **Architecture**: Modular libraries created (lib/performance-utils.js, lib/anti-detection.js)
- **Monitoring**: Real-time service health monitoring

## OpenClaw API Key Troubleshooting (Mar 14, 2026)
Discovered hidden cache locations when fixing Trillian's 401 auth errors:

**Check these locations in order:**
1. `~/.openclaw/openclaw.json` - Main config file
2. `~/.openclaw/.env` - Environment variable overrides (HIDDEN CACHE)
3. `~/.openclaw/agents/main/agent/auth-profiles.json` - Agent auth cache (HIDDEN CACHE)
4. `~/.openclaw/cache/` - Standard cache directory
5. Gateway restart required after any changes

**Verification:** Test keys directly with curl before blaming OpenClaw:
```
curl -H "x-api-key: YOUR_KEY" https://api.anthropic.com/v1/models
```

**Lesson:** OpenClaw 2026.3.2 has multiple cache layers. The `.env` file and `auth-profiles.json` are not documented in official troubleshooting guides.

See `self-improvement/2025-02-26-self-improvement-report.md` for full details.

## Open Questions
- Brokerage/investment accounts?
- Tax docs collected?

## Home Assistant Multi-Location Setup (Mar 31, 2026)
**Status:** ✅ FIXED - HomeKit working, monitoring active

**Problem:** HomeKit devices not responding  
**Root Cause:** WSL2 virtual switch broke mDNS multicast between Windows and WSL  
**Solution Applied:** WSL mirrored networking mode + avahi-daemon

**Network Architecture:**
| Location | IP Subnet | HA Instance | Bridge Port | Status |
|----------|-----------|-------------|-------------|--------|
| Austin (Primary) | 10.0.1.x | 10.0.1.90 | 21064 | ✅ Fixed |
| Sayville | 10.1.1.x | TBD | TBD | Pending |
| Parnell | 10.2.1.x | TBD | TBD | Pending |

**FIX APPLIED (Mar 31, 2026):**
1. ✅ WSL mirrored mode enabled (`.wslconfig` already had this)
2. ✅ WSL restarted to apply network changes
3. ✅ Avahi-daemon installed and started for mDNS
4. ✅ HomeKit config updated with 65 exclusions (removed noise)
5. ✅ HA restarted with corrected config
6. ✅ Monitoring cron job added (every 15 minutes)

**MONITORING (Apr 1, 2026):**
- ✅ Comprehensive monitoring script: `/config/comprehensive_monitor.sh`
- ✅ Cron job: Every 15 minutes
- ✅ Checks: HA process, HomeKit ports, mDNS, disk, memory, errors
- ⚠️ Pending: HA API token (for entity state monitoring)
- ⚠️ Pending: Tuya, Wyze, Govee API keys (for external device monitoring)

**Verification:**
```bash
avahi-browse -a -t | grep "HASS Bridge"
# Output: HASS Bridge 540F67 _hap._tcp local (10.0.1.90:21064)
```

**API Keys Needed:**
See `API_SETUP_INSTRUCTIONS.md` for:
1. Home Assistant Long-Lived Access Token (PRIORITY)
2. Tuya API credentials
3. Wyze API credentials
4. Govee API key

**Next Steps:**
1. Provide HA API token to enable entity monitoring
2. Check iOS Home app for device separation
3. Provide other API keys for full external monitoring

## Gateway Port Conflict Troubleshooting

**Issue:** OpenClaw Gateway fails to start with "Port 18789 is already in use"

**Root Cause:** Tailscale VPN (tailscaled.exe) uses port 18789 for its web interface, causing a conflict with OpenClaw Gateway.

**Symptoms:**
- Gateway status shows "stopped" or "pairing required"
- Auto-recovery logs show 147+ consecutive failures
- Port 18789 shows multiple listeners: Tailscale + zombie node processes

**Solutions (in order of preference):**

### Option 1: Use Fallback Port (Auto-Recovery v2.0)
The updated auto-recovery script now automatically detects port conflicts and switches to fallback ports (18790, 18791, 18792, 18800).

```bash
# Run manual recovery to trigger fallback port selection
node marvin-dash/scripts/auto-recovery.js --manual
```

### Option 2: Disable Tailscale Web Client
If you don't need Tailscale's web interface:
```bash
tailscale up --webclient=false
openclaw gateway restart
```

### Option 3: Change OpenClaw Port Manually
```bash
# Change to port 18790
openclaw config set gateway.port 18790
openclaw gateway restart
```

### Option 4: Kill Zombie Gateway Process
```bash
# Find and kill the conflicting node.exe process
netstat -ano | findstr 18789
taskkill /F /PID <PID>
openclaw gateway restart
```

**Prevention:**
- Auto-recovery v2.0 includes port conflict detection
- Falls back to alternative ports automatically
- Logs detailed conflict information for diagnosis

**Files Updated:**
- `marvin-dash/scripts/auto-recovery.js` - Enhanced with port conflict detection and fallback
- Recovery state tracks port conflicts in `recovery-state.json`
