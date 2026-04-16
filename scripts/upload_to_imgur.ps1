# Imgur Upload Script with Bitwarden credential retrieval
param(
    [string]$ImagePath = "$env:USERPROFILE\.openclaw\media\inbound\image.png"
)

# Import Bitwarden helper to retrieve credentials securely
Import-Module "$PSScriptRoot\modules\BitwardenHelper.psm1" -ErrorAction Stop

try {
    $ClientID = Get-BWNote -ItemName "Imgur API" -Key "ClientID"
} catch {
    Write-Error "Failed to retrieve Imgur credentials from Bitwarden: $_"
    exit 1
}

try {
    if (-not (Test-Path $ImagePath)) {
        Write-Error "Image file not found: $ImagePath"
        exit 1
    }
    
    $ImageBytes = [System.IO.File]::ReadAllBytes($ImagePath)
    $Base64Image = [System.Convert]::ToBase64String($ImageBytes)
    
    $Body = @{
        image = $Base64Image
        type = "base64"
        title = "Upload"
        description = "Auto-upload"
    }
    
    $Headers = @{
        "Authorization" = "Client-ID $ClientID"
    }
    
    Write-Host "Uploading to Imgur..."
    $Response = Invoke-RestMethod -Uri "https://api.imgur.com/3/image" -Method Post -Headers $Headers -Body $Body
    
    if ($Response.success -eq $true) {
        $ImageUrl = $Response.data.link
        Write-Host "Success: $ImageUrl"
        return $ImageUrl
    } else {
        Write-Error "Upload failed: $($Response.data.error)"
        exit 1
    }
} catch {
    Write-Error "Failed: $_"
    exit 1
}
