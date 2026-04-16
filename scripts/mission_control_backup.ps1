# Vectarr Mission Control - Backup & Restore Script
#
# Handles backup and restore of:
#   - Mission Control dashboard files (HTML, CSS, JS)
#   - SQLite database (when implemented)
#   - Configuration files
#   - Log archives
#
# Usage:
#   .\mission_control_backup.ps1 -Action backup          # Create a full backup
#   .\mission_control_backup.ps1 -Action backup -Type db  # Backup only database
#   .\mission_control_backup.ps1 -Action restore          # List and restore from backup
#   .\mission_control_backup.ps1 -Action list             # List all backups
#   .\mission_control_backup.ps1 -Action cleanup          # Remove old backups
#
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backup", "restore", "list", "cleanup", "verify")]
    [string]$Action = "backup",
    
    [ValidateSet("full", "db", "config", "logs")]
    [string]$Type = "full",
    
    [string]$BackupDir = "$PSScriptRoot\..\mission-control\backups",
    [string]$MissionControlDir = "$PSScriptRoot\..\mission-control",
    [string]$DataDir = "$PSScriptRoot\..\data",
    [string]$LogDir = "$PSScriptRoot\..\logs\mission-control",
    
    [string]$RestoreFile,           # Specific backup file to restore
    [int]$KeepDays = 30,            # Days to keep backups (for cleanup)
    [switch]$Compress = $true,      # Compress backups with ZIP
    [switch]$Verify = $true,        # Verify backup integrity
    [string]$RemoteBackupPath       # Optional: network path for secondary backup
)

# Configuration
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "mission_control_$Type`_$Timestamp"
$SQLiteDbPath = "$DataDir\mission_control.db"

function Initialize-BackupEnvironment {
    <#
    .SYNOPSIS
        Ensures backup directory structure exists
    #>
    Write-Host "Initializing backup environment..." -ForegroundColor Cyan
    
    # Create backup directory structure
    @($BackupDir, "$BackupDir\archives", "$BackupDir\logs") | ForEach-Object {
        if (!(Test-Path $_)) {
            New-Item -ItemType Directory -Force -Path $_ | Out-Null
            Write-Host "  Created: $_" -ForegroundColor Gray
        }
    }
}

function Write-BackupLog {
    <#
    .SYNOPSIS
        Writes timestamped message to backup log
    #>
    param([string]$Message, [string]$Level = "INFO")
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogFile = "$BackupDir\logs\backup_$(Get-Date -Format 'yyyyMM').log"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue
    
    $Color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host $LogEntry -ForegroundColor $Color
}

function Get-BackupManifest {
    <#
    .SYNOPSIS
        Creates a manifest of files to backup
    #>
    param([string]$BackupType)
    
    $Manifest = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Type = $BackupType
        Version = "1.0"
        Files = @()
    }
    
    # Determine which files to include based on backup type
    switch ($BackupType) {
        "full" {
            # Dashboard files
            if (Test-Path $MissionControlDir) {
                $DashboardFiles = Get-ChildItem -Path $MissionControlDir -File | Where-Object { 
                    $_.Name -notin @('backups') 
                }
                $Manifest.Files += $DashboardFiles | Select-Object Name, Length, LastWriteTime, FullName, @{N="Category";E={"dashboard"}}
            }
            
            # Database (if exists)
            if (Test-Path $SQLiteDbPath) {
                $DbFile = Get-Item $SQLiteDbPath
                $Manifest.Files += $DbFile | Select-Object Name, Length, LastWriteTime, FullName, @{N="Category";E={"database"}}
            }
            
            # Configuration
            $ConfigFiles = @(
                "$PSScriptRoot\mission_control_service.ps1"
            ) | Where-Object { Test-Path $_ }
            
            foreach ($File in $ConfigFiles) {
                $Item = Get-Item $File
                $Manifest.Files += $Item | Select-Object Name, Length, LastWriteTime, FullName, @{N="Category";E={"config"}}
            }
        }
        
        "db" {
            if (Test-Path $SQLiteDbPath) {
                $DbFile = Get-Item $SQLiteDbPath
                $Manifest.Files += $DbFile | Select-Object Name, Length, LastWriteTime, FullName, @{N="Category";E={"database"}}
            } else {
                Write-BackupLog "No SQLite database found at $SQLiteDbPath" "WARN"
                Write-BackupLog "Current Mission Control uses static files only" "INFO"
            }
        }
        
        "config" {
            $ConfigFiles = @(
                "$PSScriptRoot\mission_control_service.ps1",
                "$PSScriptRoot\mission_control_backup.ps1",
                "$MissionControlDir\server.ps1",
                "$MissionControlDir\start.bat"
            ) | Where-Object { Test-Path $_ }
            
            foreach ($File in $ConfigFiles) {
                $Item = Get-Item $File
                $Manifest.Files += $Item | Select-Object Name, Length, LastWriteTime, FullName, @{N="Category";E={"config"}}
            }
        }
        
        "logs" {
            if (Test-Path $LogDir) {
                $LogFiles = Get-ChildItem -Path $LogDir -Recurse -File
                $Manifest.Files += $LogFiles | Select-Object Name, Length, LastWriteTime, FullName, @{N="Category";E={"logs"}}
            }
        }
    }
    
    return $Manifest
}

function Invoke-MissionControlBackup {
    <#
    .SYNOPSIS
        Creates a backup of Mission Control data
    #>
    param([string]$BackupType)
    
    Write-Host ""
    Write-Host "=== Creating Mission Control Backup ===" -ForegroundColor Cyan
    Write-Host "Type: $BackupType" -ForegroundColor Gray
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    Initialize-BackupEnvironment
    
    $BackupPath = "$BackupDir\$BackupName"
    $TempPath = "$env:TEMP\$BackupName"
    
    try {
        # Create temporary staging directory
        if (Test-Path $TempPath) {
            Remove-Item -Path $TempPath -Recurse -Force
        }
        New-Item -ItemType Directory -Force -Path $TempPath | Out-Null
        
        # Get manifest of files to backup
        $Manifest = Get-BackupManifest -BackupType $BackupType
        
        if ($Manifest.Files.Count -eq 0) {
            Write-BackupLog "No files to backup for type: $BackupType" "WARN"
            return $null
        }
        
        Write-BackupLog "Backing up $($Manifest.Files.Count) files..."
        
        # Copy files to staging area
        $CopiedSize = 0
        $CopiedCount = 0
        
        foreach ($File in $Manifest.Files) {
            try {
                $DestDir = Join-Path $TempPath $File.Category
                if (!(Test-Path $DestDir)) {
                    New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
                }
                
                Copy-Item -Path $File.FullName -Destination $DestDir -Force
                $CopiedSize += $File.Length
                $CopiedCount++
                
                Write-Verbose "Copied: $($File.Name)"
            } catch {
                Write-BackupLog "Failed to copy $($File.Name): $_" "ERROR"
            }
        }
        
        # Save manifest
        $Manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath "$TempPath\manifest.json" -Encoding UTF8
        
        # Create compressed archive
        if ($Compress) {
            $ArchivePath = "$BackupDir\archives\$BackupName.zip"
            Compress-Archive -Path "$TempPath\*" -DestinationPath $ArchivePath -Force
            $FinalSize = (Get-Item $ArchivePath).Length
            
            Write-BackupLog "Created compressed archive: $ArchivePath" "SUCCESS"
            Write-BackupLog "Original size: $([math]::Round($CopiedSize/1MB, 2)) MB"
            Write-BackupLog "Archive size: $([math]::Round($FinalSize/1MB, 2)) MB"
            
            # Cleanup staging
            Remove-Item -Path $TempPath -Recurse -Force
            
            $Result = $ArchivePath
        } else {
            # Keep uncompressed
            Move-Item -Path $TempPath -Destination $BackupPath
            Write-BackupLog "Created backup: $BackupPath" "SUCCESS"
            $Result = $BackupPath
        }
        
        # Verify backup if requested
        if ($Verify) {
            Write-BackupLog "Verifying backup integrity..."
            $VerifyResult = Test-BackupIntegrity -BackupPath $Result
            if ($VerifyResult) {
                Write-BackupLog "Backup verification: PASSED" "SUCCESS"
            } else {
                Write-BackupLog "Backup verification: FAILED" "ERROR"
                return $null
            }
        }
        
        # Copy to remote location if specified
        if ($RemoteBackupPath) {
            try {
                Copy-Item -Path $Result -Destination $RemoteBackupPath -Force
                Write-BackupLog "Copied to remote backup: $RemoteBackupPath" "SUCCESS"
            } catch {
                Write-BackupLog "Failed to copy to remote: $_" "ERROR"
            }
        }
        
        # Return backup info
        $BackupInfo = [PSCustomObject]@{
            Path = $Result
            Type = $BackupType
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            FileCount = $CopiedCount
            SizeBytes = $FinalSize
        }
        
        return $BackupInfo
        
    } catch {
        Write-BackupLog "Backup failed: $_" "ERROR"
        return $null
    }
}

function Test-BackupIntegrity {
    <#
    .SYNOPSIS
        Verifies backup file integrity
    #>
    param([string]$BackupPath)
    
    try {
        if ($BackupPath -like "*.zip") {
            # Test ZIP integrity
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $Zip = [System.IO.Compression.ZipFile]::OpenRead($BackupPath)
            $Entries = $Zip.Entries.Count
            $Zip.Dispose()
            
            if ($Entries -gt 0) {
                return $true
            }
        } else {
            # Test directory
            $Files = Get-ChildItem -Path $BackupPath -Recurse -File
            $Manifest = Get-Content "$BackupPath\manifest.json" -Raw | ConvertFrom-Json
            
            if ($Files.Count -ge $Manifest.Files.Count) {
                return $true
            }
        }
        return $false
    } catch {
        return $false
    }
}

function Restore-MissionControlBackup {
    <#
    .SYNOPSIS
        Restores Mission Control from a backup
    #>
    param([string]$RestoreFilePath)
    
    Write-Host ""
    Write-Host "=== Restoring Mission Control from Backup ===" -ForegroundColor Cyan
    Write-Host ""
    
    # List available backups if no file specified
    if (!$RestoreFilePath) {
        $Backups = Get-ChildItem -Path "$BackupDir\archives" -Filter "*.zip" -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending
        
        if ($Backups.Count -eq 0) {
            Write-BackupLog "No backups found in $BackupDir\archives" "ERROR"
            return
        }
        
        Write-Host "Available backups:" -ForegroundColor Yellow
        for ($i = 0; $i -lt $Backups.Count; $i++) {
            $SizeMB = [math]::Round($Backups[$i].Length / 1MB, 2)
            Write-Host "  [$i] $($Backups[$i].Name) ($SizeMB MB) - $($Backups[$i].LastWriteTime)"
        }
        
        Write-Host ""
        $Selection = Read-Host "Enter number of backup to restore (or 'c' to cancel)"
        
        if ($Selection -eq 'c') {
            Write-BackupLog "Restore cancelled by user" "INFO"
            return
        }
        
        $SelectedIndex = [int]$Selection
        if ($SelectedIndex -ge 0 -and $SelectedIndex -lt $Backups.Count) {
            $RestoreFilePath = $Backups[$SelectedIndex].FullName
        } else {
            Write-BackupLog "Invalid selection" "ERROR"
            return
        }
    }
    
    if (!(Test-Path $RestoreFilePath)) {
        Write-BackupLog "Backup file not found: $RestoreFilePath" "ERROR"
        return
    }
    
    # Confirm restore
    Write-Host ""
    Write-Host "WARNING: This will overwrite existing Mission Control files!" -ForegroundColor Red -BackgroundColor Black
    $Confirm = Read-Host "Type 'RESTORE' to confirm"
    
    if ($Confirm -ne "RESTORE") {
        Write-BackupLog "Restore cancelled" "INFO"
        return
    }
    
    try {
        # Extract backup
        $TempExtract = "$env:TEMP\mission_control_restore_$(Get-Random)"
        Write-BackupLog "Extracting backup to: $TempExtract"
        Expand-Archive -Path $RestoreFilePath -DestinationPath $TempExtract -Force
        
        # Read manifest
        $Manifest = Get-Content "$TempExtract\manifest.json" -Raw | ConvertFrom-Json
        Write-BackupLog "Backup contains $($Manifest.Files.Count) files"
        
        # Stop service if running
        $Service = Get-Service -Name "VectarrMissionControl" -ErrorAction SilentlyContinue
        if ($Service -and $Service.Status -eq "Running") {
            Write-BackupLog "Stopping Mission Control service..."
            Stop-Service -Name "VectarrMissionControl" -Force
            Start-Sleep -Seconds 2
        }
        
        # Restore files by category
        foreach ($Category in @("dashboard", "database", "config")) {
            $CategoryPath = Join-Path $TempExtract $Category
            if (Test-Path $CategoryPath) {
                $CategoryFiles = Get-ChildItem -Path $CategoryPath -File
                Write-BackupLog "Restoring $($CategoryFiles.Count) $Category files..."
                
                foreach ($File in $CategoryFiles) {
                    $DestPath = switch ($Category) {
                        "dashboard" { $MissionControlDir }
                        "database" { $DataDir }
                        "config" { $PSScriptRoot }
                        default { $MissionControlDir }
                    }
                    
                    # Backup existing file first
                    $ExistingFile = Join-Path $DestPath $File.Name
                    if (Test-Path $ExistingFile) {
                        $BackupName = "$ExistingFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
                        Copy-Item -Path $ExistingFile -Destination $BackupName -Force
                    }
                    
                    Copy-Item -Path $File.FullName -Destination $DestPath -Force
                }
            }
        }
        
        # Cleanup
        Remove-Item -Path $TempExtract -Recurse -Force
        
        Write-BackupLog "Restore completed successfully" "SUCCESS"
        
        # Restart service
        if ($Service) {
            Write-BackupLog "Restarting Mission Control service..."
            Start-Service -Name "VectarrMissionControl"
        }
        
    } catch {
        Write-BackupLog "Restore failed: $_" "ERROR"
    }
}

function Get-BackupList {
    <#
    .SYNOPSIS
        Lists all available backups
    #>
    Write-Host ""
    Write-Host "=== Mission Control Backup Inventory ===" -ForegroundColor Cyan
    Write-Host ""
    
    $Backups = @()
    
    # List ZIP archives
    $Archives = Get-ChildItem -Path "$BackupDir\archives" -Filter "*.zip" -ErrorAction SilentlyContinue
    foreach ($Archive in $Archives) {
        $Backups += [PSCustomObject]@{
            Name = $Archive.Name
            Type = if ($Archive.Name -match "mission_control_(\w+)_") { $Matches[1] } else { "unknown" }
            Date = $Archive.LastWriteTime
            SizeMB = [math]::Round($Archive.Length / 1MB, 2)
            Path = $Archive.FullName
        }
    }
    
    if ($Backups.Count -eq 0) {
        Write-Host "No backups found." -ForegroundColor Yellow
        return
    }
    
    # Display as table
    $Backups | Sort-Object Date -Descending | Format-Table -AutoSize
    
    # Summary
    $TotalSize = ($Backups | Measure-Object -Property SizeMB -Sum).Sum
    Write-Host "Total backups: $($Backups.Count)" -ForegroundColor Gray
    Write-Host "Total size: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Gray
    Write-Host "Backup location: $BackupDir" -ForegroundColor Gray
    Write-Host ""
}

function Clear-OldBackups {
    <#
    .SYNOPSIS
        Removes backups older than specified days
    #>
    param([int]$Days = $KeepDays)
    
    Write-Host ""
    Write-Host "=== Cleaning Up Old Backups ===" -ForegroundColor Cyan
    Write-Host "Removing backups older than $Days days..." -ForegroundColor Yellow
    Write-Host ""
    
    $CutoffDate = (Get-Date).AddDays(-$Days)
    $RemovedCount = 0
    $RemovedSize = 0
    
    # Clean archives
    $Archives = Get-ChildItem -Path "$BackupDir\archives" -Filter "*.zip" -ErrorAction SilentlyContinue
    foreach ($Archive in $Archives) {
        if ($Archive.LastWriteTime -lt $CutoffDate) {
            $RemovedSize += $Archive.Length
            Remove-Item -Path $Archive.FullName -Force
            $RemovedCount++
            Write-BackupLog "Removed: $($Archive.Name)" "INFO"
        }
    }
    
    # Clean old logs
    $Logs = Get-ChildItem -Path "$BackupDir\logs" -Filter "*.log" -ErrorAction SilentlyContinue
    foreach ($Log in $Logs) {
        if ($Log.LastWriteTime -lt $CutoffDate) {
            Remove-Item -Path $Log.FullName -Force
        }
    }
    
    Write-BackupLog "Cleanup complete. Removed $RemovedCount backups ($([math]::Round($RemovedSize/1MB, 2)) MB)" "SUCCESS"
}

# Main execution
switch ($Action) {
    "backup" { 
        $Result = Invoke-MissionControlBackup -BackupType $Type
        if ($Result) {
            Write-Host ""
            Write-Host "Backup Summary:" -ForegroundColor Green
            Write-Host "  File: $($Result.Path)"
            Write-Host "  Type: $($Result.Type)"
            Write-Host "  Files: $($Result.FileCount)"
            Write-Host "  Size: $([math]::Round($Result.SizeBytes/1MB, 2)) MB"
            Write-Host ""
        }
    }
    
    "restore" { Restore-MissionControlBackup -RestoreFilePath $RestoreFile }
    "list" { Get-BackupList }
    "cleanup" { Clear-OldBackups -Days $KeepDays }
    "verify" { 
        if ($RestoreFile) {
            $Result = Test-BackupIntegrity -BackupPath $RestoreFile
            Write-Host "Verification result: $Result" -ForegroundColor $(if ($Result) { "Green" } else { "Red" })
        } else {
            Write-BackupLog "Specify -RestoreFile for verification" "ERROR"
        }
    }
}

# Always rotate backup logs
$LogFiles = Get-ChildItem -Path "$BackupDir\logs" -Filter "*.log" -ErrorAction SilentlyContinue
foreach ($File in $LogFiles) {
    if ($File.Length -gt 10MB) {
        $ArchiveName = "$($File.FullName).old"
        Move-Item -Path $File.FullName -Destination $ArchiveName -Force -ErrorAction SilentlyContinue
    }
}
