# Git Backup PowerShell Script for OpenClaw Workspace
# Backs up ~/.openclaw/workspace to Magrathea-Backups repo

$WorkspaceDir = "$env:USERPROFILE\.openclaw\workspace"
$LogDir = "$env:USERPROFILE\.openclaw\logs"
$LogFile = "$LogDir\git-backup.log"
$NodeName = $env:COMPUTERNAME

# Ensure log directory exists
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp $Message" | Tee-Object -FilePath $LogFile -Append
}

# Change to workspace
Set-Location $WorkspaceDir

# Check if git repo is initialized
if (-not (Test-Path ".git")) {
    Write-Log "ERROR: Not a git repository"
    exit 1
}

# Configure git
git config user.email "$NodeName@magrathea.local" 2>$null
git config user.name "$NodeName Backup" 2>$null

# Add all changes
git add -A

# Check if there are changes to commit
$Status = git status --porcelain
if (-not $Status) {
    Write-Log "No changes to backup"
    exit 0
}

# Commit with timestamp
$CommitMsg = "Backup $NodeName - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$CommitOutput = git commit -m "$CommitMsg" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: Git commit failed - $CommitOutput"
    exit 1
}

# Push to remote (branch named after node)
$PushOutput = git push origin "HEAD:$NodeName" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Log "SUCCESS: Backup pushed to Magrathea-Backups/$NodeName"
} else {
    # Try creating the branch
    $PushOutput = git push -u origin "HEAD:$NodeName" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "SUCCESS: Backup pushed to Magrathea-Backups/$NodeName (new branch)"
    } else {
        Write-Log "ERROR: Git push failed - $PushOutput"
        exit 1
    }
}

