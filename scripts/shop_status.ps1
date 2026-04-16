$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$csv = Import-Csv $csvPath
$total = $csv.Count
$contacted = ($csv | Where-Object { $_.Status -eq 'Contacted' }).Count
$notContacted = ($csv | Where-Object { $_.Status -eq 'Not Contacted' -or $_.Status -eq '' }).Count
$withEmail = ($csv | Where-Object { $_.email -ne '' -and $_.email -ne $null }).Count
$firstEmailSent = ($csv | Where-Object { $_.'Outreach Status' -eq '1st Email Sent' }).Count
Write-Host "=== Shop Network Status ==="
Write-Host "Total shops: $total"
Write-Host "With email: $withEmail"
Write-Host "Contacted: $contacted"
Write-Host "Not contacted: $notContacted"
Write-Host "1st Email Sent: $firstEmailSent"

# Check for new shops file
$newShopsFile = "C:\Users\admin\.openclaw\workspace\data\new_shops_2026-04-06.json"
if (Test-Path $newShopsFile) {
    $content = Get-Content $newShopsFile -Raw | ConvertFrom-Json
    $count = $content.Shops.Count
    Write-Host ""
    Write-Host "New shops discovered today: $count"
}
