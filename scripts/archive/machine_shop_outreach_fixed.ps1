# Machine Shop Outreach - Fixed Name Extraction
# Properly handles names from CSV and avoids generic email prefixes
# Searches entire CSV until target count of shops WITH emails is found

param(
    [int]$MaxShops = 5,
    [switch]$SearchAll,  # If set, search entire CSV regardless of MaxShops limit
    [string]$TemplatePath = "$PSScriptRoot\..\templates\outreach\machine_shop_outreach_template.html",
    [string]$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv",
    [string]$OutputPath = "$PSScriptRoot\..\email_data"
)

# Generic email prefixes to avoid using as names
$GenericPrefixes = @('hello', 'support', 'rfq', 'sales', 'info', 'contact', 'admin', 'help', 'service', 'inquiry', 'quote', 'quotes', 'office', 'team', 'mail', 'email')

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

# Function to check if a name looks like a generic prefix
function Test-GenericName {
    param([string]$Name)
    
    if ([string]::IsNullOrWhiteSpace($Name)) { return $true }
    
    $NameLower = $Name.ToLower().Trim()
    foreach ($Prefix in $GenericPrefixes) {
        if ($NameLower -eq $Prefix -or $NameLower.StartsWith($Prefix + '@')) {
            return $true
        }
    }
    return $false
}

# Function to extract first name from full name
function Get-FirstName {
    param([string]$FullName)
    
    if ([string]::IsNullOrWhiteSpace($FullName) -or $FullName -eq ' ') {
        return $null
    }
    
    # Handle "Last, First" format
    if ($FullName -match ',\s*') {
        $Parts = $FullName -split ',\s*'
        if ($Parts.Count -ge 2) {
            $FirstName = $Parts[1].Trim()
            # Get just the first word of the first name
            $FirstNameParts = $FirstName -split '\s+'
            return $FirstNameParts[0].Trim()
        }
    }
    
    # Handle regular "First Last" format
    $Parts = $FullName -split '\s+'
    if ($Parts.Count -ge 1) {
        return $Parts[0].Trim()
    }
    
    return $FullName.Trim()
}

# Function to extract name from email local part
function Get-NameFromEmail {
    param([string]$Email)
    
    if ([string]::IsNullOrWhiteSpace($Email) -or $Email -eq "INVALID") {
        return $null
    }
    
    # Extract local part (before @)
    if ($Email -match '^([^@]+)@') {
        $LocalPart = $Matches[1].ToLower()
        
        # Skip generic prefixes
        if ($GenericPrefixes -contains $LocalPart) {
            return $null
        }
        
        # Clean up the name: remove numbers, replace separators with spaces
        $CleanName = $LocalPart -replace '[0-9]', '' -replace '[._-]', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        
        # If it looks like a name (at least 2 characters, mostly letters)
        if ($CleanName.Length -ge 2 -and $CleanName -match '^[a-zA-Z\s]+$') {
            # Capitalize first letter of each word
            $Words = $CleanName -split '\s+' | ForEach-Object { 
                if ($_.Length -gt 0) { 
                    $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() 
                } 
            }
            return ($Words -join ' ')
        }
    }
    
    return $null
}

# Function to get the best contact name
function Get-ContactName {
    param(
        [string]$FullName,
        [string]$FirstName,
        [string]$LastName,
        [string]$Email,
        [string]$ShopName
    )
    
    # Priority 1: Try full_name field (but handle "Last, First" format)
    if (-not [string]::IsNullOrWhiteSpace($FullName) -and $FullName -ne ' ') {
        $ExtractedFirst = Get-FirstName -FullName $FullName
        if (-not (Test-GenericName -Name $ExtractedFirst)) {
            return $ExtractedFirst
        }
    }
    
    # Priority 2: Try first_name field directly
    if (-not [string]::IsNullOrWhiteSpace($FirstName) -and $FirstName -ne ' ') {
        $CleanFirst = $FirstName.Trim() -replace ',$', ''
        if (-not (Test-GenericName -Name $CleanFirst)) {
            return $CleanFirst
        }
    }
    
    # Priority 3: Try to extract from email
    $EmailName = Get-NameFromEmail -Email $Email
    if (-not [string]::IsNullOrWhiteSpace($EmailName)) {
        return $EmailName
    }
    
    # Priority 4: Use generic greeting (not company name)
    return "Hello"
}

# Function to load machine shops from CSV
function Get-MachineShops {
    param(
        [string]$Path, 
        [int]$Max,
        [switch]$SearchAll
    )
    
    try {
        $AllShops = Import-Csv -Path $Path
        $Shops = @()
        $Row = 2
        $TotalRows = $AllShops.Count
        Write-Host "Searching through $TotalRows shops in database..."
        
        foreach ($Shop in $AllShops) {
            $Status = if ($Shop.Status) { $Shop.Status } else { "" }
            $DateContacted = $Shop.'Date Contacted'
            $OutreachStatus = if ($Shop.'Outreach Status') { $Shop.'Outreach Status' } else { "" }
            
            # Skip if already contacted with a valid date
            if ($Status -eq "Contacted" -and -not [string]::IsNullOrWhiteSpace($DateContacted)) {
                Write-Host "Skipping row $Row - already contacted on $DateContacted"
                $Row++
                continue
            }
            
            # Skip if 1st email already sent
            if ($OutreachStatus -eq "1st Email Sent") {
                Write-Host "Skipping row $Row - 1st outreach email already sent"
                $Row++
                continue
            }
            
            # Include if not contacted or blank status
            if ([string]::IsNullOrWhiteSpace($Status) -or $Status -eq "Not Contacted" -or $Status -eq "Error") {
                # Skip if no valid email address (don't count toward max)
                if ([string]::IsNullOrWhiteSpace($Shop.email) -or $Shop.email -eq "INVALID" -or $Shop.email -notmatch '@') {
                    Write-Host "Skipping row $Row - no valid email address for $($Shop.name)"
                    $Row++
                    continue
                }
                
                # Build location
                $Location = if ($Shop.city -and $Shop.state) { "$($Shop.city), $($Shop.state)" } elseif ($Shop.city) { $Shop.city } elseif ($Shop.state) { $Shop.state } else { "" }
                
                # Get the best contact name
                $ContactName = Get-ContactName -FullName $Shop.full_name -FirstName $Shop.first_name -LastName $Shop.last_name -Email $Shop.email -ShopName $Shop.name
                
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
                }
                $Shops += $ShopObj
                
                # Only break after finding shops WITH email addresses
                if ($Shops.Count -ge $Max -and -not $SearchAll) { break }
            }
            
            $Row++
            
            # Safety limit - don't search forever if CSV is huge
            if ($Row -gt 10000) { 
                Write-Warning "Reached safety limit of 10,000 rows. Stopping search."
                break 
            }
        }
        
        return $Shops
    } catch {
        Write-Error "Failed to load machine shops from CSV: $_"
        return @()
    }
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

# Function to generate appropriate greeting
function Get-Greeting {
    param([string]$ContactName)
    
    # Generic greetings that indicate no specific contact name was found
    $GenericGreetings = @('Hello', 'Hi there', 'Greetings', 'Good morning', 'Good afternoon')
    
    # Check if the contact name is generic
    $IsGeneric = $false
    foreach ($Generic in $GenericGreetings) {
        if ($ContactName -eq $Generic) {
            $IsGeneric = $true
            break
        }
    }
    
    if ($IsGeneric -or [string]::IsNullOrWhiteSpace($ContactName)) {
        # Return professional but friendly generic greetings
        $GenericOptions = @(
            "Good morning,",
            "Hello,",
            "Greetings,",
            "I hope this message finds you well,",
            "I hope your week is going well,"
        )
        # Pick one based on day of week for variety
        $DayOfWeek = (Get-Date).DayOfWeek.value__
        return $GenericOptions[$DayOfWeek % $GenericOptions.Count]
    } else {
        # Use the actual name with a friendly but professional greeting
        return "Hi $ContactName,"
    }
}

# Function to personalize email template
function Get-PersonalizedEmail {
    param(
        [string]$Template,
        [hashtable]$Shop
    )
    
    $SafeContactName = Sanitize-Text -Text $Shop.ContactName
    $SafeShopName = Sanitize-Text -Text $Shop.ShopName
    $SafeCapabilities = Sanitize-Text -Text $Shop.Capabilities
    $SafeLocation = Sanitize-Text -Text $Shop.Location
    
    # Generate appropriate greeting
    $Greeting = Get-Greeting -ContactName $SafeContactName
    
    $Email = $Template
    $Email = $Email.Replace("{{GREETING}}", $Greeting)
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
        [string]$Email,
        [string]$Status,
        [string]$DateContacted,
        [string]$OutreachStatus = "",
        [string]$LastOutboundDate = ""
    )
    
    try {
        $Shops = Import-Csv -Path $Path
        $Updated = $false
        
        foreach ($Shop in $Shops) {
            # Match by both name and email to be precise
            if ($Shop.name -eq $ShopName -and $Shop.email -eq $Email) {
                $Shop.Status = $Status
                $Shop.'Date Contacted' = $DateContacted
                if ($OutreachStatus -and ($Shop.'Outreach Status' -eq "" -or $OutreachStatus -ne "")) {
                    $Shop.'Outreach Status' = $OutreachStatus
                }
                if ($LastOutboundDate) {
                    $Shop.'Last Outbound Date' = $LastOutboundDate
                }
                $Updated = $true
                break
            }
        }
        
        if ($Updated) {
            $Shops | Export-Csv -Path $Path -NoTypeInformation
            Write-Host "Updated CSV for $ShopName ($Email) with status: $Status, Outreach: $OutreachStatus"
        }
    } catch {
        Write-Warning "Failed to update CSV: $_"
    }
}

# Function to check if email was sent by looking in Sent folder
function Test-EmailSent {
    param(
        $Namespace,
        [string]$RecipientEmail,
        [string]$SubjectPattern = "Partnership Opportunity"
    )
    
    try {
        $SentFolder = $Namespace.Folders("Admin@vectarr.com").Folders("Sent Items")
        $SentItems = $SentFolder.Items
        $SentItems.Sort("[SentOn]", $true)
        
        foreach ($Item in $SentItems | Select-Object -First 50) {
            if ($Item.Subject -like "*$SubjectPattern*") {
                # Check if this email was sent to the recipient
                foreach ($Recipient in $Item.Recipients) {
                    if ($Recipient.Address -eq $RecipientEmail) {
                        return $Item.SentOn
                    }
                }
            }
        }
        return $null
    } catch {
        Write-Warning "Failed to check Sent folder: $_"
        return $null
    }
}

# Main execution
Write-Host "Starting machine shop outreach with fixed name extraction..."
Write-Host "Target shops to contact: $MaxShops"

# Check if CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Load machine shops - search entire CSV until we find enough with emails
$Shops = Get-MachineShops -Path $CsvPath -Max $MaxShops -SearchAll

if ($Shops.Count -eq 0) {
    Write-Host "No machine shops with email addresses found to contact."
    Write-Host "Consider adding more shops to the database or discovering new shops via web search."
    exit 0
}

Write-Host "Found $($Shops.Count) shops with valid email addresses to contact"

Write-Host "Found $($Shops.Count) shops to contact"

# Process each shop
$ContactedCount = 0
$Today = Get-Date -Format "yyyy-MM-dd"

foreach ($Shop in $Shops) {
    Write-Host "`nProcessing: $($Shop.ShopName)"
    Write-Host "  Contact Name: $($Shop.ContactName)"
    
    # Validate email
    if ([string]::IsNullOrWhiteSpace($Shop.Email) -or $Shop.Email -eq "INVALID" -or $Shop.Email -notmatch '@') {
        Write-Warning "Skipping $($Shop.ShopName) - no valid email address"
        continue
    }
    
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
        
        # Check if email was already sent to this recipient
        $SentDate = Test-EmailSent -Namespace $Namespace -RecipientEmail $Shop.Email
        if ($SentDate) {
            Write-Host "Email already sent to $($Shop.Email) on $SentDate"
            Update-ShopStatus -Path $CsvPath -ShopName $Shop.ShopName -Email $Shop.Email -Status "Contacted" -DateContacted $Today -OutreachStatus "1st Email Sent" -LastOutboundDate $SentDate.ToString("yyyy-MM-dd")
        } else {
            Update-ShopStatus -Path $CsvPath -ShopName $Shop.ShopName -Email $Shop.Email -Status "Contacted" -DateContacted $Today -OutreachStatus "Draft Created" -LastOutboundDate $Today
        }
        
        $Metadata = @{
            shopName = $Shop.ShopName
            contactName = $Shop.ContactName
            email = $Shop.Email
            dateContacted = $Today
            draftEntryId = $Draft.EntryID
            status = "Draft Created"
        }
        $SafeShopName = ($Shop.ShopName -replace '[^a-zA-Z0-9]', '_') + "_" + ($Shop.Email -replace '[^a-zA-Z0-9]', '_')
        $MetadataPath = "$OutputPath\outreach\${SafeShopName}_$Today.json"
        $Metadata | ConvertTo-Json | Out-File $MetadataPath
        
        $ContactedCount++
    } catch {
        Write-Error "Failed to save draft for $($Shop.ShopName): $_"
        Update-ShopStatus -Path $CsvPath -ShopName $Shop.ShopName -Email $Shop.Email -Status "Error" -DateContacted $Today -OutreachStatus "Need Manual Intervention"
    }
}

Write-Host "`nOutreach complete. Created $ContactedCount draft emails in Admin@vectarr.com Drafts folder."

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
