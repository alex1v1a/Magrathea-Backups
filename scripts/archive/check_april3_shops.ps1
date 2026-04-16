$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$csv = Import-Csv $csvPath

# Check all 6 April 3rd draft shops
$draftShops = @(
    "rick.flores@ftcindustries.com",
    "contactus@njcmachine.com",
    "sales@marathonprecision.com",
    "info@wagner-machine.com",
    "sales@cci-companies.com",
    "contact@centennialmachining.com"
)

Write-Host "=== April 3rd Draft Shop Status ==="
foreach ($email in $draftShops) {
    $shop = $csv | Where-Object { $_.email -eq $email }
    if ($shop) {
        Write-Host ""
        Write-Host "FOUND: $($shop.name)"
        Write-Host "  Email: $email"
        Write-Host "  Status: '$($shop.Status)'"
        Write-Host "  Date Contacted: '$($shop.'Date Contacted')'"
        Write-Host "  Outreach Status: '$($shop.'Outreach Status')'"
    } else {
        Write-Host ""
        Write-Host "NOT IN DATABASE: $email"
    }
}

# Also search by name patterns
Write-Host ""
Write-Host "=== Searching by partial name matches ==="
$names = @("FTC", "NJC", "Marathon", "Wagner", "CCI", "Centennial")
foreach ($name in $names) {
    $matches = $csv | Where-Object { $_.name -like "*$name*" }
    if ($matches) {
        foreach ($m in $matches) {
            Write-Host "  '$($m.name)' | $($m.email) | Status: $($m.Status)"
        }
    }
}
