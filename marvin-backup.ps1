# Marvin Backup Sync - Windows
# Mirrors identity + config files into a git repo for off-box recovery.

param(
    [string]$GithubRepo = $env:CONFIG_BACKUP_REPO
)

if (-not $GithubRepo -or $GithubRepo.Trim() -eq "") {
    $GithubRepo = "https://github.com/alex1v1a/Marvin-Backups.git"
}

$Workspace = "$env:USERPROFILE\.openclaw\workspace"
$BackupDir = "$env:USERPROFILE\.openclaw\marvin-backup"
$Hostname = $env:COMPUTERNAME
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DateFolder = Get-Date -Format "yyyy-MM-dd"

Write-Host "Marvin Backup Sync - $Date"

New-Item -ItemType Directory -Path "$BackupDir\$Hostname\$DateFolder" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\$Hostname\latest" -Force | Out-Null

$files = @("SOUL.md", "IDENTITY.md", "MEMORY.md", "AGENTS.md", "USER.md")
foreach ($file in $files) {
    $src = Join-Path $Workspace $file
    if (Test-Path $src) {
        Copy-Item $src "$BackupDir\$Hostname\$DateFolder\" -Force
    }
}

if (Test-Path "$Workspace\memory") {
    $Cutoff = (Get-Date).AddDays(-1)
    Get-ChildItem -Path "$Workspace\memory" -Filter "*.md" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $Cutoff } |
        ForEach-Object { Copy-Item $_.FullName "$BackupDir\$Hostname\$DateFolder\" -Force }
}

$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json"
if (Test-Path $ConfigPath) {
    Copy-Item $ConfigPath "$BackupDir\$Hostname\$DateFolder\config-$Date.json" -Force
}

Remove-Item "$BackupDir\$Hostname\latest\*" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$BackupDir\$Hostname\$DateFolder\*" "$BackupDir\$Hostname\latest\" -Recurse -Force

Set-Location $BackupDir

if (-not (Test-Path ".git")) {
    git init | Out-Null
    git remote add origin $GithubRepo
    git config user.name "Team Hitchhikers"
    git config user.email "ops@thegalaxy.local"
}

try {
    git pull origin main --rebase | Out-Null
} catch {}

git add -A
$commitMessage = "Backup from $Hostname at $Date"
if (-not (git diff --cached --quiet)) {
    git commit -m $commitMessage | Out-Null
}

try {
    git push origin main | Out-Null
    Write-Host "Backup pushed"
} catch {
    Write-Host "Push failed - retry on next run"
}

$cutoff = (Get-Date).AddDays(-30)
Get-ChildItem "$BackupDir\$Hostname" -Directory |
    Where-Object { $_.Name -ne "latest" -and $_.LastWriteTime -lt $cutoff } |
    ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

Write-Host "Marvin backup complete"

