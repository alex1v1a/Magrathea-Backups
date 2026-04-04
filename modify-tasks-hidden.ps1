# Modify all scheduled tasks to run hidden
$tasks = @(
    "Marvin Auto Recovery",
    "Marvin Email Monitor", 
    "Marvin Backup",
    "WSL-24x7-Monitor",
    "Kanban-AutoRefresh"
)

Write-Host "Modifying scheduled tasks to run hidden..." -ForegroundColor Cyan
Write-Host "=" * 60

foreach ($taskName in $tasks) {
    Write-Host "`nTask: $taskName" -ForegroundColor Yellow
    
    try {
        # Get current task info
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
        
        # Modify to run hidden
        $task.Settings.Hidden = $true
        $task.Settings.RunOnlyIfNetworkAvailable = $false
        
        # If it's a batch file or cmd, wrap in PowerShell with hidden window
        $currentAction = $task.Actions[0].Execute
        $currentArgs = $task.Actions[0].Arguments
        
        if ($currentAction -match "cmd\.exe|bat$" -or $currentArgs -match "\.bat") {
            # Wrap in PowerShell with hidden window
            $newExecute = "powershell.exe"
            $newArgs = "-WindowStyle Hidden -ExecutionPolicy Bypass -Command `"$currentExecute $currentArgs`""
            
            # Update action
            $newAction = New-ScheduledTaskAction -Execute $newExecute -Argument $newArgs
            Set-ScheduledTask -TaskName $taskName -Action $newAction -Settings $task.Settings | Out-Null
        } else {
            # Just update settings to hidden
            Set-ScheduledTask -TaskName $taskName -Settings $task.Settings | Out-Null
        }
        
        Write-Host "  ✅ Modified to run hidden" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n" + "=" * 60
Write-Host "Task modification complete" -ForegroundColor Cyan
Write-Host "Note: Some tasks may require Administrator privileges" -ForegroundColor Yellow
