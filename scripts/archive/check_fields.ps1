$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$csv = Import-Csv $csvPath

# Shops with no Status or "Not Contacted" and valid email
$uncontacted = $csv | Where-Object { 
    ($_.Status -eq "" -or $_.Status -eq $null -or $_.Status -eq "Not Contacted") -and 
    ($_.email -ne "" -and $_.email -ne $null)
}

Write-Host "=== Genuinely uncontacted shops with email ==="
Write-Host "Count: $($uncontacted.Count)"
Write-Host ""
foreach ($shop in $uncontacted) {
    Write-Host "  $($shop.name) | $($shop.email) | Status='$($shop.Status)' | Outreach='$($shop.'Outreach Status')'"
}

Write-Host ""
Write-Host "=== Status breakdown ==="
Write-Host "  Contacted: $(($csv | Where-Object { $_.Status -eq 'Contacted' }).Count)"
Write-Host "  Not Contacted: $(($csv | Where-Object { $_.Status -eq 'Not Contacted' }).Count)"
Write-Host "  Blank Status: $(($csv | Where-Object { $_.Status -eq '' -or $_.Status -eq $null }).Count)"
Write-Host "  Total: $($csv.Count)"

Write-Host ""
Write-Host "=== Outreach Status breakdown ==="
Write-Host "  1st Email Sent: $(($csv | Where-Object { $_.'Outreach Status' -eq '1st Email Sent' }).Count)"
Write-Host "  Draft Created: $(($csv | Where-Object { $_.'Outreach Status' -eq 'Draft Created' }).Count)"
Write-Host "  Blank: $(($csv | Where-Object { $_.'Outreach Status' -eq '' -or $_.'Outreach Status' -eq $null }).Count)"
