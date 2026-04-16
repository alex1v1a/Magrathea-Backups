# File System Watcher for F:\memo
# Triggers sync when files are created or modified
# Runs continuously in background

param(
    [string]$SourceDir = "F:\memo",
    [string]$DestDir = "C:\Users\admin\iCloudDrive\Documents\NJNEER\Alexander\Work\Notes\Memos",
    [string]$LogFile = "C:\Users\admin\.openclaw\workspace\logs\memo-sync.log"
)

# Ensure log directory exists
$logDir = Split-Path $LogFile -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

# Audio extensions to exclude
$audioExtensions = @('.m4a', '.mp3', '.wav', '.ogg', '.webm', '.mp4', '.mov', '.aac', '.flac', '.wma', '.aiff', '.m4p')

function Sync-Files {
    Write-Log "Sync triggered..."
    
    # Ensure destination exists
    if (!(Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    }
    
    # Get all non-audio files from source
    $files = Get-ChildItem -Path $SourceDir -File -ErrorAction SilentlyContinue | Where-Object {
        $audioExtensions -notcontains $_.Extension.ToLower()
    }
    
    if ($files.Count -eq 0) {
        Write-Log "No non-audio files to sync."
        return
    }
    
    $synced = 0
    $skipped = 0
    
    foreach ($file in $files) {
        $destPath = Join-Path $DestDir $file.Name
        
        # Check if file exists and compare
        $shouldCopy = $true
        if (Test-Path $destPath) {
            $destFile = Get-Item $destPath
            if ($destFile.Length -eq $file.Length -and $destFile.LastWriteTime -ge $file.LastWriteTime) {
                $shouldCopy = $false
                $skipped++
            }
        }
        
        if ($shouldCopy) {
            try {
                Copy-Item -Path $file.FullName -Destination $destPath -Force
                Write-Log "SYNCED: $($file.Name)"
                $synced++
            }
            catch {
                Write-Log "ERROR: $($file.Name) - $_"
            }
        }
    }
    
    Write-Log "Sync complete. Synced: $synced | Skipped: $skipped"
}

# Create file system watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $SourceDir
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $false

# Check if source directory exists
if (!(Test-Path $SourceDir)) {
    Write-Log "ERROR: Source directory does not exist: $SourceDir"
    exit 1
}

Write-Log "=== Memo Sync Watcher Started ==="
Write-Log "Watching: $SourceDir"
Write-Log "Syncing to: $DestDir"
Write-Log "Excluded: $($audioExtensions -join ', ')"
Write-Log ""

# Initial sync
Write-Log "Running initial sync..."
Sync-Files

# Prepare message data for event handlers (passing context)
$eventData = @{
    SourceDir = $SourceDir
    DestDir = $DestDir
    LogFile = $LogFile
    AudioExtensions = $audioExtensions
}

# Register events with MessageData
$onCreated = Register-ObjectEvent -InputObject $watcher -EventName Created -MessageData $eventData -Action {
    $ext = [System.IO.Path]::GetExtension($Event.SourceEventArgs.Name).ToLower()
    if ($Event.MessageData.AudioExtensions -notcontains $ext) {
        $name = $Event.SourceEventArgs.Name
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "[$timestamp] File created: $name" | Add-Content -Path $Event.MessageData.LogFile
        Start-Sleep -Milliseconds 500
        # Inline sync logic since we can't call outer scope function
        & "$PSScriptRoot\sync-memo-files.ps1" -SourceDir $Event.MessageData.SourceDir -DestDir $Event.MessageData.DestDir -LogFile $Event.MessageData.LogFile 2>&1 | Add-Content -Path $Event.MessageData.LogFile
    }
}

$onChanged = Register-ObjectEvent -InputObject $watcher -EventName Changed -MessageData $eventData -Action {
    $ext = [System.IO.Path]::GetExtension($Event.SourceEventArgs.Name).ToLower()
    if ($Event.MessageData.AudioExtensions -notcontains $ext) {
        $name = $Event.SourceEventArgs.Name
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "[$timestamp] File changed: $name" | Add-Content -Path $Event.MessageData.LogFile
        Start-Sleep -Milliseconds 500
        & "$PSScriptRoot\sync-memo-files.ps1" -SourceDir $Event.MessageData.SourceDir -DestDir $Event.MessageData.DestDir -LogFile $Event.MessageData.LogFile 2>&1 | Add-Content -Path $Event.MessageData.LogFile
    }
}

$onRenamed = Register-ObjectEvent -InputObject $watcher -EventName Renamed -MessageData $eventData -Action {
    $name = $Event.SourceEventArgs.Name
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] File renamed: $name" | Add-Content -Path $Event.MessageData.LogFile
    & "$PSScriptRoot\sync-memo-files.ps1" -SourceDir $Event.MessageData.SourceDir -DestDir $Event.MessageData.DestDir -LogFile $Event.MessageData.LogFile 2>&1 | Add-Content -Path $Event.MessageData.LogFile
}

# Enable watching
try {
    $watcher.EnableRaisingEvents = $true
    Write-Log "Watcher active. Press Ctrl+C to stop."
    
    # Keep running with cleanup on exit
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Log "Shutting down watcher..."
    $watcher.EnableRaisingEvents = $false
    Unregister-Event -SourceIdentifier $onCreated.Name -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier $onChanged.Name -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier $onRenamed.Name -ErrorAction SilentlyContinue
    $watcher.Dispose()
    Write-Log "Watcher stopped."
}
