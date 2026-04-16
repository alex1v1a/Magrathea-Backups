$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$Inbox = $Namespace.Folders("asferrazza@vectarr.com").Folders("Inbox")
$Items = $Inbox.Items
$Items.Sort("ReceivedTime", $true)

Write-Host "Recent emails in asferrazza inbox:"
foreach ($Item in $Items | Select-Object -First 5) {
    $Unread = if ($Item.UnRead) { "[UNREAD]" } else { "[READ]" }
    $To = $Item.To
    Write-Host "  $Unread To: $To | Subject: $($Item.Subject)"
    
    # Mark sales emails as unread
    if ($Item.Subject -like "*Quote Request*" -and -not $Item.UnRead) {
        Write-Host "    -> Marking as unread"
        $Item.UnRead = $true
        $Item.Save()
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
