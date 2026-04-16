# Add more machine shops to CSV
$CsvPath = 'C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv'

# Read existing CSV
$Existing = Import-Csv -Path $CsvPath
$ExistingCount = $Existing.Count
Write-Host "Current shops in database: $ExistingCount"

# Create new entries with minimal required fields
$NewEntries = @()

# Shop 3: Centennial Machining
$Entry3 = @{}
foreach ($prop in $Existing[0].PSObject.Properties.Name) {
    $Entry3[$prop] = ''
}
$Entry3['name'] = 'Centennial Machining'
$Entry3['site'] = 'https://www.centennialmachining.com/'
$Entry3['subtypes'] = 'Precision CNC Machining, ISO-9001:2015 Certified'
$Entry3['category'] = 'Machine shop'
$Entry3['type'] = 'Machine shop'
$Entry3['phone'] = '303-680-5151'
$Entry3['full_address'] = '15075 E. Hinsdale Drive, Centennial, CO 80112'
$Entry3['domain'] = 'centennialmachining.com'
$Entry3['city'] = 'Centennial'
$Entry3['postal_code'] = '80112'
$Entry3['state'] = 'Colorado'
$Entry3['us_state'] = 'Colorado'
$Entry3['country'] = 'United States of America'
$Entry3['country_code'] = 'US'
$Entry3['time_zone'] = 'America/Denver'
$Entry3['email'] = 'contact@centennialmachining.com'
$Entry3['source'] = 'Web Search Discovery'
$Entry3['description'] = 'ISO-9001:2015 certified precision CNC machining. 99% customer approval rating. Produces prototypes to large-scale production. Materials: plastic, aluminum, steel, stainless steel, copper, brass.'
$Entry3['Status'] = 'Not Contacted'
$NewEntries += $Entry3

# Shop 4: Hubbell Machine Tooling Inc
$Entry4 = @{}
foreach ($prop in $Existing[0].PSObject.Properties.Name) {
    $Entry4[$prop] = ''
}
$Entry4['name'] = 'Hubbell Machine Tooling Inc'
$Entry4['site'] = 'https://www.hubbellmachine.com/'
$Entry4['subtypes'] = 'Custom Manufacturing, Precision CNC, Wire EDM, Ram EDM, Reverse Engineering'
$Entry4['category'] = 'Machine shop'
$Entry4['type'] = 'Machine shop'
$Entry4['phone'] = '(216) 524-1797'
$Entry4['full_address'] = 'Cleveland, OH'
$Entry4['domain'] = 'hubbellmachine.com'
$Entry4['city'] = 'Cleveland'
$Entry4['state'] = 'Ohio'
$Entry4['us_state'] = 'Ohio'
$Entry4['country'] = 'United States of America'
$Entry4['country_code'] = 'US'
$Entry4['time_zone'] = 'America/New_York'
$Entry4['email'] = 'sales@hubbellmachine.com'
$Entry4['source'] = 'Web Search Discovery'
$Entry4['description'] = 'Over 60 years experience in manufacturing precision machined parts and tooling. Custom manufacturing, precision machining, wire and ram EDM, reverse engineering, inspection and documentation.'
$Entry4['Status'] = 'Not Contacted'
$NewEntries += $Entry4

# Shop 5: Ohio Laser
$Entry5 = @{}
foreach ($prop in $Existing[0].PSObject.Properties.Name) {
    $Entry5[$prop] = ''
}
$Entry5['name'] = 'Ohio Laser'
$Entry5['site'] = 'https://www.ohiolaser.com/'
$Entry5['subtypes'] = 'CNC Machining, Laser Cutting, Robotic MIG Welding'
$Entry5['category'] = 'Machine shop'
$Entry5['type'] = 'Machine shop'
$Entry5['phone'] = '614-873-7030'
$Entry5['full_address'] = 'Norton, OH'
$Entry5['domain'] = 'ohiolaser.com'
$Entry5['city'] = 'Norton'
$Entry5['state'] = 'Ohio'
$Entry5['us_state'] = 'Ohio'
$Entry5['country'] = 'United States of America'
$Entry5['country_code'] = 'US'
$Entry5['time_zone'] = 'America/New_York'
$Entry5['email'] = 'sales@ohiolaser.com'
$Entry5['source'] = 'Web Search Discovery'
$Entry5['description'] = 'Since 1997. Precision CNC machining, laser cutting, robotic MIG welding. Complex parts to innovative assemblies. STP or DXF files accepted.'
$Entry5['Status'] = 'Not Contacted'
$NewEntries += $Entry5

# Convert hashtables to objects and add to existing
foreach ($Entry in $NewEntries) {
    $Obj = New-Object PSObject -Property $Entry
    $Existing += $Obj
}

# Export
$Existing | Export-Csv -Path $CsvPath -NoTypeInformation
Write-Host "Added 3 new shops to database"
Write-Host "Total shops now: $($Existing.Count)"
