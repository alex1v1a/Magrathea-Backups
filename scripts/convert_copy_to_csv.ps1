# Convert copied Excel to CSV
$ExcelPath = "C:\Users\admin\.openclaw\workspace\Machine Shops_copy.xlsx"
$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"

try {
    $Excel = New-Object -ComObject Excel.Application
    $Excel.Visible = $false
    $Excel.DisplayAlerts = $false
    
    Write-Host "Opening copied Excel file..."
    $Workbook = $Excel.Workbooks.Open($ExcelPath)
    $Worksheet = $Workbook.Sheets(1)
    
    Write-Host "Saving as CSV to OneDrive folder..."
    $Workbook.SaveAs($CsvPath, 6)  # 6 = xlCSV
    
    $Workbook.Close($false)
    $Excel.Quit()
    
    Write-Host "Successfully converted to CSV: $CsvPath"
    
    # Show first few lines
    Write-Host ""
    Write-Host "First 5 lines of CSV:"
    Get-Content $CsvPath -TotalCount 5
    
} catch {
    Write-Error "Failed to convert: $_"
} finally {
    if ($Worksheet) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Worksheet) | Out-Null }
    if ($Workbook) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Workbook) | Out-Null }
    if ($Excel) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null }
}
