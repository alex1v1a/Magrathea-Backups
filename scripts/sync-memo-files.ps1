# One-Way Sync Script: F:\memo to iCloud Notes
# Excludes voice/audio files, syncs documents/images/text only

param(
    [string]$SourceDir = "F:\memo",
    [string]$DestDir = "C:\Users\admin\iCloudDrive\Documents\NJNEER\Alexander\Work\Notes\Memos",
    [switch]$WhatIf = $false
)

# Audio extensions to exclude
$audioExtensions = @('.m4a', '.mp3', '.wav', '.ogg', '.webm', '.mp4', '.mov', '.aac', '.flac', '.wma', '.aiff', '.m4p')

# Ensure destination exists
if (!(Test-Path $DestDir)) {
    Write-Host "Creating destination directory: $DestDir"
    if (!$WhatIf) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    }
}

Write-Host "One-Way Sync: $SourceDir -> $DestDir"
Write-Host "Excluding audio files: $($audioExtensions -join ', ')"
Write-Host ""

# Get all non-audio files from source
$files = Get-ChildItem -Path $SourceDir -File | Where-Object {
    $ext = $_.Extension.ToLower()
    $audioExtensions -notcontains $ext
}

if ($files.Count -eq 0) {
    Write-Host "No non-audio files to sync."
    exit 0
}

Write-Host "Found $($files.Count) file(s) to sync."
Write-Host ""

$synced = 0
$skipped = 0

foreach ($file in $files) {
    $destPath = Join-Path $DestDir $file.Name
    
    # Check if file exists and compare sizes/dates
    $shouldCopy = $true
    if (Test-Path $destPath) {
        $destFile = Get-Item $destPath
        if ($destFile.Length -eq $file.Length -and $destFile.LastWriteTime -ge $file.LastWriteTime) {
            $shouldCopy = $false
            $skipped++
            Write-Host "[SKIP] $($file.Name) (up to date)" -ForegroundColor Gray
        }
    }
    
    if ($shouldCopy) {
        if ($WhatIf) {
            Write-Host "[WOULD COPY] $($file.Name)" -ForegroundColor Cyan
        } else {
            try {
                Copy-Item -Path $file.FullName -Destination $destPath -Force
                Write-Host "[SYNC] $($file.Name)" -ForegroundColor Green
                $synced++
            }
            catch {
                Write-Host "[ERROR] $($file.Name): $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "Sync complete."
Write-Host "Synced: $synced | Skipped: $skipped"
