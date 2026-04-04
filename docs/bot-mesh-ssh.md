# Bot Mesh SSH Connectivity

## Team Members

| Bot | Tailscale IP | SSH Status | User |
|-----|--------------|------------|------|
| Marvin | 100.126.151.25 | ✅ Ready | admin |
| Bistromath | 100.97.122.5 | ✅ Ready | admin |
| Deep Thought | 100.91.198.42 | ⏳ Pending | admin |
| Trillian | 100.122.231.21 | ✅ Ready | hanka |

## SSH Commands

### Test connectivity
```bash
# To Marvin
ssh -i ~/.ssh/your_key admin@100.126.151.25

# To Bistromath
ssh -i ~/.ssh/your_key admin@100.97.122.5

# To Deep Thought
ssh -i ~/.ssh/your_key admin@100.91.198.42

# To Trillian
ssh -i ~/.ssh/your_key hanka@100.122.231.21
```

## Troubleshooting

### Connection refused
- Check if SSH service is running: `Get-Service sshd`
- Check firewall: `netsh advfirewall firewall show rule name="OpenSSH Server"`

### Permission denied (publickey)
- Verify key is in `C:\ProgramData\ssh\administrators_authorized_keys`
- Check permissions: `icacls C:\ProgramData\ssh\administrators_authorized_keys`
- Should show: SYSTEM:F and Administrators:F only

## Emergency Repair Protocol

If a bot goes offline:
1. Try SSH from another bot
2. Check `openclaw gateway status`
3. Restart services: `openclaw gateway restart`
4. Check logs: `openclaw logs --follow`

_Last updated: 2026-02-25 by Marvin_
