# Check status of newly added shops
$CsvPath = 'C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv'
$Shops = Import-Csv -Path $CsvPath

# Find shops added via web search discovery
$NewShops = @()
foreach ($Shop in $Shops) {
    if ($Shop.source -eq 'Web Search Discovery') {
        $NewShops += $Shop
    }
}

Write-Host "Web Search Discovery Shops:"
Write-Host "============================"
foreach ($Shop in $NewShops) {
    $status = if ($Shop.Status) { $Shop.Status } else { "Not Contacted" }
    Write-Host "$($Shop.name)"
    Write-Host "  Email: $($Shop.email)"
    Write-Host "  Location: $($Shop.city), $($Shop.state)"
    Write-Host "  Status: $status"
    Write-Host ""
}
Write-Host "Total discovered shops: $($NewShops.Count)"

# Count those that need contact
$NeedContact = $NewShops | Where-Object { $_.Status -eq 'Not Contacted' -or $_.Status -eq '' }
Write-Host "Shops needing contact: $($NeedContact.Count)"
