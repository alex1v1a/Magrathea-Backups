$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get the most recent draft (the sales one)
$Drafts = $Namespace.GetDefaultFolder(16)
$SalesDraft = $Drafts.Items | Where-Object { $_.Subject -like "*Quote Request*" } | Sort-Object CreationTime -Descending | Select-Object -First 1

if ($SalesDraft) {
    Write-Host "=== Subject: $($SalesDraft.Subject) ==="
    Write-Host "`n=== HTML Body ==="
    Write-Host $SalesDraft.HTMLBody
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
