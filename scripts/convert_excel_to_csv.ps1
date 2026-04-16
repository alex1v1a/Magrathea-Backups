# Convert Excel to CSV
$ExcelPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.xlsx"
$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"

try {
    $Excel = New-Object -ComObject Excel.Application
    $Excel.Visible = $false
    $Excel.DisplayAlerts = $false
    
    Write-Host "Opening Excel file..."
    $Workbook = $Excel.Workbooks.Open($ExcelPath)
    $Worksheet = $Workbook.Sheets(1)
    
    Write-Host "Saving as CSV..."
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
    if ($Excel) {
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Worksheet) | Out-Null
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Workbook) | Out-Null
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null
    }
}
