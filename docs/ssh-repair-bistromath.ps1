# SSH Repair Script for Bistromath
# Run in elevated PowerShell

# 1. Backup and clean administrators_authorized_keys
$adminKeys = "C:\ProgramData\ssh\administrators_authorized_keys"
$backup = "$adminKeys.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $adminKeys $backup -Force

# 2. Get unique keys only
$uniqueKeys = Get-Content $adminKeys | Where-Object { $_.Trim() -ne '' } | Select-Object -Unique

# 3. Write clean file
$uniqueKeys | Set-Content $adminKeys -Force

# 4. Set proper permissions (SYSTEM and Administrators only)
icacls $adminKeys /inheritance:r
icacls $adminKeys /grant "SYSTEM:F"
icacls $adminKeys /grant "Administrators:F"
icacls $adminKeys /remove "Everyone" 2>$null
icacls $adminKeys /remove "Users" 2>$null

# 5. Verify
Write-Host "=== File contents ===" -ForegroundColor Green
Get-Content $adminKeys
Write-Host "=== Permissions ===" -ForegroundColor Green
icacls $adminKeys

# 6. Restart SSHD
Restart-Service sshd
Write-Host "SSHD restarted!" -ForegroundColor Green
