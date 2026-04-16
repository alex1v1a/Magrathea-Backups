# Machine Shop Outreach - Regenerate Drafts for Recent Contacts + New Prospects
# Regenerates drafts for shops contacted on 3/24 and 3/25, plus creates new drafts for prospects

param(
    [int]$MaxShops = 5,
    [string]$TemplatePath = "$PSScriptRoot\..\templates\outreach\machine_shop_outreach_template.html",
    [string]$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv",
    [string]$OutputPath = "$PSScriptRoot\..\email_data"
)

# Ensure output directory exists
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\outreach"

# Initialize Outlook
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get Admin@vectarr.com account and Drafts folder
try {
    $AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "Admin@vectarr.com" }
    if (-not $AdminAccount) {
        $AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "admin@vectarr.com" }
    }
    $AdminFolder = $Namespace.Folders("Admin@vectarr.com")
    $DraftsFolder = $AdminFolder.Folders("Drafts")
    Write-Host "Connected to Admin@vectarr.com Drafts folder"
} catch {
    Write-Error "Failed to access Admin@vectarr.com account or Drafts folder: $_"
    exit 1
}

# Load outreach template
try {
    $TemplateHtml = Get-Content $TemplatePath -Raw
    Write-Host "Loaded outreach template from $TemplatePath"
} catch {
    Write-Error "Failed to load template: $_"
    exit 1
}

# Function to load machine shops from CSV - includes recently contacted for regeneration
function Get-MachineShops {
    param([string]$Path, [int]$Max)
    
    try {
        $AllShops = Import-Csv -Path $Path
        $Shops = @()
        $Row = 2
        $RegenerateCount = 0
        $NewCount = 0
        
        foreach ($Shop in $AllShops) {
            $Status = if ($Shop.Status) { $Shop.Status } else { "" }
            $DateContacted = $Shop.'Date Contacted'
            
            # Check if this shop was contacted on 3/24 or 3/25 (needs regeneration)
            $NeedsRegeneration = $false
            if ($Status -eq "Contacted" -and $DateContacted) {
                if ($DateContacted -match '2026-03-24|3/24/2026|2026-03-25|3/25/2026') {
                    $NeedsRegeneration = $true
                    Write-Host "Row $Row - Will REGENERATE draft for: $($Shop.name) (contacted on $DateContacted)"
                    $RegenerateCount++
                }
            }
            
            # Include if needs regeneration OR is a new prospect
            if ($NeedsRegeneration -or [string]::IsNullOrWhiteSpace($Status) -or $Status -eq "Not Contacted") {
                # Build location
                $Location = if ($Shop.city -and $Shop.state) { "$($Shop.city), $($Shop.state)" } elseif ($Shop.city) { $Shop.city } elseif ($Shop.state) { $Shop.state } else { "" }
                
                # Build contact name
                $ContactName = if ($Shop.full_name -and $Shop.full_name -ne ' ') { 
                    $Shop.full_name 
                } elseif ($Shop.first_name -or $Shop.last_name) { 
                    "$($Shop.first_name) $($Shop.last_name)".Trim() 
                } else { 
                    "" 
                }
                
                # Clean up capabilities
                $Capabilities = $Shop.subtypes
                if ($Capabilities -eq "Machine shop" -or $Capabilities -eq "Machine Shop") {
                    $Capabilities = "precision machining"
                }
                
                $ShopObj = @{
                    Row = $Row
                    ShopName = $Shop.name
                    Location = $Location
                    ContactName = $ContactName
                    Email = $Shop.email
                    Phone = $Shop.phone
                    Capabilities = $Capabilities
                    Website = $Shop.site
                    Notes = ""
                    IsRegeneration = $NeedsRegeneration
                }
                $Shops += $ShopObj
                
                if (-not $NeedsRegeneration) {
                    $NewCount++
                }
            }
            
            $Row++
            if ($Shops.Count -ge $Max) { break }
        }
        
        Write-Host "Found $($Shops.Count) shops total ($RegenerateCount to regenerate, $NewCount new prospects)"
        return $Shops
    } catch {
        Write-Error "Failed to load machine shops from CSV: $_"
        return @()
    }
}

# Function to extract first name only
function Get-FirstName {
    param([string]$FullName)
    
    if ([string]::IsNullOrWhiteSpace($FullName) -or $FullName -eq ' ') {
        return $null
    }
    
    # Handle "Last, First" format
    if ($FullName -match ',\s*') {
        $Parts = $FullName -split ',\s*'
        if ($Parts.Count -ge 2) {
            return $Parts[1].Trim()
        }
    }
    
    # Handle regular "First Last" format
    $Parts = $FullName -split '\s+'
    if ($Parts.Count -ge 1) {
        return $Parts[0].Trim()
    }
    
    return $FullName.Trim()
}

# Function to extract name from email
function Get-NameFromEmail {
    param([string]$Email)
    
    if ([string]::IsNullOrWhiteSpace($Email) -or $Email -eq "INVALID") {
        return $null
    }
    
    if ($Email -match '^([^@]+)@') {
        $LocalPart = $Matches[1]
        $CleanName = $LocalPart -replace '[0-9]', '' -replace '[._-]', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        if ($CleanName.Length -gt 0) {
            return $CleanName.Substring(0,1).ToUpper() + $CleanName.Substring(1).ToLower()
        }
    }
    
    return $null
}

# Function to sanitize text
function Sanitize-Text {
    param([string]$Text)
    
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }
    
    $Text = $Text -replace [char]0x201C, '"'
    $Text = $Text -replace [char]0x201D, '"'
    $Text = $Text -replace [char]0x2018, "'"
    $Text = $Text -replace [char]0x2019, "'"
    $Text = $Text -replace [char]0x2013, '-'
    $Text = $Text -replace [char]0x2014, '-'
    $Text = $Text -replace [char]0x2026, '...'
    
    return $Text.Trim()
}

# Function to personalize email template
function Get-PersonalizedEmail {
    param(
        [string]$Template,
        [hashtable]$Shop
    )
    
    $ContactName = $null
    
    if (-not [string]::IsNullOrWhiteSpace($Shop.ContactName) -and $Shop.ContactName -ne ' ') {
        $ContactName = Get-FirstName -FullName $Shop.ContactName
    }
    
    if ([string]::IsNullOrWhiteSpace($ContactName)) {
        $ContactName = Get-NameFromEmail -Email $Shop.Email
    }
    
    if ([string]::IsNullOrWhiteSpace($ContactName)) {
        $ContactName = $Shop.ShopName
    }
    
    if ([string]::IsNullOrWhiteSpace($ContactName)) {
        $ContactName = "there"
    }
    
    $SafeContactName = Sanitize-Text -Text $ContactName
    $SafeShopName = Sanitize-Text -Text $Shop.ShopName
    $SafeCapabilities = Sanitize-Text -Text $Shop.Capabilities
    $SafeLocation = Sanitize-Text -Text $Shop.Location
    
    $Email = $Template
    $Email = $Email.Replace("{{CONTACT_NAME}}", $SafeContactName)
    $Email = $Email.Replace("{{SHOP_NAME}}", $SafeShopName)
    $Email = $Email.Replace("{{CAPABILITY_OR_SPECIALTY}}", $SafeCapabilities)
    $Email = $Email.Replace("{{LOCATION_OR_REGION}}", $SafeLocation)
    $Email = $Email.Replace("{{SPECIFIC_CAPABILITY}}", $SafeCapabilities)
    
    return $Email
}

# Function to update CSV with contact status
function Update-ShopStatus {
    param(
        [string]$Path,
        [string]$ShopName,
        [string]$Status,
        [string]$DateContacted
    )
    
    try {
        $Shops = Import-Csv -Path $Path
        $Updated = $false
        
        foreach ($Shop in $Shops) {
            if ($Shop.name -eq $ShopName) {
                $Shop.Status = $Status
                $Shop.'Date Contacted' = $DateContacted
                $Updated = $true
                break
            }
        }
        
        if ($Updated) {
            $Shops | Export-Csv -Path $Path -NoTypeInformation
            Write-Host "Updated CSV for $ShopName with status: $Status"
        }
    } catch {
        Write-Warning "Failed to update CSV: $_"
    }
}

# Main execution
Write-Host "Starting machine shop outreach (with regeneration for 3/24-3/25 contacts)..."
Write-Host "Maximum shops to process: $MaxShops"

# Check if CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Load machine shops
$Shops = Get-MachineShops -Path $CsvPath -Max $MaxShops

if ($Shops.Count -eq 0) {
    Write-Host "No machine shops found to process."
    exit 0
}

Write-Host "Processing $($Shops.Count) shops..."

# Process each shop
$ContactedCount = 0
$RegeneratedCount = 0
$Today = Get-Date -Format "yyyy-MM-dd"

foreach ($Shop in $Shops) {
    $Action = if ($Shop.IsRegeneration) { "REGENERATING" } else { "CREATING" }
    Write-Host "`n$Action draft for: $($Shop.ShopName)"
    
    # Validate email
    if ([string]::IsNullOrWhiteSpace($Shop.Email) -or $Shop.Email -eq "INVALID" -or $Shop.Email -notmatch '@') {
        Write-Warning "Skipping $($Shop.ShopName) - no valid email address"
        continue
    }
    
    $DisplayName = if ($Shop.ContactName -and $Shop.ContactName -ne ' ') { 
        $Shop.ContactName 
    } else { 
        Get-NameFromEmail -Email $Shop.Email 
    }
    Write-Host "  Contact: $DisplayName"
    Write-Host "  Email: $($Shop.Email)"
    
    # Create email draft
    $Draft = $Outlook.CreateItem(0)
    
    $Draft.Recipients.Add($Shop.Email) | Out-Null
    $Draft.Recipients.ResolveAll() | Out-Null
    
    $Draft.Subject = "Partnership Opportunity - Vectarr Manufacturing Platform"
    
    $Draft.SendUsingAccount = $AdminAccount
    
    $EmailBody = Get-PersonalizedEmail -Template $TemplateHtml -Shop $Shop
    
    $EmailBody = $EmailBody.Replace("<!-- SIGNATURE START -->", "")
    $EmailBody = $EmailBody.Replace("<!-- SIGNATURE END -->", "")
    
    $Draft.HTMLBody = $EmailBody
    
    try {
        $Draft.Save()
        Write-Host "Draft created for: $($Shop.ShopName)"
        
        $Draft.Move($DraftsFolder) | Out-Null
        Write-Host "Draft moved to Admin@vectarr.com Drafts folder"
        
        Update-ShopStatus -Path $CsvPath -ShopName $Shop.ShopName -Status "Contacted" -DateContacted $Today
        
        $Metadata = @{
            shopName = $Shop.ShopName
            contactName = $DisplayName
            email = $Shop.Email
            dateContacted = $Today
            draftEntryId = $Draft.EntryID
            status = "Draft Created"
            isRegeneration = $Shop.IsRegeneration
        }
        $SafeShopName = $Shop.ShopName -replace '[^a-zA-Z0-9]', '_'
        $MetadataPath = "$OutputPath\outreach\${SafeShopName}_$Today.json"
        $Metadata | ConvertTo-Json | Out-File $MetadataPath
        
        $ContactedCount++
        if ($Shop.IsRegeneration) {
            $RegeneratedCount++
        }
    } catch {
        Write-Error "Failed to save draft for $($Shop.ShopName): $_"
    }
}

Write-Host "`nOutreach complete."
Write-Host "Total drafts created: $ContactedCount"
Write-Host "Regenerated (3/24-3/25): $RegeneratedCount"
Write-Host "New prospects: $($ContactedCount - $RegeneratedCount)"

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
