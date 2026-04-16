$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Check Sales folder specifically
$SalesInbox = $Namespace.Folders("Sales").Folders("Inbox")
$UnreadItems = $SalesInbox.Items.Restrict("[Unread] = true")

Write-Host "Unread in Sales Inbox: $($UnreadItems.Count)"
foreach ($Item in $UnreadItems) {
    Write-Host "  - $($Item.Subject) from $($Item.SenderName)"
}

# Also check all recent items
Write-Host "`nRecent items in Sales Inbox:"
$AllItems = $SalesInbox.Items
$AllItems.Sort("ReceivedTime", $true)
foreach ($Item in $AllItems | Select-Object -First 5) {
    $Unread = if ($Item.UnRead) { "[UNREAD]" } else { "[READ]" }
    Write-Host "  $Unread $($Item.Subject) - $($Item.ReceivedTime)"
    if ($Item.Subject -like "*Internal*") {
        Write-Host "    -> Marking as unread"
        $Item.UnRead = $true
        $Item.Save()
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
