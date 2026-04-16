# Machine Shop Outreach - CSV Version
# Uses CSV instead of Excel to avoid COM issues

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

# Get admin@vectarr.com account and Drafts folder
try {
    $AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "admin@vectarr.com" }
    $AdminFolder = $Namespace.Folders("admin@vectarr.com")
    $DraftsFolder = $AdminFolder.Folders("Drafts")
    Write-Host "Connected to admin@vectarr.com Drafts folder"
} catch {
    Write-Error "Failed to access admin@vectarr.com account or Drafts folder: $_"
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

# Jordan Mitchell signature (Accounts Department)
$SignatureHtml = @"
<table cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.4; background: transparent;">
    <tr>
        <td style="padding-right: 15px; vertical-align: top;">
            <img src="https://i.imgur.com/DurPqy1.png" alt="Vectarr" width="70" style="display: block;" />
        </td>
        <td style="border-left: 2px solid #888888; padding-left: 15px; vertical-align: top;">
            <div style="font-size: 18px; font-weight: bold; color: #000000;">Jordan Mitchell</div>
            <div style="font-size: 13px; color: #888888; margin-bottom: 8px;">Accounts Department</div>
            <div style="border-top: 1px solid #888888; margin: 8px 0;"></div>
            <div style="font-size: 13px; color: #000000;">+1 (650) 427-9450</div>
            <div style="font-size: 13px; color: #000000;">5900 Balcones Drive, Suite 100</div>
            <div style="font-size: 13px; color: #000000;">Austin, TX 78731</div>
            <div style="font-size: 13px; margin-top: 5px;">
                <a href="https://vectarr.com" style="color: #0066cc; text-decoration: none;">vectarr.com</a>
            </div>
        </td>
    </tr>
</table>
"@

# Function to load machine shops from CSV
function Get-MachineShops {
    param([string]$Path, [int]$Max)
    
    try {
        $AllShops = Import-Csv -Path $Path
        $Shops = @()
        $Row = 2  # Start at row 2 (after header)
        
        foreach ($Shop in $AllShops) {
            # Check if already contacted
            $Status = if ($Shop.Status) { $Shop.Status } else { "" }
            $DateContacted = $Shop.'Date Contacted'
            
            # Skip if already contacted (has Status=Contacted AND has a date)
            if ($Status -eq "Contacted" -and -not [string]::IsNullOrWhiteSpace($DateContacted)) {
                Write-Host "Skipping row $Row - already contacted on $DateContacted"
                $Row++
                continue
            }
            
            # Include only if not contacted or blank status
            if ([string]::IsNullOrWhiteSpace($Status) -or $Status -eq "Not Contacted") {
                # Build location from city and state
                $Location = if ($Shop.city -and $Shop.state) { "$($Shop.city), $($Shop.state)" } elseif ($Shop.city) { $Shop.city } elseif ($Shop.state) { $Shop.state } else { "" }
                
                # Build contact name
                $ContactName = if ($Shop.full_name -and $Shop.full_name -ne ' ') { 
                    $Shop.full_name 
                } elseif ($Shop.first_name -or $Shop.last_name) { 
                    "$($Shop.first_name) $($Shop.last_name)".Trim() 
                } else { 
                    "" 
                }
                
                # Clean up capabilities - replace generic "Machine shop" with empty or more specific text
                $Capabilities = $Shop.subtypes
                if ($Capabilities -eq "Machine shop" -or $Capabilities -eq "Machine Shop") {
                    $Capabilities = "precision machining"  # More generic/professional term
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
                }
                $Shops += $ShopObj
            }
            
            $Row++
            if ($Shops.Count -ge $Max) { break }
        }
        
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
            return $Parts[1].Trim()  # Return First name
        }
    }
    
    # Handle regular "First Last" format
    $Parts = $FullName -split '\s+'
    if ($Parts.Count -ge 1) {
        return $Parts[0].Trim()  # Return First name only
    }
    
    return $FullName.Trim()
}

# Function to extract name from email
function Get-NameFromEmail {
    param([string]$Email)
    
    if ([string]::IsNullOrWhiteSpace($Email) -or $Email -eq "INVALID") {
        return $null
    }
    
    # Extract local part (before @)
    if ($Email -match '^([^@]+)@') {
        $LocalPart = $Matches[1]
        
        # Remove numbers
        $CleanName = $LocalPart -replace '[0-9]', '' -replace '[._-]', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        
        # Capitalize first letter only
        if ($CleanName.Length -gt 0) {
            return $CleanName.Substring(0,1).ToUpper() + $CleanName.Substring(1).ToLower()
        }
    }
    
    return $null
}

# Function to sanitize text - remove problematic characters
function Sanitize-Text {
    param([string]$Text)
    
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }
    
    # Replace smart quotes and other special chars with standard ASCII
    # Using char codes to avoid parsing issues
    $Text = $Text -replace [char]0x201C, '"'  # Left double quote
    $Text = $Text -replace [char]0x201D, '"'  # Right double quote
    $Text = $Text -replace [char]0x2018, "'"  # Left single quote
    $Text = $Text -replace [char]0x2019, "'"  # Right single quote
    $Text = $Text -replace [char]0x2013, '-'  # En dash
    $Text = $Text -replace [char]0x2014, '-'  # Em dash
    $Text = $Text -replace [char]0x2026, '...' # Ellipsis
    
    return $Text.Trim()
}

# Function to personalize email template
function Get-PersonalizedEmail {
    param(
        [string]$Template,
        [hashtable]$Shop
    )
    
    # Get contact name - try multiple sources, but ONLY use first name
    $ContactName = $null
    
    # Try full_name from CSV (might be "Last, First" format)
    if (-not [string]::IsNullOrWhiteSpace($Shop.ContactName) -and $Shop.ContactName -ne ' ') {
        $ContactName = Get-FirstName -FullName $Shop.ContactName
    }
    
    # Try to get name from email
    if ([string]::IsNullOrWhiteSpace($ContactName)) {
        $ContactName = Get-NameFromEmail -Email $Shop.Email
    }
    
    # Fall back to shop name
    if ([string]::IsNullOrWhiteSpace($ContactName)) {
        $ContactName = $Shop.ShopName
    }
    
    # Last resort
    if ([string]::IsNullOrWhiteSpace($ContactName)) {
        $ContactName = "there"
    }
    
    # Sanitize all fields
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
Write-Host "Starting machine shop outreach..."
Write-Host "Maximum shops to contact today: $MaxShops"

# Check if CSV exists, if not create from Excel manually
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    Write-Host "Please convert the Excel file to CSV format first."
    exit 1
}

# Load machine shops
$Shops = Get-MachineShops -Path $CsvPath

if ($Shops.Count -eq 0) {
    Write-Host "No machine shops found to contact."
    exit 0
}

Write-Host "Found $($Shops.Count) shops to contact"

# Process each shop
$ContactedCount = 0
$Today = Get-Date -Format "yyyy-MM-dd"

foreach ($Shop in $Shops) {
    Write-Host "Processing: $($Shop.ShopName)"
    
    # Validate email
    if ([string]::IsNullOrWhiteSpace($Shop.Email) -or $Shop.Email -eq "INVALID" -or $Shop.Email -notmatch '@') {
        Write-Warning "Skipping $($Shop.ShopName) - no valid email address"
        continue
    }
    
    # Get contact name for logging
    $DisplayName = if ($Shop.ContactName -and $Shop.ContactName -ne ' ') { 
        $Shop.ContactName 
    } else { 
        Get-NameFromEmail -Email $Shop.Email 
    }
    Write-Host "  Contact: $DisplayName"
    Write-Host "  Email: $($Shop.Email)"
    
    # Create email draft
    $Draft = $Outlook.CreateItem(0)
    
    # Set recipient
    $Draft.Recipients.Add($Shop.Email) | Out-Null
    $Draft.Recipients.ResolveAll() | Out-Null
    
    # Set subject
    $Draft.Subject = "Partnership Opportunity - Vectarr Manufacturing Platform"
    
    # Set sending account
    $Draft.SendUsingAccount = $AdminAccount
    
    # Personalize template (NO manual signature - Outlook will add it)
    $EmailBody = Get-PersonalizedEmail -Template $TemplateHtml -Shop $Shop
    
    # Remove signature placeholders but DON'T insert signature HTML
    # Let Outlook add the signature automatically
    $EmailBody = $EmailBody.Replace("<!-- SIGNATURE START -->", "")
    $EmailBody = $EmailBody.Replace("<!-- SIGNATURE END -->", "")
    
    $Draft.HTMLBody = $EmailBody
    
    # Save draft and move to Admin@vectarr.com Drafts folder
    try {
        $Draft.Save()
        Write-Host "Draft created for: $($Shop.ShopName)"
        
        # Move to Admin@vectarr.com Drafts folder
        $Draft.Move($DraftsFolder) | Out-Null
        Write-Host "Draft moved to Admin@vectarr.com Drafts folder"
        
        # Update CSV
        Update-ShopStatus -Path $CsvPath -Row $Shop.Row -Status "Contacted" -DateContacted $Today
        
        # Save metadata
        $Metadata = @{
            shopName = $Shop.ShopName
            contactName = $DisplayName
            email = $Shop.Email
            dateContacted = $Today
            draftEntryId = $Draft.EntryID
            status = "Draft Created"
        }
        $MetadataPath = "$OutputPath\outreach\$($Shop.ShopName -replace '[^a-zA-Z0-9]', '_')_$Today.json"
        $Metadata | ConvertTo-Json | Out-File $MetadataPath
        
        $ContactedCount++
    } catch {
        Write-Error "Failed to save draft for $($Shop.ShopName): $_"
    }
    
    Write-Host ""
}

Write-Host "Outreach complete. Created $ContactedCount draft emails in admin@vectarr.com Drafts folder."

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
