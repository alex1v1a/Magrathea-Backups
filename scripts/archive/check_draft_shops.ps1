$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$csv = Import-Csv $csvPath

$draftEmails = @(
    "rick.flores@ftcindustries.com",
    "contactus@njcmachine.com",
    "sales@marathonprecision.com",
    "info@wagner-machine.com",
    "sales@cci-companies.com",
    "contact@centennialmachining.com",
    "Sales@HalseyMFG.com",
    "sales@ohiolaser.com",
    "sales@hubbellmachine.com",
    "info@dallasprecisionmachining.com",
    "office@illinoisvalleymachine.com",
    "sales@crimachining.com"
)

Write-Host "=== Draft Shop Status Check ==="
foreach ($email in $draftEmails) {
    $shop = $csv | Where-Object { $_.email -eq $email }
    if ($shop) {
        Write-Host ""
        Write-Host "Shop: $($shop.name)"
        Write-Host "  Email: $email"
        Write-Host "  Status: $($shop.Status)"
        Write-Host "  Date Contacted: $($shop.'Date Contacted')"
        Write-Host "  Outreach Status: $($shop.'Outreach Status')"
        Write-Host "  Last Outbound: $($shop.'Last Outbound Date')"
    } else {
        Write-Host "NOT FOUND: $email"
    }
}
