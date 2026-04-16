# Check the latest draft content - FULL BODY
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")
$AdminFolder = $Namespace.Folders("Admin@vectarr.com")
$DraftsFolder = $AdminFolder.Folders("Drafts")

$Items = $DraftsFolder.Items
$Items.Sort("[CreationTime]", $true)

$LatestDraft = $Items.Item(1)
Write-Host "Latest Draft:"
Write-Host "  Subject: $($LatestDraft.Subject)"
Write-Host "  To: $($LatestDraft.To)"
Write-Host ""

# Get body and save to file for inspection
$Body = $LatestDraft.HTMLBody
$Body | Out-File "C:\Users\admin\.openclaw\workspace\latest_draft_body.html" -Encoding UTF8
Write-Host "Body saved to: latest_draft_body.html"

# Check byte values for suspicious chars
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
$Suspicious = @()
for ($i = 0; $i -lt $Bytes.Count - 1; $i++) {
    # Check for UTF-8 multi-byte sequences that might display incorrectly
    if ($Bytes[$i] -eq 0xC3 -and $Bytes[$i+1] -ge 0x80) {
        $Suspicious += "0xC3 0x$($Bytes[$i+1].ToString('X2')) at position $i"
    }
}

if ($Suspicious.Count -gt 0) {
    Write-Host ""
    Write-Host "Suspicious UTF-8 sequences found:"
    $Suspicious | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host ""
    Write-Host "No suspicious UTF-8 sequences found"
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
