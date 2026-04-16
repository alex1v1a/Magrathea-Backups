$Outlook = New-Object -ComObject Outlook.Application
$Draft = $Outlook.CreateItem(0)  # Mail item

Write-Host "ReplyRecipients: $($Draft.ReplyRecipients)"
Write-Host "ReplyRecipients type: $($Draft.ReplyRecipients.GetType().FullName)"
Write-Host "ReplyRecipients count: $($Draft.ReplyRecipients.Count)"

# Try to add
$Draft.ReplyRecipients.Add("test@example.com")
Write-Host "After add, count: $($Draft.ReplyRecipients.Count)"

$Draft.Close(1)
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
