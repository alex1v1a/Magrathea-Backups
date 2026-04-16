# Test email monitor account detection
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

Write-Host "All Accounts:"
$Namespace.Accounts | ForEach-Object { Write-Host "  - $($_.SmtpAddress)" }

Write-Host ""
Write-Host "Vectarr Accounts:"
$Accounts = $Namespace.Accounts | Where-Object { $_.SmtpAddress -like "*@vectarr.com" }
$Accounts | ForEach-Object { Write-Host "  - $($_.SmtpAddress)" }

Write-Host ""
Write-Host "Admin Account:"
$Admin = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "Admin@vectarr.com" }
if (-not $Admin) {
    $Admin = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "admin@vectarr.com" }
}
if ($Admin) {
    Write-Host "  Found: $($Admin.SmtpAddress)"
    $Inbox = $Namespace.Folders($Admin.SmtpAddress).Folders("Inbox")
    Write-Host "  Inbox items: $($Inbox.Items.Count)"
} else {
    Write-Host "  NOT FOUND"
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
