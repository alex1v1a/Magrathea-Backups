# SSH Mesh Access Documentation
## Team: Marvin, Trillian, Deep Thought, Bistromath

**Generated:** 2026-04-11  
**Status:** ✅ Configured and Ready

---

## 🔑 SSH Key Summary

### Marvin (This Machine)
- **Hostname:** MARVIN
- **Username:** Admin
- **SSH Key:** `~/.ssh/id_rsa` (RSA 4096-bit)
- **Fingerprint:** SHA256:6wjDNNlB63JSnPMgjhOa70BFSwly07DVGoPHQTUTx+c

**Public Key:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1kPtMFSW0QP+AoaXuxb49MkBYMuJneDfL4mtbtQPBMozOYBeEvFw2todxT40NE3wazAoW5pFUaicpsAaMAebQf9LoMSpqQOuuUl9w3UVnSMtiYdAZCJQ/6QZ01Lne2rltJwQwg1VMVIppP6jv6gqbkDmh9lqPyRbKe8r7Y/Rjo9sJo0yDt9ejEQkcOfT36mvztp8l/a9yjOh9OIIo4rXeQEmTKxNpAY3S/w95otpxzJ91dyY2fAdu9OR3NtsMabq+WULvYGyCYMNw76Q7BqD4kdO63deGfxWcBKpN8vooeyixkRMyncPg/zWronF4Nyg2VPeYd19WOKG4suBWNDTJptwxctGhiwzYhybIKkh7Bmxt8IfuLNviVE5oFHBAx9ewA/Q6TjKczKkUm/HTTeNP3BUAh3Kvo1svIhiWN/WkUE6tsFdIfwAzi+/E56SdcPN8B0jwQAgWZjvfV5HorWmK8CnTBiKiL0UggVblBoqnbXghJU3y0fpHB4pNup0MPjiRvOR/G+8g27r/ZKRJVJPmugRlskMV8nQA1v2J4+FoQVhqBTl2ZhMDw9cV0dA7YKWHAQADEIJ2yfIRi70MMV4FCijFJD+dUWZ4F5Uj6o/SvUAvv5rH8rVeVZcrnstG+HB19kOQQhKxuJe/ZKqDSGj0t3NRBa7ZUL0uJ0RBnPdxXQ== marvin-MARVIN
```

---

## 📋 Team Member Status

| Member | Key Added | Machine Access | Notes |
|--------|-----------|----------------|-------|
| Marvin | ✅ Yes | Local | Host machine, SSH server running |
| Trillian | ⏳ Pending | N/A | Awaiting public key |
| Deep Thought | ⏳ Pending | N/A | Awaiting public key |
| Bistromath | ⏳ Pending | N/A | Awaiting public key |

---

## 🖥️ Server Configuration

### SSH Service Status
```
Service: sshd
Status: Running
Start Type: Automatic
Firewall: OpenSSH-Server-In-TCP (Port 22) - ALLOW
```

### Key Files Location
- **Private Key:** `C:\Users\Admin\.ssh\id_rsa`
- **Public Key:** `C:\Users\Admin\.ssh\id_rsa.pub`
- **Authorized Keys:** `C:\Users\Admin\.ssh\authorized_keys`

### Permissions
- `authorized_keys`: Read-only for Admin (inherited permissions removed)
- `id_rsa`: Read-only for Admin (inherited permissions removed)

---

## 🔌 How to Add Team Members

### For Each New Team Member:

1. **Generate SSH key** (on their machine):
   ```powershell
   ssh-keygen -t rsa -b 4096 -C "username@hostname"
   ```

2. **Share public key** (have them run):
   ```powershell
   Get-Content ~/.ssh/id_rsa.pub
   ```

3. **Add to authorized_keys** on Marvin:
   - Edit `C:\Users\Admin\.ssh\authorized_keys`
   - Add their public key on a new line
   - Replace the placeholder comment

4. **Test connection**:
   ```powershell
   ssh Admin@<marvin-ip>
   ```

---

## 🧪 Testing Connectivity

### From Another Machine to Marvin:
```powershell
ssh Admin@<MARVIN_IP_ADDRESS>
```

### Find Marvin's IP:
```powershell
ipconfig | findstr "IPv4"
```

### Test SSH Locally:
```powershell
ssh -i ~/.ssh/id_rsa Admin@localhost
```

---

## 🛡️ Security Notes

- Password authentication is disabled (key-only)
- Firewall allows SSH only on port 22
- Private keys are protected with restrictive permissions
- Authorized keys file is read-only

---

## 📁 Files Modified

1. `C:\Users\Admin\.ssh\id_rsa` - Private key (generated)
2. `C:\Users\Admin\.ssh\id_rsa.pub` - Public key (generated)
3. `C:\Users\Admin\.ssh\authorized_keys` - Team access keys (created)

---

## 🚀 Quick Commands

```powershell
# Check SSH service
Get-Service sshd

# Restart SSH service
Restart-Service sshd

# View authorized keys
Get-Content ~/.ssh/authorized_keys

# Test SSH locally
ssh Admin@localhost

# Get this machine's IP
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Ethernet*" -or $_.InterfaceAlias -like "*Wi-Fi*"}).IPAddress
```

---

## 📝 Next Steps

1. ☐ Collect public keys from Trillian, Deep Thought, and Bistromath
2. ☐ Add their keys to `~/.ssh/authorized_keys`
3. ☐ Test connectivity from each machine
4. ☐ Consider setting up SSH config for easier access

---

*"In an infinite universe, the best security is knowing who has the keys."*
