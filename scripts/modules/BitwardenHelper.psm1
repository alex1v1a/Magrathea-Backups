<#
.SYNOPSIS
    Bitwarden CLI helper module for credential retrieval.
.DESCRIPTION
    Provides Get-BWCredential and Get-BWNote functions that unlock Bitwarden
    as needed and retrieve stored credentials.
#>

function Unlock-BWIfNeeded {
    <#
    .SYNOPSIS
        Ensures Bitwarden is unlocked. Caches session in $env:BW_SESSION.
    #>
    if ($env:BW_SESSION) {
        # Test if session is still valid
        $test = bw status --session $env:BW_SESSION 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($test.status -eq 'unlocked') { return $true }
    }

    # Need to unlock
    $masterPw = $env:BW_MASTER_PASSWORD
    if (-not $masterPw) {
        if ([Environment]::UserInteractive) {
            $secure = Read-Host "Bitwarden master password" -AsSecureString
            $masterPw = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            )
        } else {
            throw "BW_MASTER_PASSWORD not set and session is not interactive."
        }
    }

    $session = bw unlock $masterPw --raw 2>$null
    if (-not $session) {
        throw "Failed to unlock Bitwarden. Check master password."
    }
    $env:BW_SESSION = $session
    return $true
}

function Get-BWCredential {
    <#
    .SYNOPSIS
        Retrieve a field from a Bitwarden item by name.
    .PARAMETER ItemName
        Name of the Bitwarden item to look up.
    .PARAMETER Field
        Field to return: "username", "password", "notes", "uri", "totp",
        or a custom field name. Defaults to "password".
    .EXAMPLE
        Get-BWCredential -ItemName "Imgur API" -Field "username"
    #>
    param(
        [Parameter(Mandatory)][string]$ItemName,
        [string]$Field = "password"
    )

    Unlock-BWIfNeeded | Out-Null

    $raw = bw get item $ItemName --session $env:BW_SESSION 2>$null
    if (-not $raw) {
        throw "Bitwarden item not found: $ItemName"
    }
    $item = $raw | ConvertFrom-Json

    switch ($Field.ToLower()) {
        'username'  { return $item.login.username }
        'password'  { return $item.login.password }
        'notes'     { return $item.notes }
        'uri'       { return ($item.login.uris | Select-Object -First 1).uri }
        'totp'      {
            $totp = bw get totp $ItemName --session $env:BW_SESSION 2>$null
            return $totp
        }
        default {
            # Check custom fields
            $cf = $item.fields | Where-Object { $_.name -eq $Field } | Select-Object -First 1
            if ($cf) { return $cf.value }
            throw "Field '$Field' not found on item '$ItemName'."
        }
    }
}

function Get-BWNote {
    <#
    .SYNOPSIS
        Parse key=value pairs from a Bitwarden item's notes field.
    .PARAMETER ItemName
        Name of the Bitwarden item.
    .PARAMETER Key
        Key to extract from "Key=Value" pairs in notes.
        Supports both " | " and newline delimiters.
        If omitted, returns all parsed key-value pairs as a hashtable.
    .EXAMPLE
        Get-BWNote -ItemName "Imgur API" -Key "ClientID"
    #>
    param(
        [Parameter(Mandatory)][string]$ItemName,
        [string]$Key
    )

    $notes = Get-BWCredential -ItemName $ItemName -Field "notes"
    if (-not $notes) {
        throw "No notes found on item '$ItemName'."
    }

    # Split on pipe-with-spaces or newlines
    $pairs = $notes -split '\s*\|\s*|\r?\n' | Where-Object { $_ -match '=' }

    $result = @{}
    foreach ($pair in $pairs) {
        $eqIdx = $pair.IndexOf('=')
        if ($eqIdx -gt 0) {
            $k = $pair.Substring(0, $eqIdx).Trim()
            $v = $pair.Substring($eqIdx + 1).Trim()
            $result[$k] = $v
        }
    }

    if ($Key) {
        if ($result.ContainsKey($Key)) {
            return $result[$Key]
        }
        throw "Key '$Key' not found in notes of '$ItemName'. Available keys: $($result.Keys -join ', ')"
    }

    return $result
}

Export-ModuleMember -Function Get-BWCredential, Get-BWNote
