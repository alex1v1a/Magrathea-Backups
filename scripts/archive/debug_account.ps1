$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get the main Vectarr account for sending
$MainAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "asferrazza@vectarr.com" }

if ($MainAccount) {
    Write-Host "Main account found: $($MainAccount.SmtpAddress)"
} else {
    Write-Host "Main account NOT found!"
    Write-Host "Available accounts:"
    $Namespace.Accounts | ForEach-Object { Write-Host "  - $($_.SmtpAddress)" }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
