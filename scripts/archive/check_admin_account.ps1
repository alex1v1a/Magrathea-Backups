# Add admin@vectarr.com as separate Outlook account
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Check if account already exists
$Accounts = $Namespace.Accounts
$AdminExists = $false
foreach ($Account in $Accounts) {
    if ($Account.SmtpAddress -eq "admin@vectarr.com") {
        $AdminExists = $true
        Write-Host "admin@vectarr.com account already exists"
        break
    }
}

if (-not $AdminExists) {
    Write-Host "Adding admin@vectarr.com account..."
    # Note: Outlook COM API doesn't support adding accounts programmatically
    # User needs to add via File > Add Account
    Write-Host "Please add manually: File > Account Settings > Account Settings > New"
    Write-Host "Email: admin@vectarr.com"
    Write-Host "Password: [provided separately]"
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Namespace) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
