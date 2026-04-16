$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

Write-Host "=== All Accounts in Outlook ==="
foreach ($Account in $Namespace.Accounts) {
    Write-Host "  - $($Account.SmtpAddress)"
}

Write-Host "`n=== Checking if aliases exist as accounts ==="
$Aliases = @("sales@vectarr.com", "support@vectarr.com", "accounts@vectarr.com", "info@vectarr.com")
foreach ($Alias in $Aliases) {
    $Account = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq $Alias }
    if ($Account) {
        Write-Host "  [FOUND] $Alias EXISTS as account"
    } else {
        Write-Host "  [MISSING] $Alias NOT FOUND as account"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
