# Debug CMD Pop-ups
Write-Host "🔍 Debugging CMD Windows That Keep Popping Up" -ForegroundColor Cyan
Write-Host "=" * 60

# 1. Check currently running CMD processes
Write-Host "`n1. Currently Running CMD Processes:" -ForegroundColor Yellow
Get-Process cmd -ErrorAction SilentlyContinue | ForEach-Object {
    $process = $_
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)" | Select-Object -ExpandProperty ParentProcessId
    $parentName = (Get-Process -Id $parent -ErrorAction SilentlyContinue).ProcessName
    
    [PSCustomObject]@{
        PID = $process.Id
        StartTime = $process.StartTime
        ParentProcess = $parentName
        ParentPID = $parent
    }
} | Format-Table -AutoSize

# 2. Check Scheduled Tasks that use CMD
Write-Host "`n2. Scheduled Tasks Using CMD:" -ForegroundColor Yellow
$tasks = schtasks /Query /FO CSV 2>$null | ConvertFrom-Csv | Where-Object { 
    $_ -and 
    ($_.'Task To Run' -like "*cmd.exe*" -or $_.'Task To Run' -like "*.bat*") -and 
    $_.State -eq "Enabled" 
}

$tasks | Select-Object -First 10 TaskName, 'Next Run Time', @{N='Command';E={$_.'Task To Run'.Substring(0, [Math]::Min(60, $_.'Task To Run'.Length))}} | Format-Table -AutoSize

# 3. Check most recently run tasks
Write-Host "`n3. Recently Run Tasks (Last 1 Hour):" -ForegroundColor Yellow
$recentTasks = schtasks /Query /FO CSV 2>$null | ConvertFrom-Csv | Where-Object { 
    $_ -and $_.'Last Run Time' -and $_.'Last Run Time' -ne 'N/A'
} | ForEach-Object {
    try {
        $lastRun = [DateTime]::Parse($_.'Last Run Time')
        if ($lastRun -gt (Get-Date).AddHours(-1)) {
            $_
        }
    } catch {}
}

$recentTasks | Select-Object -First 5 TaskName, 'Last Run Time', State | Format-Table -AutoSize

# 4. Check Windows Event Log for process starts
Write-Host "`n4. Recent CMD Process Starts (Event Log):" -ForegroundColor Yellow
try {
    Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4688} -MaxEvents 10 -ErrorAction SilentlyContinue | 
        Where-Object { $_.Message -like "*cmd.exe*" } |
        Select-Object TimeCreated, @{N='Command';E={$_.Properties[8].Value}} |
        Format-Table -AutoSize
} catch {
    Write-Host "   (Security log requires admin rights)" -ForegroundColor Gray
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "To STOP the CMD pop-ups, run:" -ForegroundColor Green
Write-Host "  schtasks /Change /TN 'TASKNAME' /DISABLE" -ForegroundColor Yellow
