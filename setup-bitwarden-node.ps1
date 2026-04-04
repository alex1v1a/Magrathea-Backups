# Bitwarden CLI Setup for Team Nodes
# Run this on each node to set up authenticated Bitwarden access

$vaultDir = "C:\Users\$env:USERNAME\.openclaw\workspace\.vault"
$sessionFile = "$vaultDir\bw-session"

# Create vault directory if needed
if (!(Test-Path $vaultDir)) {
    New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null
}

# Check if already logged in
$status = bw status 2>&1 | Out-String
if ($status -match '"status":"unauthenticated"') {
    Write-Host "Bitwarden CLI is installed but not logged in."
    Write-Host ""
    Write-Host "To set up Bitwarden access:"
    Write-Host "1. Login: bw login"
    Write-Host "2. Unlock: $env:BW_SESSION = bw unlock --raw"
    Write-Host "3. Save session: `$env:BW_SESSION | Set-Content $sessionFile"
    Write-Host ""
    Write-Host "Or use the master password from Trillian's vault."
} elseif ($status -match '"status":"locked"') {
    Write-Host "Bitwarden is locked. Unlock with: bw unlock"
} else {
    Write-Host "Bitwarden appears to be unlocked."
    
    # Save session if it exists
    if ($env:BW_SESSION) {
        "BW_SESSION=$env:BW_SESSION" | Set-Content $sessionFile
        Write-Host "Session saved to $sessionFile"
    }
}

# Show current vault access
Write-Host ""
Write-Host "Testing vault access..."
bw sync 2>&1 | Out-Null
$items = bw list items --search "Team SSH Password" 2>&1
if ($items -match "Team SSH Password") {
    Write-Host "✅ Vault access confirmed"
} else {
    Write-Host "❌ Cannot access vault - authentication required"
}
