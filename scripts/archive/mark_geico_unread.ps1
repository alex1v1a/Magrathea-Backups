$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$Inbox = $Namespace.Folders("asferrazza@vectarr.com").Folders("Inbox")
$Items = $Inbox.Items

foreach ($Item in $Items) {
    if ($Item.Subject -like "*GEICO*" -or $Item.Subject -like "*insurance*") {
        Write-Host "Found: $($Item.Subject) - Marking as unread"
        $Item.UnRead = $true
        $Item.Save()
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
