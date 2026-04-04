# Team Credential Access Script for Windows
# Usage: .\team-creds.ps1 <credential-name>
#        .\team-creds.ps1 list

$VAULT_DIR = "C:\Users\$env:USERNAME\.openclaw\workspace\.vault"
$SESSION_FILE = "$VAULT_DIR\bw-session"

# Check if session exists
if (!(Test-Path $SESSION_FILE)) {
    Write-Error "No Bitwarden session found. Run 'bw unlock' first and save the session."
    Write-Host ""
    Write-Host "Quick setup:"
    Write-Host "  1. bw login alex@1v1a.com"
    Write-Host "  2. `$env:BW_SESSION = bw unlock --raw"
    Write-Host "  3. \"BW_SESSION=`$env:BW_SESSION\" | Set-Content $SESSION_FILE"
    exit 1
}

# Load session
$sessionContent = Get-Content $SESSION_FILE -ErrorAction SilentlyContinue | Select-String "^BW_SESSION="
if ($sessionContent) {
    $env:BW_SESSION = $sessionContent.ToString().Split("=")[1]
}

# Verify session works
$syncResult = bw sync 2>&1
if ($syncResult -match "error" -or $syncResult -match "unauthorized") {
    Write-Error "Session expired or invalid. Run 'bw unlock' to get a new session."
    exit 1
}

# Function to get credential
function Get-Cred($name) {
    try {
        $item = bw get item $name 2>&1 | ConvertFrom-Json
        
        # Try login password first
        if ($item.login -and $item.login.password) {
            return $item.login.password
        }
        
        # Try notes field
        if ($item.notes) {
            # Check for Token: or Password: prefix
            if ($item.notes -match "Token:\s*(\S+)") {
                return $matches[1]
            }
            if ($item.notes -match "Password:\s*(\S+)") {
                return $matches[1]
            }
            return $item.notes
        }
        
        return $null
    } catch {
        return $null
    }
}

# Main
if ($args[0] -eq "list") {
    $items = bw list items 2>&1 | ConvertFrom-Json
    Write-Host "Available credentials:"
    Write-Host ""
    $items | Select-Object -ExpandProperty name | Sort-Object | ForEach-Object {
        Write-Host "  - $_"
    }
} elseif ($args[0]) {
    $value = Get-Cred $args[0]
    if ($value) {
        Write-Output $value
    } else {
        Write-Error "Credential not found: $($args[0])"
        exit 1
    }
} else {
    Write-Host "Team Credential Access"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\team-creds.ps1 list                    - List all credentials"
    Write-Host "  .\team-creds.ps1 \"Credential Name\"     - Get credential value"
    Write-Host ""
    Write-Host "Common credentials:"
    Write-Host "  - Team SSH Password"
    Write-Host "  - GitHub - PaperTrail9"
    Write-Host "  - Marvin - Gateway Token"
    Write-Host "  - Deep Thought - Gateway Token"
    Write-Host "  - Bistromath - Gateway Token"
    Write-Host "  - Trillian - Moonshot API Key"
}
