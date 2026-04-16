$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

Write-Host "=== Accounts in Outlook ==="
foreach ($Account in $Namespace.Accounts) {
    Write-Host "  - $($Account.SmtpAddress)"
}

Write-Host "`n=== Folders ==="
foreach ($Folder in $Namespace.Folders) {
    Write-Host "  - $($Folder.Name)"
    try {
        $Inbox = $Folder.Folders("Inbox")
        $Unread = $Inbox.Items.Restrict("[Unread] = true").Count
        Write-Host "      Inbox unread: $Unread"
    } catch {
        Write-Host "      No Inbox accessible"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
