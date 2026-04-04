$WshShell = New-Object -comObject WScript.Shell

# Recovery shortcut
$Shortcut0 = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Marvin Recovery.lnk")
$Shortcut0.TargetPath = "node"
$Shortcut0.Arguments = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\auto-recovery.js --manual"
$Shortcut0.WorkingDirectory = "C:\Users\Admin\.openclaw\workspace\marvin-dash"
$Shortcut0.IconLocation = "C:\Windows\System32\shell32.dll, 81"
$Shortcut0.Description = "Marvin Auto-Recovery - Manual Trigger"
$Shortcut0.Save()

# Restore shortcut
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Marvin Restore.lnk")
$Shortcut.TargetPath = "node"
$Shortcut.Arguments = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\backup.js --restore"
$Shortcut.WorkingDirectory = "C:\Users\Admin\.openclaw\workspace\marvin-dash"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll, 238"
$Shortcut.Description = "Restore Marvin from last backup"
$Shortcut.Save()

# List Backups shortcut
$Shortcut2 = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Marvin List Backups.lnk")
$Shortcut2.TargetPath = "node"
$Shortcut2.Arguments = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\backup.js --list"
$Shortcut2.WorkingDirectory = "C:\Users\Admin\.openclaw\workspace\marvin-dash"
$Shortcut2.IconLocation = "C:\Windows\System32\shell32.dll, 3"
$Shortcut2.Description = "List available Marvin backups"
$Shortcut2.Save()

# Backup Now shortcut
$Shortcut3 = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Marvin Backup Now.lnk")
$Shortcut3.TargetPath = "node"
$Shortcut3.Arguments = "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\backup.js --now"
$Shortcut3.WorkingDirectory = "C:\Users\Admin\.openclaw\workspace\marvin-dash"
$Shortcut3.IconLocation = "C:\Windows\System32\shell32.dll, 259"
$Shortcut3.Description = "Create manual backup of Marvin"
$Shortcut3.Save()

Write-Host "Desktop shortcuts created successfully"
