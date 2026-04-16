# Machine Shop Outreach - Auto Web Discovery
# Automatically searches web for new shops when database is exhausted
# Integrates web search discovery into the outreach workflow

param(
    [int]$MaxShops = 5,
    [switch]$SearchAll,
    [string]$TemplatePath = "$PSScriptRoot\..\templates\outreach\machine_shop_outreach_template.html",
    [string]$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv",
    [string]$OutputPath = "$PSScriptRoot\..\email_data",
    [string]$DataPath = "$PSScriptRoot\..\data",
    [switch]$SkipWebSearch  # Allow skipping web search if needed
)

# Generic email prefixes to avoid using as names
$GenericPrefixes = @('hello', 'support', 'rfq', 'sales', 'info', 'contact', 'admin', 'help', 'service', 'inquiry', 'quote', 'quotes', 'office', 'team', 'mail', 'email')

# Ensure directories exist
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\outreach"
$null = New-Item -ItemType Directory -Force -Path $DataPath

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
    
    if ($Email -match '^([^@]+)@') {
        $LocalPart = $Matches[1].ToLower()
        
        if ($GenericPrefixes -contains $LocalPart) {
            return $null
        }
        
        $CleanName = $LocalPart -replace '[0-9]', '' -replace '[._-]', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        
        if ($CleanName.Length -ge 2 -and $CleanName -match '^[a-zA-Z\s]+$') {
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
    
    if (-not [string]::IsNullOrWhiteSpace($FullName) -and $FullName -ne ' ') {
        $ExtractedFirst = Get-FirstName -FullName $FullName
        if (-not (Test-GenericName -Name $ExtractedFirst)) {
            return $ExtractedFirst
        }
    }
    
    if (-not [string]::IsNullOrWhiteSpace($FirstName) -and $FirstName -ne ' ') {
        $CleanFirst = $FirstName.Trim() -replace ',$', ''
        if (-not (Test-GenericName -Name $CleanFirst)) {
            return $CleanFirst
        }
    }
    
    $EmailName = Get-NameFromEmail -Email $Email
    if (-not [string]::IsNullOrWhiteSpace($EmailName)) {
        return $EmailName
    }
    
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
            
            if ($Status -eq "Contacted" -and -not [string]::IsNullOrWhiteSpace($DateContacted)) {
                Write-Host "Skipping row $Row - already contacted on $DateContacted"
                $Row++
                continue
            }
            
            if ($OutreachStatus -eq "1st Email Sent") {
                Write-Host "Skipping row $Row - 1st outreach email already sent"
                $Row++
                continue
            }
            
            if ([string]::IsNullOrWhiteSpace($Status) -or $Status -eq "Not Contacted" -or $Status -eq "Error") {
                if ([string]::IsNullOrWhiteSpace($Shop.email) -or $Shop.email -eq "INVALID" -or $Shop.email -notmatch '@') {
                    Write-Host "Skipping row $Row - no valid email address for $($Shop.name)"
                    $Row++
                    continue
                }
                
                $Location = if ($Shop.city -and $Shop.state) { "$($Shop.city), $($Shop.state)" } elseif ($Shop.city) { $Shop.city } elseif ($Shop.state) { $Shop.state } else { "" }
                
                $ContactName = Get-ContactName -FullName $Shop.full_name -FirstName $Shop.first_name -LastName $Shop.last_name -Email $Shop.email -ShopName $Shop.name
                
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
                
                if ($Shops.Count -ge $Max -and -not $SearchAll) { break }
            }
            
            $Row++
            
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

# Function to discover new shops via web search using sub-agent
function Invoke-WebShopDiscovery {
    param(
        [int]$TargetCount = 5,
        [string]$OutputDir = "$PSScriptRoot\..\data"
    )
    
    Write-Host "`n=== Starting Web Search Discovery ==="
    Write-Host "Target: Find $TargetCount new machine shops with valid emails"
    
    $DateStr = Get-Date -Format "yyyyMMdd"
    $OutputFile = "$OutputDir\new_shops_${DateStr}.json"
    
    # Regions to search
    $Regions = @(
        "Texas CNC machine shops",
        "California CNC machine shops", 
        "Arizona CNC machine shops",
        "Colorado CNC machine shops",
        "Oklahoma CNC machine shops",
        "New Mexico CNC machine shops",
        "Illinois CNC machine shops",
        "Ohio CNC machine shops",
        "Michigan CNC machine shops",
        "Pennsylvania CNC machine shops",
        "Florida CNC machine shops",
        "Georgia CNC machine shops",
        "North Carolina CNC machine shops",
        "Washington CNC machine shops",
        "Oregon CNC machine shops"
    )
    
    $DiscoveredShops = @()
    $AttemptedRegions = @()
    
    foreach ($Region in $Regions) {
        if ($DiscoveredShops.Count -ge $TargetCount) { break }
        
        Write-Host "Searching: $Region"
        $AttemptedRegions += $Region
        
        try {
            # Use OpenClaw CLI to spawn sub-agent for web search
            $SearchQuery = "Find CNC machine shops in $Region with contact email addresses. Extract: company name, email address, phone number, website, city, state, and capabilities. Focus on shops that do precision machining, prototyping, or production work. Return results as structured data."
            
            # Create a temporary task file for the sub-agent
            $TaskFile = "$OutputDir\search_task_${Region.Replace(' ', '_')}.txt"
            $SearchQuery | Out-File -FilePath $TaskFile -Encoding UTF8
            
            Write-Host "  -> Spawned search task for $Region"
            
            # Note: Actual sub-agent execution would be handled by OpenClaw cron
            # This marks the region as queued for discovery
            
        } catch {
            Write-Warning "Failed to queue search for $Region`: $_"
        }
        
        # Small delay between regions
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "`nQueued web search for $($AttemptedRegions.Count) regions"
    Write-Host "Discovery results will be saved to: $OutputFile"
    
    return @{
        QueuedRegions = $AttemptedRegions
        OutputFile = $OutputFile
        Status = "Queued"
    }
}

# Function to add discovered shops to CSV
function Add-ShopsToCsv {
    param(
        [string]$CsvPath,
        [array]$NewShops
    )
    
    try {
        $ExistingShops = Import-Csv -Path $CsvPath
        $ExistingEmails = $ExistingShops | ForEach-Object { $_.email.ToLower() } | Where-Object { $_ }
        
        $AddedCount = 0
        
        foreach ($Shop in $NewShops) {
            if ($ExistingEmails -contains $Shop.Email.ToLower()) {
                Write-Host "Skipping duplicate: $($Shop.ShopName) ($($Shop.Email))"
                continue
            }
            
            $NewRow = [PSCustomObject]@{
                name = $Shop.ShopName
                full_name = $Shop.ContactName
                first_name = ""
                last_name = ""
                email = $Shop.Email
                phone = $Shop.Phone
                site = $Shop.Website
                city = $Shop.City
                state = $Shop.State
                subtypes = $Shop.Capabilities
                Status = "Not Contacted"
                "Date Contacted" = ""
                "Outreach Status" = ""
                "Last Outbound Date" = ""
                Notes = "Discovered via web search on $(Get-Date -Format 'yyyy-MM-dd')"
            }
            
            $ExistingShops += $NewRow
            $AddedCount++
            Write-Host "Added: $($Shop.ShopName) ($($Shop.Email))"
        }
        
        $ExistingShops | Export-Csv -Path $CsvPath -NoTypeInformation
        Write-Host "`nAdded $AddedCount new shops to database"
        return $AddedCount
        
    } catch {
        Write-Error "Failed to add shops to CSV: $_"
        return 0
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
    
    $GenericGreetings = @('Hello', 'Hi there', 'Greetings', 'Good morning', 'Good afternoon')
    
    $IsGeneric = $false
    foreach ($Generic in $GenericGreetings) {
        if ($ContactName -eq $Generic) {
            $IsGeneric = $true
            break
        }
    }
    
    if ($IsGeneric -or [string]::IsNullOrWhiteSpace($ContactName)) {
        $GenericOptions = @(
            "Good morning,",
            "Hello,",
            "Greetings,",
            "I hope this message finds you well,",
            "I hope your week is going well,"
        )
        $DayOfWeek = (Get-Date).DayOfWeek.value__
        return $GenericOptions[$DayOfWeek % $GenericOptions.Count]
    } else {
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
Write-Host "Starting machine shop outreach with auto web discovery..."
Write-Host "Target shops to contact: $MaxShops"

# Check if CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Load machine shops from existing database
$Shops = Get-MachineShops -Path $CsvPath -Max $MaxShops -SearchAll

# If no shops found and web search not skipped, trigger discovery
if ($Shops.Count -eq 0 -and -not $SkipWebSearch) {
    Write-Host "`nNo uncontacted machine shops with email addresses found in database."
    Write-Host "Database exhausted - triggering automatic web search discovery..."
    
    $DiscoveryResult = Invoke-WebShopDiscovery -TargetCount $MaxShops -OutputDir $DataPath
    
    Write-Host "`n=== Web Discovery Queued ==="
    Write-Host "Regions to search: $($DiscoveryResult.QueuedRegions.Count)"
    foreach ($Region in $DiscoveryResult.QueuedRegions) {
        Write-Host "  - $Region"
    }
    Write-Host "`nNext steps:"
    Write-Host "1. Sub-agent will perform web searches for each region"
    Write-Host "2. New shops will be added to: $CsvPath"
    Write-Host "3. Re-run this script to create email drafts for new shops"
    Write-Host "`nExpected new shops file: $($DiscoveryResult.OutputFile)"
    
    # Create a flag file to indicate discovery is in progress
    $FlagFile = "$DataPath\discovery_in_progress.flag"
    @{
        StartedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TargetCount = $MaxShops
        Regions = $DiscoveryResult.QueuedRegions
        Status = "In Progress"
    } | ConvertTo-Json | Out-File -FilePath $FlagFile
    
    Write-Host "`nDiscovery flag created: $FlagFile"
    
} elseif ($Shops.Count -eq 0 -and $SkipWebSearch) {
    Write-Host "No machine shops found and web search skipped."
    Write-Host "Run without -SkipWebSearch to enable automatic discovery."
    
} else {
    Write-Host "Found $($Shops.Count) shops to contact from existing database"
    
    # Process each shop
    $ContactedCount = 0
    $Today = Get-Date -Format "yyyy-MM-dd"
    
    foreach ($Shop in $Shops) {
        Write-Host "`nProcessing: $($Shop.ShopName)"
        Write-Host "  Contact Name: $($Shop.ContactName)"
        
        if ([string]::IsNullOrWhiteSpace($Shop.Email) -or $Shop.Email -eq "INVALID" -or $Shop.Email -notmatch '@') {
            Write-Warning "Skipping $($Shop.ShopName) - no valid email address"
            continue
        }
        
        Write-Host "  Email: $($Shop.Email)"
        
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
}

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
