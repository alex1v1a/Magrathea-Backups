$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$Draft = $Outlook.CreateItem(1)

# Check what properties are available
Write-Host "Available properties on Draft:"
$Draft | Get-Member -MemberType Property | Select-Object Name | Format-Table

# Try to access ReplyRecipients
Write-Host "`nReplyRecipients value: $($Draft.ReplyRecipients)"
Write-Host "ReplyRecipients type: $($Draft.ReplyRecipients.GetType().FullName)"

$Draft.Close(1)  # 1 = olDiscard
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
