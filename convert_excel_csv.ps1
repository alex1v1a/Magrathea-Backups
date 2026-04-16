# Convert Excel to CSV
$ExcelFile = 'C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.xlsx'
$CsvFile = 'C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv'

$Excel = New-Object -ComObject Excel.Application
$Excel.Visible = $false
$Excel.DisplayAlerts = $false
$Workbook = $Excel.Workbooks.Open($ExcelFile)
$Worksheet = $Workbook.Sheets(1)

# Save as CSV
$Workbook.SaveAs($CsvFile, 6)  # 6 = xlCSV
$Workbook.Close($false)
$Excel.Quit()

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Workbook) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host 'Excel converted to CSV successfully'
Write-Host "CSV location: $CsvFile"

# Show first few rows
Import-Csv $CsvFile | Select-Object -First 5 | Format-Table -AutoSize
