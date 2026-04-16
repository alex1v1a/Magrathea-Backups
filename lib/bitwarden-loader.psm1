# Bitwarden credential loader for PowerShell
# Usage: . ./lib/bitwarden-loader.ps1
#        $password = Get-BitwardenCredential -ItemName "HEB-Account" -Field "password"

$script:BW_CACHE_DIR = Join-Path $PSScriptRoot ".." ".cache"
$script:BW_CACHE_FILE = Join-Path $BW_CACHE_DIR "bw-credentials-ps.json"
$script:BW_CACHE_TTL_MINUTES = 5

# Ensure cache directory exists
if (-not (Test-Path $BW_CACHE_DIR)) {
    New-Item -ItemType Directory -Path $BW_CACHE_DIR -Force | Out-Null
}

function Get-BitwardenCredential {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ItemName,
        
        [string]$Field = "password"
    )
    
    try {
        # Check cache first
        if (Test-Path $BW_CACHE_FILE) {
            $cache = Get-Content $BW_CACHE_FILE | ConvertFrom-Json
            $cachedValue = $cache.$ItemName.$Field
            $cacheTime = [datetime]$cache._timestamp
            $age = (Get-Date) - $cacheTime
            
            if ($cachedValue -and $age.TotalMinutes -lt $BW_CACHE_TTL_MINUTES) {
                return $cachedValue
            }
        }
        
        # Sync and fetch from Bitwarden
        bw sync | Out-Null
        
        $itemJson = bw get item $ItemName
        $item = $itemJson | ConvertFrom-Json
        
        # Extract the requested field
        $value = $null
        
        switch ($Field) {
            "password" { $value = $item.login.password }
            "username" { $value = $item.login.username }
            default {
                $customField = $item.fields | Where-Object { $_.name -eq $Field }
                $value = $customField.value
            }
        }
        
        # Update cache
        $cache = @{}
        if (Test-Path $BW_CACHE_FILE) {
            $cache = Get-Content $BW_CACHE_FILE | ConvertFrom-Json
        }
        
        if (-not $cache.$ItemName) {
            $cache | Add-Member -NotePropertyName $ItemName -NotePropertyValue @{} -Force
        }
        $cache.$ItemName | Add-Member -NotePropertyName $Field -NotePropertyValue $value -Force
        $cache | Add-Member -NotePropertyName "_timestamp" -NotePropertyValue (Get-Date).ToString("o") -Force
        
        $cache | ConvertTo-Json | Set-Content $BW_CACHE_FILE
        
        return $value
    }
    catch {
        Write-Error "Failed to load credential '${ItemName}.${Field}': $_"
        return $null
    }
}

function Get-ApiKey {
    param([Parameter(Mandatory=$true)][string]$Provider)
    return Get-BitwardenCredential -ItemName "API-$Provider" -Field "apiKey"
}

function Get-ServiceCredential {
    param(
        [Parameter(Mandatory=$true)][string]$Service,
        [string]$Field = "password"
    )
    return Get-BitwardenCredential -ItemName "$Service-Account" -Field $Field
}

# Export functions
Export-ModuleMember -Function Get-BitwardenCredential, Get-ApiKey, Get-ServiceCredential
