$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get the rush order draft
$Drafts = $Namespace.GetDefaultFolder(16)
$RushDraft = $Drafts.Items | Where-Object { $_.Subject -like "*Rush Order*" } | Sort-Object CreationTime -Descending | Select-Object -First 1

if ($RushDraft) {
    Write-Host "=== SUBJECT: $($RushDraft.Subject) ==="
    Write-Host "`n=== FROM (PropertyAccessor) ==="
    try {
        $FromEmail = $RushDraft.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x0065001F")
        $FromName = $RushDraft.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x0042001F")
        Write-Host "From Email: $FromEmail"
        Write-Host "From Name: $FromName"
    } catch {
        Write-Host "Could not read From: $_"
    }
    
    Write-Host "`n=== RECIPIENTS ==="
    foreach ($Recipient in $RushDraft.Recipients) {
        Write-Host "  To: $($Recipient.Name) <$($Recipient.Address)>"
    }
    
    Write-Host "`n=== REPLY-TO ==="
    if ($RushDraft.ReplyRecipients.Count -gt 0) {
        foreach ($ReplyTo in $RushDraft.ReplyRecipients) {
            Write-Host "  Reply-To: $($ReplyTo.Name) <$($ReplyTo.Address)>"
        }
    } else {
        Write-Host "  (No Reply-To set)"
    }
    
    Write-Host "`n=== FULL HTML BODY ==="
    Write-Host $RushDraft.HTMLBody
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
