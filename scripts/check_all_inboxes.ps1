$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Check all Vectarr accounts for unread emails
$Accounts = $Namespace.Accounts | Where-Object { $_.SmtpAddress -like "*@vectarr.com" }

foreach ($Account in $Accounts) {
    try {
        $Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
        $UnreadItems = $Inbox.Items.Restrict("[Unread] = true")
        
        if ($UnreadItems.Count -gt 0) {
            Write-Host "`n=== $($Account.SmtpAddress) ==="
            foreach ($Item in $UnreadItems) {
                Write-Host "  [UNREAD] $($Item.Subject)"
            }
        }
    }
    catch {
        Write-Host "Error checking $($Account.SmtpAddress): $_"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
