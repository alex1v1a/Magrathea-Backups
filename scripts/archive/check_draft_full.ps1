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

# Get body and check for special chars
$Body = $LatestDraft.HTMLBody

# Check for common problematic chars
$Problematic = @()
if ($Body -match 'â') { $Problematic += 'â' }
if ($Body -match '€') { $Problematic += '€' }
if ($Body -match '™') { $Problematic += '™' }
if ($Body -match '“') { $Problematic += '"' }
if ($Body -match '”') { $Problematic += '"' }
if ($Body -match ''') { $Problematic += ''' }
if ($Body -match ''') { $Problematic += ''' }

if ($Problematic.Count -gt 0) {
    Write-Host "PROBLEMATIC CHARACTERS FOUND: $($Problematic -join ', ')"
} else {
    Write-Host "No problematic characters found in body"
}

Write-Host ""
Write-Host "Full Body:"
Write-Host $Body

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
