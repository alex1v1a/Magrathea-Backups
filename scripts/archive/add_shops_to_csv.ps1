# Add new machine shops to CSV database
$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$jsonPath = "C:\Users\admin\.openclaw\workspace\data\new_shops_20260402.json"

# Load new shops
$newShops = Get-Content $jsonPath | ConvertFrom-Json

# Load existing CSV to get structure
$existingCSV = Import-Csv $csvPath
$headers = ($existingCSV | Get-Member -MemberType NoteProperty).Name

# Create new entries matching CSV structure
$newEntries = @()
foreach ($shop in $newShops) {
    $entry = @{}
    foreach ($header in $headers) {
        $entry[$header] = ""
    }
    
    # Map fields
    $entry["name"] = $shop.shop_name
    $entry["city"] = $shop.city
    $entry["state"] = $shop.state
    $entry["email"] = $shop.email
    $entry["phone"] = $shop.phone
    $entry["domain"] = ($shop.website -replace "https?://", "" -replace "www\.", "").Trim("/")
    $entry["company_name"] = $shop.shop_name
    $entry["company_phone"] = $shop.phone
    $entry["full_name"] = $shop.contact_name
    $entry["first_name"] = ""
    $entry["last_name"] = ""
    $entry["title"] = ""
    $entry["website_title"] = $shop.capabilities
    $entry["website_description"] = $shop.capabilities
    $entry["Status"] = "New"
    $entry["Date Contacted"] = ""
    $entry["Outreach Status"] = ""
    $entry["Last Outbound Date"] = ""
    $entry["country"] = "United States of America"
    $entry["country_code"] = "US"
    $entry["subtypes"] = "Machine shop"
    $entry["category"] = "Machine shop"
    $entry["type"] = "Machine shop"
    
    $newEntries += [PSCustomObject]$entry
}

# Append to CSV
$newEntries | Export-Csv -Path $csvPath -NoTypeInformation -Append -Force

Write-Host "Added $($newEntries.Count) new shops to CSV database"
