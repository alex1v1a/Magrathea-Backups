# SSH Mesh Configuration - Marvin

## Status: ✅ CONFIGURED

### Marvin's SSH Details
- **Hostname:** Marvin
- **Tailscale IP:** 100.126.151.25
- **Username:** admin
- **SSH Port:** 22
- **Status:** Running (Automatic start)

### Team Access

| Team Member | Public Key Added | Status |
|-------------|------------------|--------|
| Trillian | ✅ Yes | Can SSH to Marvin |
| Deep Thought | ❌ Pending | Need public key |
| Bistromath | ❌ Pending | Need public key |

### Marvin's Public Key
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM7o8UX7gQK7YicuzdRNBOVmhOSE47OsKjTopc0LAhfH marvin@mesh
```

### How to Connect to Marvin
```bash
ssh admin@100.126.151.25
# or
ssh admin@marvin
```

### How Other Team Members Can Add Their Keys
Team members should provide their public keys (from `~/.ssh/id_ed25519.pub`) and they will be added to:
`C:\Users\Admin\.ssh\authorized_keys`

### Current authorized_keys Location
`C:\Users\Admin\.ssh\authorized_keys`

### Service Status
```powershell
Get-Service sshd
# Status: Running
# StartType: Automatic
```

### Firewall
Port 22 is open for SSH connections.

---
Last updated: 2026-04-11
