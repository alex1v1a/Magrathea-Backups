# Sync processed voice memo notes to iCloud
# Copies transcripts and summaries, excludes original audio

$sourceBase = "F:\memo\processed"
$destBase = "C:\Users\admin\iCloudDrive\Documents\NJNEER\Alexander\Work\Notes\Memos"

# Ensure destination exists
if (!(Test-Path $destBase)) {
    New-Item -ItemType Directory -Path $destBase -Force | Out-Null
}

# Audio extensions to exclude
$audioExtensions = @('.m4a', '.mp3', '.wav', '.ogg', '.webm', '.mp4', '.mov', '.aac', '.flac', '.wma', '.aiff', '.m4p')

Write-Host "Syncing processed voice memo notes..."
Write-Host "From: $sourceBase"
Write-Host "To: $destBase"
Write-Host ""

# Get all processed folders
$folders = Get-ChildItem -Path $sourceBase -Directory

$totalSynced = 0

foreach ($folder in $folders) {
    $folderName = $folder.Name
    $sourceFolder = $folder.FullName
    $destFolder = Join-Path $destBase $folderName
    
    # Create destination folder
    if (!(Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }
    
    # Get non-audio files from this folder (exclude original_audio subfolder)
    $files = Get-ChildItem -Path $sourceFolder -File | Where-Object {
        $audioExtensions -notcontains $_.Extension.ToLower()
    }
    
    $synced = 0
    
    foreach ($file in $files) {
        $destPath = Join-Path $destFolder $file.Name
        
        # Check if needs copying
        $shouldCopy = $true
        if (Test-Path $destPath) {
            $destFile = Get-Item $destPath
            if ($destFile.Length -eq $file.Length -and $destFile.LastWriteTime -ge $file.LastWriteTime) {
                $shouldCopy = $false
            }
        }
        
        if ($shouldCopy) {
            Copy-Item -Path $file.FullName -Destination $destPath -Force
            Write-Host "  [SYNC] $folderName\$($file.Name)" -ForegroundColor Green
            $synced++
            $totalSynced++
        } else {
            Write-Host "  [SKIP] $folderName\$($file.Name)" -ForegroundColor Gray
        }
    }
    
    if ($synced -gt 0) {
        Write-Host "  Folder '$folderName': $synced file(s) synced"
    }
}

Write-Host ""
Write-Host "Total files synced: $totalSynced"
