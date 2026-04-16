$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

$Inbox = $Namespace.Folders("asferrazza@vectarr.com").Folders("Inbox")
$Items = $Inbox.Items
$Items.Sort("ReceivedTime", $true)

Write-Host "Recent emails with recipient details:"
foreach ($Item in $Items | Select-Object -First 10) {
    if ($Item.Subject -like "*Quote*" -or $Item.Subject -like "*Test*") {
        Write-Host "`nSubject: $($Item.Subject)"
        Write-Host "  To: $($Item.To)"
        Write-Host "  Received: $($Item.ReceivedTime)"
        
        # Check Recipients collection
        Write-Host "  Recipients:"
        foreach ($Recipient in $Item.Recipients) {
            Write-Host "    - $($Recipient.Name) <$($Recipient.Address)> (Type: $($Recipient.Type))"
        }
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
