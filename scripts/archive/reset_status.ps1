# Reset some shop statuses for testing
$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"

$Shops = Import-Csv -Path $CsvPath

# Reset Traxis Manufacturing LLC entries (rows 8 and 9)
$Shops[7].Status = ""
$Shops[7].'Date Contacted' = ""
$Shops[8].Status = ""
$Shops[8].'Date Contacted' = ""

# Reset Classic Engine Machine (row 10)
$Shops[9].Status = ""
$Shops[9].'Date Contacted' = ""

$Shops | Export-Csv -Path $CsvPath -NoTypeInformation
Write-Host "Reset status for Traxis Manufacturing LLC and Classic Engine Machine"
