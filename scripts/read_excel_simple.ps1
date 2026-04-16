# Simple Excel reader - no COM
$ExcelPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.xlsx"

# Check if file exists
if (-not (Test-Path $ExcelPath)) {
    Write-Error "File not found: $ExcelPath"
    exit
}

# Check file size
$fileInfo = Get-Item $ExcelPath
Write-Host "File size: $($fileInfo.Length) bytes"
Write-Host "Last modified: $($fileInfo.LastWriteTime)"
Write-Host ""

# Try to read using Import-Excel module if available
try {
    Import-Module ImportExcel -ErrorAction Stop
    $data = Import-Excel -Path $ExcelPath -NoHeader -StartRow 1 -EndRow 5
    Write-Host "First 5 rows using ImportExcel:"
    $data | Format-Table
} catch {
    Write-Host "ImportExcel module not available, trying alternative..."
    
    # Try using OleDb
    try {
        $connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=`"$ExcelPath`";Extended Properties=`"Excel 12.0 Xml;HDR=YES`";"
        $conn = New-Object System.Data.OleDb.OleDbConnection $connString
        $conn.Open()
        
        # Get sheet names
        $tables = $conn.GetSchema("Tables")
        Write-Host "Sheets found:"
        $tables | ForEach-Object { Write-Host "  - $($_.TABLE_NAME)" }
        
        # Read first sheet
        $sheetName = $tables[0].TABLE_NAME
        $cmd = New-Object System.Data.OleDb.OleDbCommand "SELECT TOP 5 * FROM [`$sheetName`]", $conn
        $adapter = New-Object System.Data.OleDb.OleDbDataAdapter $cmd
        $table = New-Object System.Data.DataTable
        $adapter.Fill($table) | Out-Null
        
        Write-Host ""
        Write-Host "First 5 rows:"
        $table | Format-Table
        
        $conn.Close()
    } catch {
        Write-Error "Failed to read Excel: $_"
    }
}
