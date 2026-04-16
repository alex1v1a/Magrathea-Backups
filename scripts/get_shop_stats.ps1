$csv = Import-Csv 'C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv'
$uniqueShops = $csv | Group-Object -Property name
$totalShops = $uniqueShops.Count
$contactedRows = ($csv | Where-Object { $_.Status -eq 'Contacted' }).Count
$withEmails = ($csv | Where-Object { $_.email -and $_.email -ne 'INVALID' -and $_.email -ne '' }).Count
$firstEmailSent = ($csv | Where-Object { $_.'Outreach Status' -like '*1st Email*' }).Count

Write-Output "Total Unique Shops: $totalShops"
Write-Output "Contacted Rows: $contactedRows"
Write-Output "Rows with Valid Emails: $withEmails"
Write-Output "1st Email Sent: $firstEmailSent"
