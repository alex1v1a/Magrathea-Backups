# Daily Website Backup - 1AM
$taskName = "PaperTrailDailyBackup"
$taskDescription = "Daily backup of Paper Trail website (keeps 30 days rolling history)"

# Remove existing task
Unregister-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

# Create trigger for 1:00 AM daily
$trigger = New-ScheduledTaskTrigger -Daily -At "01:00"

# Action - run backup script
$workspacePath = "$env:USERPROFILE\.openclaw\workspace\paper-trail-website"
$action = New-ScheduledTaskAction -Execute "node" -Argument "$workspacePath\scripts\backup-system.js backup" -WorkingDirectory $workspacePath

# Settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register task
Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -Settings $settings -Force

Write-Host "Daily backup scheduled for 1:00 AM"
Write-Host "Backups stored in: backups/site-history/"
Write-Host "Keeps rolling 30-day history"
