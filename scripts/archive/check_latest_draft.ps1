# Check the latest draft content
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")
$AdminFolder = $Namespace.Folders("Admin@vectarr.com")
$DraftsFolder = $AdminFolder.Folders("Drafts")

$Items = $DraftsFolder.Items
$Items.Sort("[CreationTime]", $true)  # Sort by creation time descending

$LatestDraft = $Items.Item(1)
Write-Host "Latest Draft:"
Write-Host "  Subject: $($LatestDraft.Subject)"
Write-Host "  To: $($LatestDraft.To)"
Write-Host "  Created: $($LatestDraft.CreationTime)"
Write-Host ""
Write-Host "Body (first 500 chars):"
$Body = $LatestDraft.HTMLBody
if ($Body.Length -gt 500) {
    Write-Host $Body.Substring(0, 500)
} else {
    Write-Host $Body
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
