$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$MainAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "asferrazza@vectarr.com" }
$Account = $MainAccount

$Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
$UnreadItems = $Inbox.Items.Restrict("[Unread] = true")

foreach ($Item in $UnreadItems) {
    Write-Host "Processing: $($Item.Subject)"
    
    # Create draft
    $Draft = $Outlook.CreateItem(1)
    Write-Host "  Draft created"
    
    # Get recipient address
    $RecipientAddress = $Item.SenderEmailAddress
    if ($RecipientAddress -match "^/O=|EX:|IM:") {
        try {
            $RecipientAddress = $Item.Sender.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x39FE001E")
            Write-Host "  Got SMTP via PropertyAccessor: $RecipientAddress"
        } catch {
            Write-Host "  PropertyAccessor failed: $_"
        }
    }
    
    # Add recipient
    Write-Host "  Adding recipient: $RecipientAddress"
    $Draft.Recipients.Add($RecipientAddress) | Out-Null
    Write-Host "  Recipient added"
    
    Write-Host "  Resolving recipients..."
    $Draft.Recipients.ResolveAll() | Out-Null
    Write-Host "  Recipients resolved"
    
    $Draft.Subject = "RE: $($Item.Subject)"
    Write-Host "  Subject set"
    
    Write-Host "  Setting SendUsingAccount..."
    $Draft.SendUsingAccount = $MainAccount
    Write-Host "  SendUsingAccount set"
    
    Write-Host "  Adding ReplyTo..."
    $Draft.ReplyRecipients.Add($Account.SmtpAddress) | Out-Null
    Write-Host "  ReplyTo added"
    
    # Set HTML body
    $Draft.HTMLBody = "<html><body>Test response</body></html>"
    Write-Host "  Body set"
    
    $Draft.Save()
    Write-Host "  Draft saved successfully!"
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
