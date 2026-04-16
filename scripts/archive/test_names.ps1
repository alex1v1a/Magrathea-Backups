# Test name extraction
. "C:\Users\admin\.openclaw\workspace\scripts\machine_shop_outreach_csv.ps1"

# Test Get-FirstName
Write-Host "Testing Get-FirstName:"
Write-Host "  'Brandt, Duane' -> $(Get-FirstName -FullName 'Brandt, Duane')"
Write-Host "  'John Smith' -> $(Get-FirstName -FullName 'John Smith')"
Write-Host "  'Smith, John Paul' -> $(Get-FirstName -FullName 'Smith, John Paul')"

# Test Get-NameFromEmail
Write-Host ""
Write-Host "Testing Get-NameFromEmail:"
Write-Host "  'duanebrandt@brandtprecision.com' -> $(Get-NameFromEmail -Email 'duanebrandt@brandtprecision.com')"
Write-Host "  'john.smith@example.com' -> $(Get-NameFromEmail -Email 'john.smith@example.com')"
