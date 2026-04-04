# SSH Configuration Guide - Hitchhikers Team

*Last updated: 2026-03-13*

## Overview

This document contains working SSH configurations for team access to Marvin (Windows) and other team machines. **Tailscale is deprecated** — use local IPs only.

---

## Marvin (Windows) - Primary Configuration

### Server Details
- **Hostname:** MARVIN
- **Local IP:** 10.0.1.90
- **Username:** admin (NOT marvin — that's the computer name)
- **SSH Port:** 22

### Server-Side Setup (On Marvin)

#### 1. SSH Service Status
```powershell
# Check if SSH is running
Get-Process sshd

# Start SSH if not running
Start-Process "C:\Program Files\OpenSSH-Win64\sshd.exe" -WindowStyle Hidden

# Verify port is listening
netstat -an | findstr :22
```

#### 2. sshd_config Location
```
C:\ProgramData\ssh\sshd_config
```

#### 3. Working sshd_config
```
# Essential settings
PubkeyAuthentication yes
PasswordAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Match block for admin user (handles all username variations)
Match User admin,Admin,MARVIN\admin,MARVIN\Admin,admin@MARVIN,Admin@MARVIN
    AuthorizedKeysFile C:\Users\admin\.ssh\authorized_keys
```

**Important:** Use single backslashes in the Match block, not double (\\).

#### 4. authorized_keys Location
```
C:\Users\admin\.ssh\authorized_keys
```

#### 5. Key File Requirements
- **Format:** Single key per line
- **Encoding:** UTF-8, no BOM
- **Line endings:** Unix (LF), not Windows (CRLF)
- **Permissions:** SYSTEM and Admin only

```powershell
# Fix permissions
icacls C:\Users\admin\.ssh /inheritance:r /grant:r "NT AUTHORITY\SYSTEM:(OI)(CI)F"
icacls C:\Users\admin\.ssh\authorized_keys /inheritance:r /grant:r "NT AUTHORITY\SYSTEM:F"
```

#### 6. Verify Key Fingerprint
```powershell
$keyLine = Get-Content C:\Users\admin\.ssh\authorized_keys | Where-Object { $_ -match "trillian@mac" }
$tempFile = [System.IO.Path]::GetTempFileName()
$keyLine | Out-File -FilePath $tempFile -Encoding ASCII
ssh-keygen -lf $tempFile
Remove-Item $tempFile
```

Expected output for Trillian's key:
```
256 SHA256:kHLzc1BGA8RaChCsiLUYg0MEhFnjc0IByr3gzmy7tCE trillian@mac (ED25519)
```

---

## Client-Side Setup (Mac/Linux)

### Correct Connection Command
```bash
# Use 'admin' username, NOT 'marvin'
ssh admin@10.0.1.90

# Force specific key (if agent is confused)
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes admin@10.0.1.90
```

### Troubleshooting Client Issues

#### 1. Verify Your Key
```bash
# Check which key you're using
ssh-keygen -lf ~/.ssh/id_ed25519.pub

# Should show: trillian@mac (or your username)
# NOT: team@openclaw or other shared keys
```

#### 2. Check SSH Agent
```bash
# List loaded keys
ssh-add -l

# If wrong key loaded, clear and reload
ssh-add -D
ssh-add ~/.ssh/id_ed25519
```

#### 3. Verbose Connection Debug
```bash
ssh -v admin@10.0.1.90 2>&1 | grep -i "key\|auth\|attempt"
```

Look for:
- `Will attempt key:` — shows which key is being offered
- `method publickey` — successful key auth attempt
- `method password` — falling back to password (indicates key not offered/accepted)

#### 4. Host Key Issues
```bash
# If connection closes immediately, remove cached host key
ssh-keygen -R 10.0.1.90

# Or bypass host key checking (temporary)
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null admin@10.0.1.90
```

---

## Common Issues & Solutions

### Issue: "Invalid user" errors
**Cause:** Using wrong username (e.g., `marvin` instead of `admin`)
**Fix:** Use `admin@10.0.1.90`

### Issue: Key not being offered
**Cause:** SSH agent has wrong key loaded, or key file permissions wrong
**Fix:** 
```bash
ssh-add -D
ssh-add ~/.ssh/id_ed25519
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes admin@10.0.1.90
```

### Issue: Permission denied (key correct)
**Cause:** authorized_keys has Windows line endings (CRLF)
**Fix on Marvin:**
```powershell
$content = Get-Content C:\Users\admin\.ssh\authorized_keys -Raw
$content -replace "`r`n", "`n" | Set-Content C:\Users\admin\.ssh\authorized_keys -NoNewline
```

### Issue: Connection times out
**Cause:** SSH server not running
**Fix:**
```powershell
Start-Process "C:\Program Files\OpenSSH-Win64\sshd.exe" -WindowStyle Hidden
```

---

## Team SSH Mesh Matrix

| From → To | Method | Status |
|-----------|--------|--------|
| Trillian → Marvin | SSH key auth | ✅ Working |
| Deep Thought → Marvin | SSH key auth | TBD |
| Bistromath → Marvin | SSH key auth | TBD |
| Trillian → Deep Thought | SSH | TBD |
| Trillian → Bistromath | SSH | TBD |

**Note:** All connections use local IPs (10.0.1.x). Tailscale is deprecated.

---

## Debug Mode (For Troubleshooting)

On Marvin, run SSH in debug mode to see real-time authentication:
```powershell
Stop-Process -Name sshd -Force
& "C:\Program Files\OpenSSH-Win64\sshd.exe" -d
```

Then connect from client and watch the logs.

---

## Key Fingerprints (For Verification)

| User | Key Type | Fingerprint |
|------|----------|-------------|
| Trillian | ED25519 | SHA256:kHLzc1BGA8RaChCsiLUYg0MEhFnjc0IByr3gzmy7tCE |

---

## Important Reminders

1. **Username is `admin`, not `marvin`** — `marvin` is the computer name
2. **Use local IP 10.0.1.90** — Tailscale is deprecated
3. **Verify key fingerprints** — Ensure you're using the right key
4. **Check SSH agent** — Wrong key loaded is a common cause of failures
5. **Line endings matter** — authorized_keys must have Unix (LF) line endings

---

*"The thing about computers is they're very good at doing exactly what you tell them. The problem is usually that you didn't actually tell them what you thought you did."*
