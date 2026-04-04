# Paper Trail Blog Automation - Task Scheduler Setup
# Run this script to set up automated blog posting

Write-Host "Setting up Paper Trail Blog Automation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Create the blog automation task
$taskName = "PaperTrailBlogPost"
$taskDescription = "Automated blog post generation for Paper Trail Limited"

# Remove existing task if exists
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Create trigger for random times between 8am-4pm (max 3 times)
$triggers = @()

# Morning post (8am-11am)
$morningTrigger = New-ScheduledTaskTrigger -Daily -At "08:00"
$triggers += $morningTrigger

# Midday post (11am-2pm)  
$middayTrigger = New-ScheduledTaskTrigger -Daily -At "12:00"
$triggers += $middayTrigger

# Afternoon post (2pm-4pm)
$afternoonTrigger = New-ScheduledTaskTrigger -Daily -At "15:00"
$triggers += $afternoonTrigger

# Action - run the blog automation script
$workspacePath = "$env:USERPROFILE\.openclaw\workspace"
$action = New-ScheduledTaskAction -Execute "node" -Argument "$workspacePath\paper-trail-website\scripts\blog-automation.js" -WorkingDirectory $workspacePath

# Settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $triggers -Settings $settings -Force

Write-Host "Task created: $taskName" -ForegroundColor Green
Write-Host ""
Write-Host "Schedule:" -ForegroundColor Yellow
Write-Host "  - 8:00 AM (Morning post)"
Write-Host "  - 12:00 PM (Midday post)"  
Write-Host "  - 3:00 PM (Afternoon post)"
Write-Host ""
Write-Host "To modify: Open Task Scheduler and look for PaperTrailBlogPost"
