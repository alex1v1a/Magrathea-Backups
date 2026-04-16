$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$Account = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "asferrazza@vectarr.com" }
$Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
$UnreadItems = $Inbox.Items.Restrict("[Unread] = true")

foreach ($Item in $UnreadItems) {
    Write-Host "Email: $($Item.Subject)"
    Write-Host "  SenderEmailAddress: $($Item.SenderEmailAddress)"
    Write-Host "  SenderName: $($Item.SenderName)"
    Write-Host "  Sender.SMTPAddress: $($Item.Sender.SmtpAddress)"
    
    # Try to get SMTP via PropertyAccessor
    try {
        $Smtp = $Item.Sender.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x39FE001E")
        Write-Host "  PropertyAccessor SMTP: $Smtp"
    } catch {
        Write-Host "  PropertyAccessor failed: $_"
    }
    
    # Check ReplyTo
    Write-Host "  ReplyTo count: $($Item.ReplyTo.Count)"
    if ($Item.ReplyTo.Count -gt 0) {
        Write-Host "  ReplyTo[0]: $($Item.ReplyTo.Item(1).Address)"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
