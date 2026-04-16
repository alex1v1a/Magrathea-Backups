$Workspace = "$env:USERPROFILE\.openclaw\workspace"
$BackupDir = "$env:USERPROFILE\.openclaw\magrathea-backup"
$GithubRepo = "https://github.com/alex1v1a/Magrathea-Backups.git"
$Hostname = $env:COMPUTERNAME
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DayFolder = Get-Date -Format "yyyy-MM-dd"

New-Item -ItemType Directory -Path "$BackupDir\$Hostname\$DayFolder" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\$Hostname\latest" -Force | Out-Null

$files = @("SOUL.md", "IDENTITY.md", "MEMORY.md", "AGENTS.md", "USER.md")
foreach ($file in $files) {
    $src = Join-Path $Workspace $file
    if (Test-Path $src) {
        Copy-Item $src "$BackupDir\$Hostname\$DayFolder\" -Force
    }
}

if (Test-Path "$Workspace\memory") {
    $cutoff = (Get-Date).AddDays(-1)
    Get-ChildItem -Path "$Workspace\memory" -Filter "*.md" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $cutoff } |
        ForEach-Object { Copy-Item $_.FullName "$BackupDir\$Hostname\$DayFolder\" -Force }
}

$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json"
if (Test-Path $ConfigPath) {
    Copy-Item $ConfigPath "$BackupDir\$Hostname\$DayFolder\config-$Timestamp.json" -Force
}

Remove-Item "$BackupDir\$Hostname\latest\*" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$BackupDir\$Hostname\$DayFolder\*" "$BackupDir\$Hostname\latest\" -Recurse -Force

Set-Location $BackupDir
if (-not (Test-Path ".git")) {
    git init | Out-Null
    git remote add origin $GithubRepo
    git config user.name "Team Hitchhikers"
    git config user.email "ops@thegalaxy.local"
}

git pull origin main --rebase 2>$null

git add -A
$commitMessage = "Backup from $Hostname at $Timestamp"
if (-not (git diff --cached --quiet)) {
    git commit -m $commitMessage 2>$null
}

try {
    git push origin main 2>$null
    Write-Host "Backup pushed"
} catch {
    Write-Host "Push failed; will retry on next run"
}

$fileCount = (Get-ChildItem "$BackupDir\$Hostname\$DayFolder" -Recurse -File | Measure-Object).Count
Write-Host "Files backed up: $fileCount"

