# Team SSH Mesh Network

**Last Updated:** 2026-04-19  
**Purpose:** Secure cross-machine access for team operations

---

## Team Network Map

| Member | IP Address | Username | Status | Gateway Port |
|--------|-----------|----------|--------|--------------|
| Deep Thought | 10.0.1.99 | root | ✅ Online | 18789 |
| Trillian | 10.0.1.199 | trillian | ✅ Online | 18789 |
| Bistromath | 10.0.1.9 | (varies) | ⚠️ Check | 18789 |
| Marvin | 10.0.1.90 | hanka | ❌ **OFFLINE** | 18789 |

---

## Quick Commands

### Check Gateway Status
```bash
openclaw gateway status
```

### Restart Gateway
```bash
openclaw gateway restart
```

### View Gateway Logs
```bash
openclaw gateway log
```

---

## SSH Mesh Usage

### From Deep Thought (Windows)

Connect to any team member:
```powershell
# To Trillian
ssh trillian@10.0.1.199

# To Bistromath
ssh bistromath@10.0.1.9

# To Marvin (when online)
ssh hanka@10.0.1.90
```

### Execute Remote Commands

Check gateway status remotely:
```powershell
ssh trillian@10.0.1.199 "openclaw gateway status"
```

Restart gateway remotely:
```powershell
ssh trillian@10.0.1.199 "openclaw gateway restart"
```

### Using Specific Keys

If default key doesn't work, specify team key:
```powershell
# Using Deep Thought's key
ssh -i ~/.ssh/deepthought_ed25519 trillian@10.0.1.199

# Using team-specific keys
ssh -i ~/.ssh/bistromath_ed25519 bistromath@10.0.1.9
```

---

## Troubleshooting Team Members

### When a Team Member Stops Responding

1. **Ping the machine:**
   ```powershell
   ping -n 3 <IP_ADDRESS>
   ```

2. **If ping succeeds but no Discord response:**
   - SSH into the machine
   - Run: `openclaw gateway restart`

3. **If ping fails (100% loss):**
   - Machine is offline or network unreachable
   - Requires **physical intervention**

---

## Current Status: Marvin

**Status:** ❌ OFFLINE — Requires Physical Intervention  
**Last Known:** 2026-03-26  
**Location:** Marvin's physical machine (10.0.1.90)  
**Files on Marvin:** `/Users/hanka/.openclaw/workspace/`

### Action Required
Marvin's machine does not respond to ping. The OpenClaw gateway cannot be restarted remotely. Physical access needed to:
1. Check power/network connection
2. Restart the machine if necessary
3. Run `openclaw gateway start` or `openclaw gateway restart`

---

## SSH Keys Reference

### Key Locations
- **Deep Thought:** `~/.ssh/deepthought_ed25519`
- **Bistromath:** `~/.ssh/bistromath_ed25519`
- **Trillian:** (stored on her machine)
- **Marvin:** (stored on his machine)

### Authorized Keys
Team SSH public keys are stored in `~/.ssh/authorized_keys` on each machine.

---

## Windows-Specific Notes

PowerShell uses `;` as command separator (not `&&`):
```powershell
# Correct (PowerShell)
cd C:\Path; git status; git pull

# Incorrect (PowerShell)
cd C:\Path && git status && git pull
```

---

## Emergency Contacts

| Member | Discord Handle | Machine IP |
|--------|---------------|-----------|
| alex1v1a | @alex1v1a | N/A |
| Deep Thought | @Deep Thought | 10.0.1.99 |
| Trillian | @Trillian | 10.0.1.199 |
| Bistromath | @Bistromath | 10.0.1.9 |
| Marvin | @Marvin | 10.0.1.90 |

---

## Related Documentation

- `~/.openclaw/workspace/memory/2026-03-26.md` — Previous team outage incident
- `~/.openclaw/workspace/memory/CORE_DIRECTIVES.md` — Team operating principles

---

*The mesh network connects us... when the machines choose to speak.*
