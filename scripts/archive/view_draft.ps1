$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Check Drafts folder for the most recent draft
$Drafts = $Namespace.GetDefaultFolder(16)
$RecentDraft = $Drafts.Items | Sort-Object CreationTime -Descending | Select-Object -First 1

if ($RecentDraft) {
    Write-Host "Subject: $($RecentDraft.Subject)"
    Write-Host "`n=== HTML Body ==="
    Write-Host $RecentDraft.HTMLBody
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
