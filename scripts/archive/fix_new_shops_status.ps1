# Fix the status of newly added shops
$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"

# Load CSV
$csv = Import-Csv $csvPath

# Find and fix entries with "New" status
$fixedCount = 0
foreach ($row in $csv) {
    if ($row.Status -eq "New") {
        $row.Status = "Not Contacted"
        $fixedCount++
        Write-Host "Fixed: $($row.name)"
    }
}

# Save back
$csv | Export-Csv -Path $csvPath -NoTypeInformation -Force
Write-Host "Fixed $fixedCount entries"
