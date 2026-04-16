$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Check Drafts folder for the most recent drafts
$Drafts = $Namespace.GetDefaultFolder(16)
$RecentDrafts = $Drafts.Items | Sort-Object CreationTime -Descending | Select-Object -First 3

foreach ($Draft in $RecentDrafts) {
    Write-Host "`n=== $($Draft.Subject) ==="
    Write-Host "Created: $($Draft.CreationTime)"
    
    # Extract name from signature
    if ($Draft.HTMLBody -match "Morgan Parker") {
        Write-Host "Signature: Morgan Parker (Sales Representative)"
    } elseif ($Draft.HTMLBody -match "Alexander Sferrazza") {
        Write-Host "Signature: Alexander Sferrazza (Accounts Manager)"
    } else {
        Write-Host "Signature: Unknown"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
