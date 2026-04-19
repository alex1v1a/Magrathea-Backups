# Add new shops to Machine Shops.csv
$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$jsonPath = "C:\Users\admin\.openclaw\workspace\data\new_shops_2026-04-18.json"

# Load existing CSV
$existingCsv = Import-Csv $csvPath
$existingEmails = $existingCsv | Where-Object { $_.email -and $_.email -ne '' } | Select-Object -ExpandProperty email | ForEach-Object { $_.ToLower().Trim() }

# Load new shops
$newShopsData = Get-Content $jsonPath | ConvertFrom-Json
$newShops = $newShopsData.shops

$addedCount = 0
$skippedCount = 0

foreach ($shop in $newShops) {
    $email = $shop.email.ToLower().Trim()
    
    # Skip if email already exists
    if ($existingEmails -contains $email) {
        Write-Host "Skipping duplicate: $($shop.shop_name) ($email)"
        $skippedCount++
        continue
    }
    
    # Create new row
    $newRow = [PSCustomObject]@{
        name = $shop.shop_name
        name_for_emails = $shop.shop_name
        site = $shop.website
        subtypes = "Machine shop"
        category = "Machine shop"
        type = "Machine shop"
        phone = ""
        full_address = "$($shop.location.city), $($shop.location.state)"
        domain = ""
        full_name = if ($shop.contact_person) { $shop.contact_person } else { "" }
        first_name = ""
        last_name = ""
        title = ""
        email = $shop.email
        city = $shop.location.city
        state = $shop.location.state
        country = "United States of America"
        country_code = "US"
        Status = ""
        "Date Contacted" = ""
        "Outreach Status" = ""
        "Last Outbound Date" = ""
    }
    
    # Add to CSV
    $newRow | Export-Csv $csvPath -NoTypeInformation -Append
    Write-Host "Added: $($shop.shop_name) ($email)"
    $addedCount++
}

Write-Host "`n=== Summary ==="
Write-Host "Added: $addedCount shops"
Write-Host "Skipped (duplicates): $skippedCount shops"
Write-Host "Total in database: $($existingCsv.Count + $addedCount) shops"
