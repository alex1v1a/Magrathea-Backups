$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$Inbox = $Namespace.Folders("asferrazza@vectarr.com").Folders("Inbox")
$Items = $Inbox.Items

Write-Host "All emails in inbox:"
foreach ($Item in $Items) {
    $Unread = if ($Item.UnRead) { "[UNREAD]" } else { "[READ]" }
    Write-Host "  $Unread $($Item.Subject)"
    
    # Mark test email as unread
    if ($Item.Subject -like "*Test: Customer*" -and -not $Item.UnRead) {
        Write-Host "    -> Marking as unread"
        $Item.UnRead = $true
        $Item.Save()
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
