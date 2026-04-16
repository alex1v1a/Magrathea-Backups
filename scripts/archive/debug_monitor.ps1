$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get all Vectarr accounts
$Accounts = $Namespace.Accounts | Where-Object { $_.SmtpAddress -like "*@vectarr.com" }

Write-Host "Found $($Accounts.Count) Vectarr accounts:"
foreach ($Account in $Accounts) {
    Write-Host "  - $($Account.SmtpAddress)"
}

foreach ($Account in $Accounts) {
    try {
        Write-Host "`nChecking account: $($Account.SmtpAddress)"
        $Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
        Write-Host "  Inbox accessed successfully"
        
        $UnreadItems = $Inbox.Items.Restrict("[Unread] = true")
        Write-Host "  Unread items count: $($UnreadItems.Count)"
        
        foreach ($Item in $UnreadItems) {
            Write-Host "  - Unread: $($Item.Subject)"
        }
    }
    catch {
        Write-Error "Error processing account $($Account.SmtpAddress): $_"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
