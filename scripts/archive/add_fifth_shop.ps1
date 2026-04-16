# Add one more machine shop to CSV
$CsvPath = 'C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv'

# Read existing CSV
$Existing = Import-Csv -Path $CsvPath
$ExistingCount = $Existing.Count
Write-Host "Current shops in database: $ExistingCount"

# Shop 6: EMC Machining Inc
$Entry6 = @{}
foreach ($prop in $Existing[0].PSObject.Properties.Name) {
    $Entry6[$prop] = ''
}
$Entry6['name'] = 'EMC Machining Inc'
$Entry6['site'] = 'http://www.emcmachining.com/'
$Entry6['subtypes'] = 'CNC Milling, CNC Turning, Prototyping to Production'
$Entry6['category'] = 'Machine shop'
$Entry6['type'] = 'Machine shop'
$Entry6['phone'] = '(630) 860-7076'
$Entry6['full_address'] = '905 Fairway Drive, Bensenville, IL 60106'
$Entry6['domain'] = 'emcmachining.com'
$Entry6['city'] = 'Bensenville'
$Entry6['postal_code'] = '60106'
$Entry6['state'] = 'Illinois'
$Entry6['us_state'] = 'Illinois'
$Entry6['country'] = 'United States of America'
$Entry6['country_code'] = 'US'
$Entry6['time_zone'] = 'America/Chicago'
$Entry6['email'] = 'info@emcmachining.com'
$Entry6['source'] = 'Web Search Discovery'
$Entry6['description'] = 'CNC milling and turning from prototyping to production. Engineer and machinist input for cost-efficient projects. Focus on high quality parts at the right price.'
$Entry6['Status'] = 'Not Contacted'

# Convert to object and add
$Obj = New-Object PSObject -Property $Entry6
$Existing += $Obj

# Export
$Existing | Export-Csv -Path $CsvPath -NoTypeInformation
Write-Host "Added 1 new shop to database"
Write-Host "Total shops now: $($Existing.Count)"
