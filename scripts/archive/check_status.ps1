$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$Shops = Import-Csv -Path $CsvPath

for ($i = 0; $i -lt 5; $i++) {
    $Status = $Shops[$i].Status
    $Date = $Shops[$i].'Date Contacted'
    Write-Host "Row $($i+2): Status=[$Status] Date=[$Date]"
}
