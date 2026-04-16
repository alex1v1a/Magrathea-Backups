# Check Machine Shops Excel Structure
$ExcelPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.xlsx"

try {
    $Excel = New-Object -ComObject Excel.Application
    $Excel.Visible = $false
    $Workbook = $Excel.Workbooks.Open($ExcelPath)
    $Worksheet = $Workbook.Sheets(1)
    
    $UsedRange = $Worksheet.UsedRange
    Write-Host "Total Rows: $($UsedRange.Rows.Count)"
    Write-Host "Total Columns: $($UsedRange.Columns.Count)"
    Write-Host ""
    Write-Host "Headers:"
    
    for ($col = 1; $col -le $UsedRange.Columns.Count; $col++) {
        $header = $Worksheet.Cells(1, $col).Text
        Write-Host "  Column $col`: $header"
    }
    
    Write-Host ""
    Write-Host "First 3 data rows:"
    for ($row = 2; $row -le [Math]::Min(4, $UsedRange.Rows.Count); $row++) {
        Write-Host "Row $row`:"
        for ($col = 1; $col -le [Math]::Min(5, $UsedRange.Columns.Count); $col++) {
            $value = $Worksheet.Cells($row, $col).Text
            Write-Host "  Col $col`: $value"
        }
    }
    
    $Workbook.Close($false)
    $Excel.Quit()
    
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Worksheet) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Workbook) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null
    
} catch {
    Write-Error "Error: $_"
}
