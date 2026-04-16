# Voice Memo Processor Script
# Monitors F:\memo, transcribes audio, generates structured notes

param(
    [string]$SourceDir = "F:\memo",
    [string]$OutputDir = "F:\memo\processed",
    [int]$StorageThresholdPercent = 80
)

# Ensure output directory exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Get OpenAI API Key from environment or config
$apiKey = $env:OPENAI_API_KEY
if (!$apiKey) {
    $configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $apiKey = $config.skills."openai-whisper-api".apiKey
    }
}

if (!$apiKey) {
    Write-Error "OpenAI API key not found. Set OPENAI_API_KEY or configure in openclaw.json"
    exit 1
}

# Audio file extensions to process
$audioExtensions = @('.m4a', '.mp3', '.wav', '.ogg', '.webm', '.mp4', '.mov', '.aac', '.flac')

# Function: Get F: drive usage percentage
function Get-DriveUsagePercent {
    $drive = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='F:'"
    if ($drive -and $drive.Size -gt 0) {
        return [math]::Round((($drive.Size - $drive.FreeSpace) / $drive.Size) * 100, 2)
    }
    return 0
}

# Function: Transcribe audio using Whisper API
function Transcribe-Audio {
    param([string]$AudioPath)
    
    $tempFile = [System.IO.Path]::GetTempFileName() + ".txt"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $apiKey"
        }
        
        $form = @{
            file = Get-Item -Path $AudioPath
            model = "whisper-1"
            response_format = "text"
        }
        
        $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/audio/transcriptions" `
            -Method Post -Headers $headers -Form $form
        
        $response | Out-File -FilePath $tempFile -Encoding UTF8
        return $tempFile
    }
    catch {
        Write-Error "Transcription failed: $_"
        if (Test-Path $tempFile) { Remove-Item $tempFile }
        return $null
    }
}

# Function: Generate structured summary using GPT
function Generate-Summary {
    param([string]$TranscriptPath)
    
    $transcript = Get-Content $TranscriptPath -Raw
    
    $prompt = @"
Analyze this voice memo transcript and provide structured output:

TRANSCRIPT:
$transcript

Provide exactly this format:

TITLE: [Concise 3-5 word title describing the main topic]

HIGH_LEVEL_SUMMARY:
[2-3 sentence summary of the entire memo]

DETAILED_NOTES:
- [Key point 1]
- [Key point 2]
- [Key point 3]
[Continue with all important points]

MEETING_MINUTES:
[If this is a meeting, include: decisions made, action items with owners, deadlines. If not a meeting, write "N/A - Not a meeting"]

PRIORITY: [High/Medium/Low based on urgency and importance]
"@

    try {
        $headers = @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
        }
        
        $body = @{
            model = "gpt-4o-mini"
            messages = @(
                @{ role = "user"; content = $prompt }
            )
            temperature = 0.3
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" `
            -Method Post -Headers $headers -Body $body
        
        return $response.choices[0].message.content
    }
    catch {
        Write-Error "Summary generation failed: $_"
        return $null
    }
}

# Function: Parse GPT output into structured object
function Parse-SummaryOutput {
    param([string]$SummaryText)
    
    $result = @{
        Title = "Untitled_Memo"
        HighLevelSummary = ""
        DetailedNotes = ""
        MeetingMinutes = ""
        Priority = "Medium"
    }
    
    # Extract title
    if ($SummaryText -match "TITLE:\s*(.+)") {
        $result.Title = ($matches[1] -replace '\s+', '_').Trim()
    }
    
    # Extract high-level summary
    if ($SummaryText -match "HIGH_LEVEL_SUMMARY:\s*\n?(.+?)(?=\n\n|DETAILED_NOTES:)") {
        $result.HighLevelSummary = $matches[1].Trim()
    }
    
    # Extract detailed notes
    if ($SummaryText -match "DETAILED_NOTES:\s*\n?(.+?)(?=\n\n|MEETING_MINUTES:)") {
        $result.DetailedNotes = $matches[1].Trim()
    }
    
    # Extract meeting minutes
    if ($SummaryText -match "MEETING_MINUTES:\s*\n?(.+?)(?=\n\n|PRIORITY:)") {
        $result.MeetingMinutes = $matches[1].Trim()
    }
    
    # Extract priority
    if ($SummaryText -match "PRIORITY:\s*(High|Medium|Low)") {
        $result.Priority = $matches[1].Trim()
    }
    
    return $result
}

# Function: Clean filename for filesystem
function Get-SafeFolderName {
    param([string]$Name, [datetime]$Date)
    
    $datePrefix = $Date.ToString("yyyy-MM-dd")
    $cleanName = $Name -replace '[<>:"/\\|?*]', '_'
    $cleanName = $cleanName -replace '\.+', '.'
    $cleanName = $cleanName.Trim('_', '.', ' ')
    
    if ($cleanName.Length -gt 50) {
        $cleanName = $cleanName.Substring(0, 50)
    }
    
    return "$datePrefix`_$cleanName"
}

# Function: Manage storage - remove audio files when threshold reached
function Manage-Storage {
    param([string]$ProcessedDir, [int]$Threshold)
    
    $currentUsage = Get-DriveUsagePercent
    Write-Host "Current F: drive usage: $currentUsage% (threshold: $Threshold%)"
    
    if ($currentUsage -lt $Threshold) {
        return
    }
    
    Write-Host "Storage threshold exceeded. Cleaning up audio files..."
    
    # Find all memo folders with original audio still present
    $folders = Get-ChildItem -Path $ProcessedDir -Directory | ForEach-Object {
        $metadataPath = Join-Path $_.FullName "metadata.json"
        $audioPath = Join-Path $_.FullName "original_audio"
        
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            [PSCustomObject]@{
                Folder = $_
                Priority = $metadata.Priority
                ProcessedDate = [datetime]$metadata.ProcessedDate
                AudioSize = if (Test-Path $audioPath) { (Get-ChildItem $audioPath | Measure-Object -Property Length -Sum).Sum } else { 0 }
            }
        }
    } | Where-Object { $_.AudioSize -gt 0 }
    
    # Sort by priority (Low first) then by date (oldest first)
    $sortedFolders = $folders | Sort-Object @{Expression={
        switch($_.Priority) {
            "Low" { 3 }
            "Medium" { 2 }
            "High" { 1 }
            default { 2 }
        }
    }, ProcessedDate}
    
    $freedSpace = 0
    $targetFree = 5GB  # Aim to free at least 5GB
    
    foreach ($item in $sortedFolders) {
        if ($freedSpace -ge $targetFree) { break }
        
        $audioDir = Join-Path $item.Folder.FullName "original_audio"
        if (Test-Path $audioDir) {
            $size = $item.AudioSize
            Remove-Item -Path $audioDir -Recurse -Force
            $freedSpace += $size
            Write-Host "Removed audio from: $($item.Folder.Name) (freed $([math]::Round($size/1MB,2)) MB)"
        }
    }
    
    Write-Host "Freed total: $([math]::Round($freedSpace/1MB,2)) MB"
}

# Main processing loop
Write-Host "Voice Memo Processor Started"
Write-Host "Source: $SourceDir"
Write-Host "Output: $OutputDir"
Write-Host "Storage Threshold: $StorageThresholdPercent%"
Write-Host ""

# Check storage and cleanup if needed
Manage-Storage -ProcessedDir $OutputDir -Threshold $StorageThresholdPercent

# Find unprocessed audio files
$audioFiles = Get-ChildItem -Path $SourceDir -File | Where-Object {
    $audioExtensions -contains $_.Extension.ToLower()
}

if ($audioFiles.Count -eq 0) {
    Write-Host "No new audio files to process."
    exit 0
}

Write-Host "Found $($audioFiles.Count) audio file(s) to process."

foreach ($file in $audioFiles) {
    Write-Host ""
    Write-Host "Processing: $($file.Name)"
    
    # Transcribe
    $transcriptFile = Transcribe-Audio -AudioPath $file.FullName
    if (!$transcriptFile) {
        Write-Error "Failed to transcribe: $($file.Name)"
        continue
    }
    
    # Generate summary
    $summaryOutput = Generate-Summary -TranscriptPath $transcriptFile
    if (!$summaryOutput) {
        Write-Error "Failed to generate summary: $($file.Name)"
        Remove-Item $transcriptFile
        continue
    }
    
    # Parse structured output
    $parsed = Parse-SummaryOutput -SummaryText $summaryOutput
    
    # Create folder with safe name
    $folderName = Get-SafeFolderName -Name $parsed.Title -Date $file.LastWriteTime
    $folderPath = Join-Path $OutputDir $folderName
    
    # Handle duplicates
    $counter = 1
    $originalFolderName = $folderName
    while (Test-Path $folderPath) {
        $folderName = "$originalFolderName`_($counter)"
        $folderPath = Join-Path $OutputDir $folderName
        $counter++
    }
    
    New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
    
    # Move original audio to subfolder
    $audioDestDir = Join-Path $folderPath "original_audio"
    New-Item -ItemType Directory -Path $audioDestDir -Force | Out-Null
    Move-Item -Path $file.FullName -Destination (Join-Path $audioDestDir $file.Name)
    
    # Save transcript
    Move-Item -Path $transcriptFile -Destination (Join-Path $folderPath "transcript.txt")
    
    # Create summary markdown
    $summaryMd = @"# $($parsed.Title -replace '_', ' ')

**Date:** $($file.LastWriteTime.ToString("yyyy-MM-dd HH:mm"))  
**Duration:** $([math]::Round($file.Length / 16000, 1)) minutes (estimated)  
**Priority:** $($parsed.Priority)

## High-Level Summary

$($parsed.HighLevelSummary)

## Detailed Notes

$($parsed.DetailedNotes)

## Meeting Minutes

$($parsed.MeetingMinutes)

---
*Processed: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*
"@
    
    $summaryMd | Out-File -FilePath (Join-Path $folderPath "summary.md") -Encoding UTF8
    
    # Save metadata
    $metadata = @{
        OriginalFileName = $file.Name
        RecordedDate = $file.LastWriteTime.ToString("o")
        ProcessedDate = (Get-Date).ToString("o")
        FileSize = $file.Length
        Priority = $parsed.Priority
        Title = $parsed.Title
    } | ConvertTo-Json
    
    $metadata | Out-File -FilePath (Join-Path $folderPath "metadata.json") -Encoding UTF8
    
    Write-Host "  Created: $folderName"
    Write-Host "  Title: $($parsed.Title)"
    Write-Host "  Priority: $($parsed.Priority)"
}

Write-Host ""
Write-Host "Processing complete."

# Final storage check
$finalUsage = Get-DriveUsagePercent
Write-Host "F: drive usage: $finalUsage%"
