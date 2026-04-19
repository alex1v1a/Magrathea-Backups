# Add new shops to Machine Shops.csv (Fixed version with -Force)
$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$jsonPath = "C:\Users\admin\.openclaw\workspace\data\new_shops_2026-04-18.json"

# Load existing CSV with all properties
$existingCsv = Import-Csv $csvPath
$allProperties = $existingCsv | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
$existingEmails = $existingCsv | Where-Object { $_.email -and $_.email -ne '' } | Select-Object -ExpandProperty email | ForEach-Object { $_.ToLower().Trim() }

# Load new shops
$newShopsData = Get-Content $jsonPath | ConvertFrom-Json
$newShops = $newShopsData.shops

$addedCount = 0
$skippedCount = 0
$newRows = @()

foreach ($shop in $newShops) {
    $email = $shop.email.ToLower().Trim()
    
    # Skip if email already exists
    if ($existingEmails -contains $email) {
        Write-Host "Skipping duplicate: $($shop.shop_name) ($email)"
        $skippedCount++
        continue
    }
    
    # Create new row with all properties from original CSV
    $newRow = @{}
    foreach ($prop in $allProperties) {
        $newRow[$prop] = ""
    }
    
    # Fill in known values
    $newRow['name'] = $shop.shop_name
    $newRow['name_for_emails'] = $shop.shop_name
    $newRow['site'] = $shop.website
    $newRow['subtypes'] = "Machine shop"
    $newRow['category'] = "Machine shop"
    $newRow['type'] = "Machine shop"
    $newRow['full_name'] = if ($shop.contact_person) { $shop.contact_person } else { "" }
    $newRow['email'] = $shop.email
    $newRow['city'] = $shop.location.city
    $newRow['state'] = $shop.location.state
    $newRow['country'] = "United States of America"
    $newRow['country_code'] = "US"
    $newRow['full_address'] = "$($shop.location.city), $($shop.location.state)"
    
    # Create PSObject with all properties
    $newRowObj = New-Object PSObject
    foreach ($prop in $allProperties) {
        $newRowObj | Add-Member -MemberType NoteProperty -Name $prop -Value $newRow[$prop]
    }
    
    $newRows += $newRowObj
    Write-Host "Added: $($shop.shop_name) ($email)"
    $addedCount++
}

# Append all new rows at once
if ($newRows.Count -gt 0) {
    $newRows | Export-Csv $csvPath -NoTypeInformation -Append -Force
}

Write-Host "`n=== Summary ==="
Write-Host "Added: $addedCount shops"
Write-Host "Skipped (duplicates): $skippedCount shops"
Write-Host "Total in database: $($existingCsv.Count + $addedCount) shops"
