# Add newly discovered machine shops to CSV
$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"

# Read existing CSV to get headers
$existingCsv = Import-Csv -Path $csvPath
$headers = ($existingCsv | Get-Member -MemberType NoteProperty).Name

# New shops data
$newShops = @(
    @{
        name = "Atomic Machine"
        email = "info@atomicmachine.com"
        phone = "(239) 353-9100"
        city = "Naples"
        state = "FL"
        site = "https://www.atomicmachine.com"
        full_address = "1236 Industrial Blvd, Naples, FL 34104"
        description = "Precision contract CNC manufacturing for aerospace, medical, defense. ISO 9001:2015, ISO 13485:2016, AS9100D certified. 5-axis, Swiss, lathes, wire EDM."
    },
    @{
        name = "Hubbell Machine Tooling Inc"
        email = "sales@hubbellmachine.com"
        phone = "(216) 524-1797"
        city = "Cleveland"
        state = "OH"
        site = "https://www.hubbellmachine.com"
        full_address = "Cleveland, OH"
        description = "Over 60 years experience in manufacturing precision machined parts. Custom manufacturing, CNC turning and milling, wire and ram EDM, reverse engineering."
    },
    @{
        name = "Titan Metal Products LLC"
        email = "info@titan-metalproducts.com"
        phone = "(614) 504-7000"
        city = "Plain City"
        state = "OH"
        site = "https://titanmetalproductsllc.com"
        full_address = "8168 Business Way Suite A, Plain City, OH 43064"
        description = "CNC machine shop from prototype to production. 35+ years experience. Serving automotive, specialty tool, government, food industry, medical industry."
    },
    @{
        name = "CRI Machining"
        email = "sales@crimachining.com"
        phone = "706.745.9599"
        city = "Blairsville"
        state = "GA"
        site = "https://crimachining.com"
        full_address = "P.O. Box 2658, Blairsville, GA 30514"
        description = "Full service machine shop with CNC machining, fabrication, heat treat. 5-Axis milling and turning, waterjet, laser cutting, EDM. ISO 9001-2008 certified."
    },
    @{
        name = "Pinnacle Tool and Engineering Inc"
        email = "cookracing@ameritech.net"
        phone = "(216) 252-1868"
        city = "Cleveland"
        state = "OH"
        site = "https://www.pinnacletooleng.com"
        full_address = "10725 Briggs Rd, Cleveland, OH 44111"
        description = "Complete solutions for machining since 1986. 3-D machining, job shop machining, private label manufacturing, CNC milling and turning."
    }
)

# Create new rows with all headers
$newRows = @()
foreach ($shop in $newShops) {
    $row = @{}
    foreach ($header in $headers) {
        $row[$header] = ""
    }
    # Populate known fields
    $row["name"] = $shop.name
    $row["name_for_emails"] = $shop.name
    $row["email"] = $shop.email
    $row["phone"] = $shop.phone
    $row["city"] = $shop.city
    $row["state"] = $shop.state
    $row["us_state"] = $shop.state
    $row["site"] = $shop.site
    $row["full_address"] = $shop.full_address
    $row["description"] = $shop.description
    $row["category"] = "Machine shop"
    $row["type"] = "Machine shop"
    $row["subtypes"] = "Machine shop"
    $row["country"] = "United States of America"
    $row["country_code"] = "US"
    $row["source"] = "web_search"
    $row["Status"] = ""
    $row["Date Contacted"] = ""
    $row["Outreach Status"] = ""
    
    $newRows += $row
}

# Convert to objects and append
$newObjects = $newRows | ForEach-Object { 
    $obj = New-Object PSObject
    foreach ($header in $headers) {
        $obj | Add-Member -MemberType NoteProperty -Name $header -Value $_[$header]
    }
    $obj
}

# Append to CSV
$newObjects | Export-Csv -Path $csvPath -NoTypeInformation -Append

Write-Host "Added $($newRows.Count) new machine shops to CSV" -ForegroundColor Green
